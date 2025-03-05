document.addEventListener("DOMContentLoaded", function () {

    const task1Button = document.getElementById("task1");
    const task2Button = document.getElementById("task2");
    // const task3Button = document.getElementById("task3");

    const task1Content = document.getElementById("task1-content");
    const task2Content = document.getElementById("task2-content");
    // const task3Content = document.getElementById("task3-content");

    // Function to hide all content sections
    function hideAllContent() {
        task1Content.style.display = "none";
        document.getElementById("biplot-content").style.display = "none"; // id selects only the first element
        task2Content.style.display = "none";
        document.getElementById("scatterplotMatrix").style.display = "none"; // Hide scatterplotMatrix by default
    }
    
    // Show Task 1 content (PCA)
    task1Button.addEventListener("click", function () {
        hideAllContent();
        task1Content.style.display = "block";
        document.getElementById("biplot-content").style.display = "block";
    });

    // Show Task 2 content (Scatter Plot Matrix)
    task2Button.addEventListener("click", function () {
        hideAllContent();
        task2Content.style.display = "block";
        document.getElementById("scatterplotMatrix").style.display = "block";
    });

    // Show Task 3 content (k-means)
    // task3Button.addEventListener("click", function () {
    //     hideAllContent();
    //     task3Content.style.display = "block";
    // });

    // Default: Show Task 1 content
    hideAllContent();
    task1Content.style.display = "block";
    document.getElementById("biplot-content").style.display = "block";
    

    fetch('/data')  // Fetch PCA eigenvalues from Flask
        .then(response => response.json())
        .then(data => drawScreePlot(data))
        .catch(error => console.error("Error loading data:", error));

    fetch('/biplot_data')
        .then(response => response.json())
        .then(data => drawBiplot(data))
        .catch(error => console.error("Error loading biplot data:", error));
    
    fetch('/top_features')
        .then(response => response.json())
        .then(data => populateTopFeaturesTable(data))
        .catch(error => console.error("Error loading top features:", error));

    fetch('/scatterplot_matrix_data')
        .then(response => response.json())
        .then(data => renderScatterplotMatrix(data.scatter_data, data.top_features))
        .catch(error => console.error("Error fetching scatterplot matrix data:", error));
    });


function drawScreePlot(eigenvalues) {
    const width = 800, height = 500, margin = { top: 50, right: 30, bottom: 50, left: 60 };

    const svg = d3.select("#screePlot")
        .attr("width", width)
        .attr("height", height);

    // Create the scales for x and y axes
    const xScale = d3.scaleBand()
        .domain(eigenvalues.map((_, i) => `PC${i + 1}`))
        .range([margin.left, width - margin.right])
        .padding(0.2);

    const yScale = d3.scaleLinear()
        .domain([0, 1]) // Set y-axis to go from 0 to 1 (since cumulative variance reaches 1)
        .range([height - margin.bottom, margin.top]);

    // Add bars with a gradient fill to enhance visual appeal
    const gradient = svg.append("defs")
        .append("linearGradient")
        .attr("id", "barGradient")
        .attr("x1", "0%")
        .attr("x2", "100%")
        .attr("y1", "0%")
        .attr("y2", "100%")
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#4d79ff")
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#1a3e75");

    svg.selectAll(".bar")
        .data(eigenvalues)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (_, i) => xScale(`PC${i + 1}`))
        .attr("y", d => yScale(d)) // Scale based on the eigenvalue
        .attr("width", xScale.bandwidth())
        .attr("height", d => height - margin.bottom - yScale(d))
        .attr("fill", "url(#barGradient)");

    // Remove axis lines but keep labels for x-axis and y-axis
    const xAxisGroup = svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale).tickSize(0)); // Remove tick lines

    // Remove x-axis path but keep the labels
    xAxisGroup.selectAll("path")
        .attr("stroke", "none");

    const yAxisGroup = svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale).ticks(5));

    // Remove y-axis path but keep the labels
    yAxisGroup.selectAll("path")
        .attr("stroke", "none");

    // Add gridlines for better readability
    svg.append("g")
        .attr("class", "grid")
        .selectAll("line")
        .data(yScale.ticks(5))
        .enter()
        .append("line")
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
        .attr("y1", d => yScale(d))
        .attr("y2", d => yScale(d))
        .attr("stroke", "#ddd")
        .attr("stroke-dasharray", "2,2");

    // Add vertical gridlines for x-axis
    svg.append("g")
        .attr("class", "grid")
        .selectAll("line")
        .data(eigenvalues)
        .enter()
        .append("line")
        .attr("x1", (_, i) => xScale(`PC${i + 1}`) + xScale.bandwidth() / 2)
        .attr("x2", (_, i) => xScale(`PC${i + 1}`) + xScale.bandwidth() / 2)
        .attr("y1", margin.top)
        .attr("y2", height - margin.bottom)
        .attr("stroke", "#ddd")
        .attr("stroke-dasharray", "2,2");

    // Add cumulative variance line
    const cumulativeVariance = eigenvalues.reduce((acc, val, idx) => {
        acc.push((acc[idx - 1] || 0) + val); // Add current variance to previous sum
        return acc;
    }, []);
    
    const line = d3.line()
        .x((_, i) => xScale(`PC${i + 1}`) + xScale.bandwidth() / 2) // Midpoint of each bar
        .y(d => yScale(d)); // Scale the cumulative variance to the y axis

    svg.append("path")
        .data([cumulativeVariance])
        .attr("fill", "none")
        .attr("stroke", "orange")
        .attr("stroke-width", 2)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("d", line);

    // Highlight x-axis points where the cumulative variance changes
    svg.selectAll(".highlightPoint")
        .data(cumulativeVariance)
        .enter()
        .append("circle")
        .attr("class", "highlightPoint")
        .attr("cx", (_, i) => xScale(`PC${i + 1}`) + xScale.bandwidth() / 2) // Midpoint of each bar
        .attr("cy", yScale) // Map the y position to the cumulative variance value
        .attr("r", 6) // Circle radius
        .attr("fill", "red"); // Highlight color

    // Label for the cumulative variance line
    svg.append("text")
        .attr("x", width - margin.right - 100)
        .attr("y", margin.top + 20)
        .attr("fill", "orange")
        .style("font-size", "14px")
        .text("Cumulative Variance");

    // Handle interaction for selecting intrinsic dimensionality
    d3.select("#dimSelector")
        .on("input", function () {
            const selectedDim = +this.value;
            d3.select("#selectedDim").text(selectedDim);

            // Highlight selected components
            svg.selectAll(".bar")
                .attr("fill", (_, i) => i < selectedDim ? "orange" : "url(#barGradient)");

            // Highlight the selected x-axis points
            svg.selectAll(".highlightPoint")
                .attr("fill", (_, i) => i < selectedDim ? "#39FF14" : "#FF5F00")
                .attr("stroke-width", 0);
                
        });
}

function drawBiplot(data) {
    const width = 800, height = 500, margin = { top: 50, right: 50, bottom: 50, left: 50 };

    const svg = d3.select("#biplot")
        .attr("width", width)
        .attr("height", height);

    // Find the maximum absolute value for scaling
    const maxPC1 = d3.max(data.pc1.map(Math.abs));
    const maxPC2 = d3.max(data.pc2.map(Math.abs));
    const maxLoading = d3.max(data.loadings.flat().map(Math.abs));

    // Scales for the biplot (centered at 0)
    const xScale = d3.scaleLinear()
        .domain([-0.5, 0.5])  // Symmetric around 0
        .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
        .domain([-0.5, 0.5])  // Symmetric around 0
        .range([height - margin.bottom, margin.top]);

    // Clear previous graph
    svg.selectAll("*").remove();


    // Draw data points as blue cyan dots
    svg.selectAll(".point")
        .data(data.pc1)
        .enter()
        .append("circle")
        .attr("class", "point")
        .attr("cx", (d, i) => xScale(Math.max(-0.5, Math.min(0.5, data.pc1[i]))))  // Clip x to [-2, 2]
        .attr("cy", (d, i) => yScale(Math.max(-0.5, Math.min(0.5, data.pc2[i]))))  // Clip y to [-2, 2]
        .attr("r", 3) 

    // Define an arrowhead marker
    svg.append("defs")
        .append("marker")
        .attr("id", "arrowhead")
        .attr("refX", 6)  // Adjust the arrowhead position
        .attr("refY", 3)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M 0,0 L 6,3 L 0,6 Z")  // Arrowhead shape
        .attr("fill", "red");

    // Draw feature vectors as red thin lines with arrowheads
    svg.selectAll(".vector")
        .data(data.loadings)
        .enter()
        .append("line")
        .attr("class", "vector")
        .attr("x1", xScale(0))
        .attr("y1", yScale(0))
        .attr("x2", (d) => xScale(d[0] * maxLoading))  // Scale loadings for visibility
        .attr("y2", (d) => yScale(d[1] * maxLoading))
        .attr("stroke", "red")
        .attr("stroke-width", 1)  // Thin lines
        .attr("opacity", 0.8)
        .attr("marker-end", "url(#arrowhead)");  // Add arrowhead

    // Draw x and y axes passing through (0, 0)
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    // Draw x-axis at y = 0
    svg.append("g")
        .attr("transform", `translate(0,${yScale(0)})`)
        .call(xAxis);

    // Draw y-axis at x = 0
    svg.append("g")
        .attr("transform", `translate(${xScale(0)},0)`)
        .call(yAxis);
}

function populateTopFeaturesTable(data) {
    const tableBody = document.querySelector("#topFeaturesTable tbody");

    // Clear existing rows
    tableBody.innerHTML = "";

    // Add rows for top features
    data.forEach(item => {
        const row = document.createElement("tr");

        const featureCell = document.createElement("td");
        featureCell.textContent = item.feature;

        const squaredSumCell = document.createElement("td");
        squaredSumCell.textContent = item.squared_sum;

        row.appendChild(featureCell);
        row.appendChild(squaredSumCell);
        tableBody.appendChild(row);
    });
}

function renderScatterplotMatrix(data, features) {
    console.log("Rendering Scatter Plot Matrix");

    // Set size and padding of each scatter plot cell
    const size = 150; // Size of each small plot
    const padding = 20; // Padding between plots

    // Calculate the total width and height of the matrix
    const width = features.length * size + padding;
    const height = features.length * size + padding;

    // Create an SVG container for the scatter plot matrix
    const svg = d3.select("#scatterPlot")
        .attr("width", width)
        .attr("height", height);

    // Remove any existing SVG to prevent duplication
    svg.selectAll("*").remove();

    // Create scales for each feature for proper scaling of data points
    const scales = {};
    features.forEach(feature => {
        scales[feature] = d3.scaleLinear()
            .domain(d3.extent(data, d => d[feature])) // Set domain to feature values
            .range([padding, size - padding]); // Set range for plotting within the cell
    });

    // Function to add axis labels (used for both x and y axes)
    function addAxisLabel(cell, x, y, text, rotate = false) {
        const label = cell.append("text")
            .attr("x", x)
            .attr("y", y)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .text(text);

        if (rotate) {
            label.attr("transform", "rotate(-90)");
        }
    }

    // Loop through features and generate the scatter plot matrix
    for (let row = 0; row < features.length; row++) {
        for (let col = 0; col < features.length; col++) {
            const xFeature = features[col]; // Feature for x-axis
            const yFeature = features[row]; // Feature for y-axis

            // Create a group for each individual scatter plot
            const cell = svg.append("g")
                .attr("transform", `translate(${col * size}, ${row * size})`) // Position cells based on index
                .attr("class", "scatter-plot-cell"); // Assign class to each cell for styling

            // Diagonal: Add text showing feature name
            if (row === col) {
                cell.append("text")
                    .attr("x", size / 2) // Position at the center of the cell
                    .attr("y", size / 2)
                    .attr("text-anchor", "middle")
                    .attr("font-size", "12px")
                    .text(xFeature); // Display the feature name on the diagonal
            } else {
                // Scatterplot: Plot data points in the off-diagonal cells
                const circles = cell.selectAll("circle")
                    .data(data)
                    .enter()
                    .append("circle")
                    .attr("cx", d => scales[xFeature](d[xFeature])) // Scale x-values
                    .attr("cy", d => size - scales[yFeature](d[yFeature])) // Scale y-values (flip Y axis for visual consistency)
                    .attr("r", 3) // Set radius for each point
                    .attr("fill", "steelblue"); // Set the color of the points

                // Hover functionality: Change color on hover
                circles.on("mouseover", function() {
                    d3.select(this).attr("fill", "red"); // Change color on hover
                })
                .on("mouseout", function() {
                    d3.select(this).attr("fill", "steelblue"); // Reset color on mouse out
                });
            }

            // X-axis labels: Add labels for the x-axis at the bottom of the plot in the last row
            if (row === features.length - 1) {
                addAxisLabel(cell, size / 2, size + 15, xFeature);
            }

            // Y-axis labels: Add labels for the y-axis on the left side of the plot in the first column
            if (col === 0) {
                addAxisLabel(cell, -size / 2, -5, yFeature, true);
            }

            // ** Add border around each individual scatter plot cell**
            cell.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", size)
                .attr("height", size)
                .attr("stroke", "#ccc") // Border color
                .attr("fill", "none") // No fill inside the border
                .attr("stroke-width", 1); // Border thickness
        }
    }

    // Center the scatter plot matrix horizontally on the screen
    const containerWidth = window.innerWidth;
    const matrixWidth = width;

    d3.select("#scatterplot")
        .style("display", "flex")
        .style("justify-content", "center")
        .style("width", containerWidth + "px");
}




