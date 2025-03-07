import atexit
from flask import Flask, render_template, jsonify, request
import os
import pandas as pd
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans

from kneed import KneeLocator
app = Flask(__name__)

UPLOAD_FOLDER = "data"
CSV_FILE = os.path.join(UPLOAD_FOLDER, "data.csv")

df = pd.read_csv(CSV_FILE)

#NEW
df= df[df["State"]=="New York"]

selected_columns = ['TotalPop', 'Hispanic', 'White', 'Black',
                    'Asian', 'Income', 'Poverty', 'Unemployment', 'Professional', 'Service', 'Drive']

df_selected = df[selected_columns].dropna()

percentage_columns = ['Hispanic', 'White', 'Black', 'Asian', 'Poverty', 'Unemployment', 'Professional', 'Service', 'Drive']

df_to_scale=df_selected.dropna()

# Standardize the data
scaler = StandardScaler()
df_scaled = scaler.fit_transform(df_to_scale)

# Apply PCA (compute as many components as available)
num_components = min(df_scaled.shape)  # Maximum possible components
pca = PCA(n_components=num_components)
principal_components = pca.fit_transform(df_scaled)

eigenvalues = pca.explained_variance_ratio_

feature_names = df_to_scale.columns.tolist()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/screeplot_data')
def get_data():
    return jsonify(eigenvalues.tolist())  # Convert NumPy array to list for JSON serialization

@app.route('/biplot_data')
def get_biplot_data():
    # Get the first two principal components
    pc1 = principal_components[:, 0].tolist()  # First principal component
    pc2 = principal_components[:, 1].tolist()  # Second principal component

    # Get the feature loadings for the first two components
    loadings = pca.components_[:2].T.tolist()  # Transpose to match features

    # Prepare the data to send
    biplot_data = {
        "pc1": pc1,
        "pc2": pc2,
        "loadings": loadings,
        "feature_names": selected_columns  # Original feature names
    }

    return jsonify(biplot_data)

@app.route('/top_features')
def get_top_features():
    top_features_dic={}
    # Get PCA loadings (components)
    for i in range(1,12):
        loadings = pca.components_[:i]
        # print("loadings",loadings)
        # Calculate squared sum of loadings for each feature
        squared_sums = np.sum(loadings[:i]**2, axis=0)

        # Sort by squared sums in descending order
        feature_names = df_to_scale.columns.tolist()
        feature_squared_sums = list(zip(feature_names, squared_sums))

        feature_squared_sums.sort(key=lambda x: x[1], reverse=True)

        # Select top 4 features
        top_features = feature_squared_sums[:4]

        # Prepare data to send
        top_features_data = [{"feature": feature, "squared_sum": round(squared_sum, 4)} for feature, squared_sum in top_features]

        top_features_dic[i]=top_features_data

    return jsonify(top_features_dic)

@app.route('/scatterplot_matrix_data')
def get_scatterplot_matrix_data():

    top_features_dict = {}
    # Get PCA loadings (components)
    for i in range(1,12):
        loadings = pca.components_[:i]

        # Calculate squared sum of PCA loadings for each feature
        squared_sums = np.sum(loadings[:i]**2, axis=0)

        # Pair feature names with their squared sums
        feature_names = df_to_scale.columns.tolist()
        feature_squared_sums = list(zip(feature_names, squared_sums))

        # Sort by squared sums in descending order
        feature_squared_sums.sort(key=lambda x: x[1], reverse=True)

        # Select top 4 features
        top_features = [feature for feature, _ in feature_squared_sums[:4]]

        # Filter dataset to include only these 4 features
        top_4_indices = [df_to_scale.columns.get_loc(feature) for feature in top_features] #location in not scaled df

        #coressponding columns in df_Scaled
        scaled_top_4_values = df_scaled[:, top_4_indices]

        # Step 3: Create a new DataFrame df_attr with the scaled values and the feature names
        df_attr = pd.DataFrame(scaled_top_4_values, columns=top_features)

        # Now df_attr will contain the scaled values for the top 4 features.

        filtered_data = df_attr.to_dict(orient="records")

        top_features_dict[i] = {
            "top_features": top_features,
            "scatter_data": filtered_data
        } 

        # Return JSON response
    return jsonify(top_features_dict)

@app.route('/kmeans')
def kmeans_pca():
# Get PCA1 and PCA2
    pca1 = principal_components[:, 0]  # First principal component
    pca2 = principal_components[:, 1]  # Second principal component

    # Determine the range of k values to test (e.g., from 1 to 10 clusters)
    k_range = range(1, 11)  # You can adjust this range based on your needs
    inertia_values = []

    # Perform KMeans clustering for each k and calculate inertia (MSE)
    for k in k_range:
        kmeans = KMeans(n_clusters=k)
        kmeans.fit(np.column_stack((pca1, pca2)))
        inertia_values.append(kmeans.inertia_)  # Inertia is the sum of squared distances

    # Use Kneedle algorithm to find the elbow point
    kneedle = KneeLocator(k_range, inertia_values, curve='convex', direction='decreasing')
    best_k = kneedle.elbow  # This will return the k value where the elbow occurs

    # Prepare data for the frontend: Only MSE and k values for the bar graph
    mse_k_pairs = [{'k': k, 'MSE': mse} for k, mse in zip(k_range, inertia_values)]

    # Print the optimal k
    print(f"Optimal k (using Kneedle): {best_k}")
    print("PC1 Range:", pca1.min(), "to", pca1.max())
    print("PC2 Range:", pca2.min(), "to", pca2.max())

    # Return only the MSE and k values for rendering in the frontend
    return jsonify({
        'mse_k_pairs': mse_k_pairs,
        'best_k': int(best_k)  # Send MSE and k pairs to frontend
    })



if __name__ == '__main__':
    app.run(debug=True)