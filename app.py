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

app = Flask(__name__)

UPLOAD_FOLDER = "data"
CSV_FILE = os.path.join(UPLOAD_FOLDER, "data.csv")

df = pd.read_csv(CSV_FILE)

selected_columns = ['TotalPop', 'Hispanic', 'White', 'Black',
                    'Asian', 'Income', 'Poverty', 'Unemployment', 'Professional', 'Service', 'Drive']

df_selected = df[selected_columns].dropna()

percentage_columns = ['Hispanic', 'White', 'Black', 'Asian', 'Poverty', 'Unemployment', 'Professional', 'Service', 'Drive']

# Multiply percentage columns by TotalPop to get absolute counts
for col in percentage_columns:
    df_selected[col] = df_selected[col] * df_selected['TotalPop'] / 100  # Convert percentages to absolute values

# Columns to sum directly
sum_columns = ['TotalPop', 'Income'] + percentage_columns

# Group by 'County' and aggregate
df_grouped = df.groupby('County')[sum_columns].sum().reset_index()

# Convert back to percentages
for col in percentage_columns:
    df_grouped[col] = (df_grouped[col] * 100 / df_grouped['TotalPop']).round(2)

# Save the grouped dataset
df_grouped.to_csv(UPLOAD_FOLDER+"/grouped_by_county.csv", index=False)

# Drop the 'County' column and select all other numerical features for PCA
df_to_scale = df_grouped.drop(columns=['County']).dropna()

# Standardize the data
scaler = StandardScaler()
df_scaled = scaler.fit_transform(df_to_scale)

# Apply PCA (compute as many components as available)
num_components = min(df_scaled.shape)  # Maximum possible components
pca = PCA(n_components=num_components)
principal_components = pca.fit_transform(df_scaled)

# Get Eigenvalues (Variance Explained)
eigenvalues = pca.explained_variance_ratio_

least_contrib_indices = np.argsort(eigenvalues)[:2]

# Get the names of the two columns contributing the least
least_contrib_columns = [selected_columns[i] for i in least_contrib_indices]

feature_names = df_to_scale.columns.tolist()
# print(f"Two columns contributing the least: {least_contrib_columns}")

# print("Sum of Eigenvalues (Explained Variance Ratio):", sum(eigenvalues))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/data')
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
        squared_sums = np.sum(loadings**2, axis=0)

        # Pair feature names with their squared sums
        feature_squared_sums = list(zip(selected_columns, squared_sums))

        # Sort by squared sums in descending order
        feature_squared_sums.sort(key=lambda x: x[1], reverse=True)

        # Select top 4 features
        top_features = feature_squared_sums[:4]

        # Prepare data to send
        top_features_data = [{"feature": feature, "squared_sum": round(squared_sum, 4)} for feature, squared_sum in top_features]

        top_features_dic[i]=top_features_data

    return jsonify(top_features_dic)

@app.route('/scatterplot_matrix_data')
def get_scatterplot_matrix_data():

    print("getting matrix data")
    top_features_dict = {}
    # Get PCA loadings (components)
    for i in range(1,12):
        loadings = pca.components_[:i]

        # Calculate squared sum of PCA loadings for each feature
        squared_sums = np.sum(loadings**2, axis=0)

        # Pair feature names with their squared sums
        feature_squared_sums = list(zip(selected_columns, squared_sums))

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

@app.route('/kmeans_pca', methods=['GET'])
def kmeans_pca():
 
    # Get PCA1 and PCA2
    pca1 = principal_components[:, 0]  # First principal component
    pca2 = principal_components[:, 1]  # Second principal component

    # Perform KMeans clustering on PCA1 and PCA2
    kmeans = KMeans(n_clusters=3)  # Adjust number of clusters as needed
    kmeans.fit(np.column_stack((pca1, pca2)))  # Use PCA1 and PCA2 for clustering
    cluster_ids = kmeans.labels_  # Get cluster IDs for each data point

    # Prepare data for the frontend (sending PCA1, PCA2 and cluster IDs)
    pca_data = pd.DataFrame({'PCA1': pca1, 'PCA2': pca2, 'ClusterID': cluster_ids})

    # Convert to dictionary for sending via JSON
    scatter_data = pca_data.to_dict(orient="records")

    return jsonify({
        'scatter_data': scatter_data,
        'cluster_centers': kmeans.cluster_centers_.tolist()
    })

if __name__ == '__main__':
    app.run(debug=True)