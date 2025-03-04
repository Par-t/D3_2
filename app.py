from flask import Flask, render_template, jsonify

app = Flask(__name__)

# Sample data for the bar chart
data = [
    {"name": "A", "value": 5},
    {"name": "B", "value": 10},
    {"name": "C", "value": 15},
    {"name": "D", "value": 20},
    {"name": "E", "value": 25}
]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/data')
def get_data():
    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True)