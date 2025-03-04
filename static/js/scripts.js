// Wait for the DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // Fetch data from the backend
    fetch('/data')
        .then(response => response.json())
        .then(data => {
            createBarChart(data);
        })
        .catch(error => console.error('Error fetching data:', error));
});

function createBarChart(data) {
    // Set the dimensions and margins of the graph
    const margin = {top: 20, right: 30, bottom: 40, left: 40};
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    // Append the SVG object to the body of the page
    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // X axis
    const x = d3.scaleBand()
        .range([0, width])
        .domain(data.map(d => d.name))
        .padding(0.2);
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));
    
    // Y axis
    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.value)])
        .range([height, 0]);
    svg.append("g")
        .call(d3.axisLeft(y));
    
    // Add bars
    svg.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", d => x(d.name))
        .attr("y", d => y(d.value))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.value))
        .attr("fill", "#4682b4");
}