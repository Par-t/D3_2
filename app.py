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

# Calculate best dimension using elbow method
kneedle_pca = KneeLocator(range(1, len(eigenvalues) + 1), 
                         eigenvalues, 
                         curve='convex', 
                         direction='decreasing')
best_dim = kneedle_pca.elbow if kneedle_pca.elbow else 3  # Default to 3 if no clear elbow

feature_names = df_to_scale.columns.tolist()

cluster_data = df_to_scale.copy()
inertia_values = []

for k in range(1, 11):  # Apply KMeans for k=1 to k=10
    kmeans = KMeans(n_clusters=k, random_state=42)
    cluster_labels = kmeans.fit_predict(df_scaled)  # Get the cluster labels for this k
    cluster_data[str(k)] = cluster_labels 
    inertia_values.append(kmeans.inertia_)

cluster_loc = os.path.join(UPLOAD_FOLDER, "clusters.csv")
cluster_data.to_csv(cluster_loc)

# Use Kneedle algorithm to find the elbow point for k-means
kneedle = KneeLocator(range(1,11), inertia_values, curve='convex', direction='decreasing')
best_k = kneedle.elbow  # This will return the k value where the elbow occurs

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/screeplot_data')
def get_data():
    return jsonify({
        'eigenvalues': eigenvalues.tolist(),
        'best_dim': int(best_dim)
    })

from sklearn.cluster import KMeans

@app.route('/get_clustered_biplot', methods=['GET'])
def get_clustered_biplot():
    selectedK = int(request.args.get('k', best_k))  # Default to best_k if not provided
    x_pc = int(request.args.get('x_pc', 1)) - 1  # Convert from 1-based to 0-based indexing
    y_pc = int(request.args.get('y_pc', 2)) - 1  # Convert from 1-based to 0-based indexing
    
    print(f"Selected K: {selectedK}, X-PC: {x_pc + 1}, Y-PC: {y_pc + 1}")  # Debug print

    # Get the selected principal components
    pc1 = principal_components[:, x_pc].tolist()  # X-axis PC
    pc2 = principal_components[:, y_pc].tolist()  # Y-axis PC

    # Get the feature loadings for the selected components
    loadings = pca.components_[[x_pc, y_pc]].T.tolist()  # Transpose to match features

    # Get cluster labels for the selected k
    cluster_labels = cluster_data[str(selectedK)].tolist()
    print(f"Number of unique clusters: {len(set(cluster_labels))}")  # Debug print
    print(f"Cluster labels sample: {cluster_labels[:10]}")  # Debug print

    # Prepare the data to send
    clustered_biplot_data = {
        "pc1": pc1,
        "pc2": pc2,
        "loadings": loadings,
        "feature_names": selected_columns,  # Original feature names
        "cluster_labels": cluster_labels,  # Cluster labels for each data point
        "x_pc": x_pc + 1,  # Send back the PC numbers (1-based)
        "y_pc": y_pc + 1
    }

    return jsonify(clustered_biplot_data)

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

    # Prepare data for the frontend: Only MSE and k values for the bar graph
    mse_k_pairs = [{'k': k, 'MSE': mse} for k, mse in zip((range(1,11)), inertia_values)]

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