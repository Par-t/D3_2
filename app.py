import atexit
from flask import Flask, render_template, jsonify, request
import os
import pandas as pd
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

app = Flask(__name__)

UPLOAD_FOLDER = "data"
CSV_FILE = os.path.join(UPLOAD_FOLDER, "data.csv")

df = pd.read_csv(CSV_FILE)

selected_columns = ['TotalPop', 'Hispanic', 'White', 'Black',
                    'Asian', 'Income', 'Poverty', 'Unemployment', 'PrivateWork', 'Professional', 'Service', 'Drive']

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
print(f"Two columns contributing the least: {least_contrib_columns}")

print("Sum of Eigenvalues (Explained Variance Ratio):", sum(eigenvalues))

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
if __name__ == '__main__':
    app.run(debug=True)