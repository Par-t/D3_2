let selectedK;
let dimValue;
let bestDim;
let eigenvalues;  // Add this to store eigenvalues globally

document.addEventListener("DOMContentLoaded", function () {

    const task1Button = document.getElementById("task1");
    const task2Button = document.getElementById("task2");
    const task3Button = document.getElementById("task3");
    const viewBiplotBtn = document.getElementById("viewBiplotBtn");

    const task1Content = document.getElementById("task1-content");
    const task2Content = document.getElementById("task2-content");
    const task3Content = document.getElementById("task3-content");

    // Function to hide all content sections
    function hideAllContent() {
        task1Content.style.display = "none";
        document.getElementById("biplot-content").style.display = "none"; // id selects only the first element
        task2Content.style.display = "none";
        document.getElementById("scatterplotMatrix").style.display = "none"; // Hide scatterplotMatrix by default
        task3Content.style.display="none"
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

    //Show Task 3 content (k-means)
    task3Button.addEventListener("click", function () {
        hideAllContent();
        task3Content.style.display = "block";
    });

    // View Biplot button click handler
    viewBiplotBtn.addEventListener("click", function() {
        hideAllContent();
        task1Content.style.display = "block";
        document.getElementById("biplot-content").style.display = "block";
        task1Button.click(); // Simulate click on Task 1 button to update UI state
        
        // Smooth scroll to biplot
        document.getElementById("biplot-content").scrollIntoView({ 
            behavior: 'smooth',
            block: 'center'
        });
    });

    // Default: Show Task 1 content
    hideAllContent();
    task1Content.style.display = "block";
    document.getElementById("biplot-content").style.display = "block";
    
    // First fetch scree plot data to get best_dim
    fetch('/screeplot_data')
        .then(response => response.json())
        .then(data => {
            bestDim = data.best_dim;
            dimValue = data.best_dim;
            eigenvalues = data.eigenvalues;  // Store eigenvalues globally
            drawScreePlot(data.eigenvalues);
            
            // Set initial PC info display
            const selectedPCsElement = document.getElementById('selectedPCs');
            const explainedVarianceElement = document.getElementById('explainedVariance');
            
            // Calculate initial cumulative variance
            const initialVariance = eigenvalues.slice(0, bestDim).reduce((a, b) => a + b, 0);
            const initialPercentage = (initialVariance * 100).toFixed(2);
            
            // Set initial display values
            selectedPCsElement.textContent = `PC1-PC${bestDim}`;
            explainedVarianceElement.textContent = `${initialPercentage}% of total variance`;
            
            // After getting best_dim, fetch top features
            return fetch('/top_features');
        })
        .then(response => response.json())
        .then(data => populateTopFeaturesTable(data[dimValue]))
        .catch(error => console.error("Error loading data:", error));

    // Then fetch scatterplot matrix data
    fetch('/scatterplot_matrix_data')
        .then(response => response.json())
        .then(data => renderScatterplotMatrix(data[dimValue].scatter_data, data[dimValue].top_features))
        .catch(error => console.error("Error fetching scatterplot matrix data:", error));

    // Finally fetch kmeans data
    fetch('/kmeans')
        .then(response => response.json())
        .then(data => {
            selectedK = data.best_k;
            renderKGraph(data.mse_k_pairs, data.best_k);
            return fetch(`/get_clustered_biplot?k=${selectedK}`);
        })
        .then(response => response.json())
        .then(data => drawBiplot(data))
        .catch(error => console.error("Error fetching KMeans data:", error));

    // Add event listeners for PC selection dropdowns
    const xAxisSelect = document.getElementById('x-axis-pc');
    const yAxisSelect = document.getElementById('y-axis-pc');

    function updateBiplot() {
        const xPC = xAxisSelect.value;
        const yPC = yAxisSelect.value;
        
        updatePCInfo(parseInt(xPC), parseInt(yPC));
        
        fetch(`/get_clustered_biplot?k=${selectedK}&x_pc=${xPC}&y_pc=${yPC}`)
            .then(response => response.json())
            .then(data => drawBiplot(data))
            .catch(error => console.error("Error fetching biplot data:", error));
    }

    xAxisSelect.addEventListener('change', updateBiplot);
    yAxisSelect.addEventListener('change', updateBiplot);
});

// New function to update PC information
function updatePCInfo(xPC, yPC) {
    const selectedPCsElement = document.getElementById('selectedPCs');
    const explainedVarianceElement = document.getElementById('explainedVariance');
    
    // Update selected PCs text
    selectedPCsElement.textContent = `PC${xPC} vs PC${yPC}`;
    
    // Calculate and update explained variance
    if (eigenvalues) {
        const totalVariance = eigenvalues[xPC - 1] + eigenvalues[yPC - 1];
        const percentage = (totalVariance * 100).toFixed(2);
        explainedVarianceElement.textContent = `${percentage}% of total variance`;
    }
}

function drawScreePlot(eigenvalues) {
    const width = 800, height = 500;
    const margin = { 
        top: 50, 
        right: 30, 
        bottom: 50, 
        left: 80  // Increased left margin to accommodate y-axis label
    };

    // Update explained variance based on selected dimensions
    function updateExplainedVariance() {
        // Calculate cumulative variance up to the selected dimension
        const cumulativeVariance = eigenvalues.slice(0, dimValue).reduce((a, b) => a + b, 0);
        const percentage = (cumulativeVariance * 100).toFixed(2);
        
        // Update display format to PC1-PCi
        document.getElementById('selectedPCs').textContent = `PC1-PC${dimValue}`;
        document.getElementById('explainedVariance').textContent = `${percentage}% of total variance`;
    }

    const svg = d3.select("#screePlot")
        .attr("width", width)
        .attr("height", height);

    // Clear previous content
    svg.selectAll("*").remove();

    // Create the scales for x and y axes
    const xScale = d3.scaleBand()
        .domain(eigenvalues.map((_, i) => `PC${i + 1}`))
        .range([margin.left, width - margin.right])
        .padding(0.2);

    const yScale = d3.scaleLinear()
        .domain([0, 1])
        .range([height - margin.bottom, margin.top]);


    // Add Y axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", margin.left / 3)
        .attr("x", -(height / 2))
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .text("Explained Variance Ratio");

    // Add X axis label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - margin.bottom / 3)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .text("Principal Components");

    const bars = svg.selectAll(".bar")
        .data(eigenvalues)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("data-dim", (_, i) => i + 1)
        .attr("x", (_, i) => xScale(`PC${i + 1}`))
        .attr("y", d => yScale(d)) // Scale based on the eigenvalue
        .attr("width", xScale.bandwidth())
        .attr("height", d => height - margin.bottom - yScale(d))
        .attr("fill", (_, i) => i + 1 === bestDim ? "#39FF14" : "#4d79ff")  // Initially all blue except best_dim
        .on("click", function(event, d) {
            const bar = d3.select(this);
            
            const dataDimStr = bar.attr("data-dim");
            const clickedDim = parseInt(dataDimStr, 10);
            if (dimValue == clickedDim) {
                // Do nothing if the same bar is clicked
                return;
            }
            // Update global dimValue and update bar colors
            dimValue = clickedDim;
            console.log("Selected Dimensionality (K):", dimValue);
            svg.selectAll(".bar")
               .attr("fill", (_, i) => {
                   if (i + 1 === bestDim) return "#39FF14";  // Best dim in neon green
                   return i + 1 <= dimValue ? "orange" : "#4d79ff";  // Selected dims in orange
               });
            
            updateExplainedVariance();  // Update the explained variance display
            
            fetch('/top_features')
               .then(response => response.json())
               .then(data => populateTopFeaturesTable(data[dimValue]))
               .catch(error => console.error("Error loading top features:", error));
    
            fetch('/scatterplot_matrix_data')
               .then(response => response.json())
               .then(data => renderScatterplotMatrix(data[dimValue].scatter_data, data[dimValue].top_features))
               .catch(error => console.error("Error fetching scatterplot matrix data:", error));
        });
    
    // Add invisible hitbox above each bar for better clickability
    svg.selectAll(".hitbox")
        .data(eigenvalues)
        .enter()
        .append("rect")
        .attr("class", "hitbox")
        .attr("data-dim", (_, i) => i + 1) 
        .attr("x", (_, i) => xScale(`PC${i + 1}`)) // Same position as the bars
        .attr("y", margin.top) // Place it from the top margin to make the hitbox extend to the whole graph height
        .attr("width", xScale.bandwidth())
        .attr("height", height - margin.top - margin.bottom) // Full height for better click detection
        .attr("fill", "transparent")
        .attr("pointer-events", "visibleFill")  // Allow interaction with the invisible hitbox
        .on("click", function(event, d) {
            const hitbox = d3.select(this);
            const dataDimStr = hitbox.attr("data-dim");
            const clickedDim = parseInt(dataDimStr, 10);
            if (dimValue == clickedDim) {
                // Do nothing if the same hitbox is clicked
                return;
            }
            // Update global dimValue and update bar colors
            dimValue = clickedDim;
            console.log("Selected Dimensionality (K):", dimValue);
            svg.selectAll(".bar")
               .attr("fill", (_, i) => {
                   if (i + 1 === bestDim) return "#39FF14";  // Best dim in neon green
                   return i + 1 <= dimValue ? "orange" : "#4d79ff";  // Selected dims in orange
               });
            
            updateExplainedVariance();  // Update the explained variance display
            
            fetch('/top_features')
               .then(response => response.json())
               .then(data => populateTopFeaturesTable(data[dimValue]))
               .catch(error => console.error("Error loading top features:", error));
    
            fetch('/scatterplot_matrix_data')
               .then(response => response.json())
               .then(data => renderScatterplotMatrix(data[dimValue].scatter_data, data[dimValue].top_features))
               .catch(error => console.error("Error fetching scatterplot matrix data:", error));
        });
    

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

    // Add cumulative variance line without animation
    const cumulativeVariance = eigenvalues.reduce((acc, val, idx) => {
        acc.push((acc[idx - 1] || 0) + val);
        return acc;
    }, []);
    
    const line = d3.line()
        .x((_, i) => xScale(`PC${i + 1}`) + xScale.bandwidth() / 2)
        .y(d => yScale(d));

    // Create path without animation
    svg.append("path")
        .data([cumulativeVariance])
        .attr("fill", "none")
        .attr("stroke", "#4d79ff")  // Changed to blue to match the unselected bars
        .attr("stroke-width", 2.5)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("d", line);

    // Highlight x-axis points with enhanced styling and animations
    const points = svg.selectAll(".highlightPoint")
        .data(cumulativeVariance)
        .enter()
        .append("circle")
        .attr("class", "highlightPoint")
        .attr("data-dim", (_, i) => i + 1)  // Add data-dim attribute to points
        .attr("cx", (_, i) => xScale(`PC${i + 1}`) + xScale.bandwidth() / 2)
        .attr("cy", yScale)
        .attr("r", 6)
        .attr("fill", (_, i) => i + 1 === bestDim ? "#39FF14" : "#4d79ff")  // Initially all blue except best_dim
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .style("opacity", 0)
        .style("cursor", "pointer")  // Add pointer cursor
        .transition()
        .duration(300)  // Reduced from 1500 to 300
        .style("opacity", 1)
        .on("end", function() {
            // Add click handler to points
            d3.select(this)
                .on("click", function(event) {
                    const point = d3.select(this);
                    const dataDimStr = point.attr("data-dim");
                    const clickedDim = parseInt(dataDimStr, 10);
                    updateOnDimensionChange(clickedDim);
                })
                .on("mouseover", function(event, d) {
                    d3.select(this)
                        .transition()
                        .duration(100)  // Reduced from 200 to 100
                        .attr("r", 8);
                })
                .on("mouseout", function(event, d) {
                    d3.select(this)
                        .transition()
                        .duration(100)  // Reduced from 200 to 100
                        .attr("r", 6);
                });
        });

    // Function to update everything when dimension changes
    function updateOnDimensionChange(newDimValue) {
        if (dimValue === newDimValue) {
            return; // Do nothing if same dimension is clicked
        }
        
        dimValue = newDimValue;
        console.log("Selected Dimensionality:", dimValue);
        
        // Update bar colors with faster transition
        svg.selectAll(".bar")
           .transition()
           .duration(150)  // Added transition with short duration
           .attr("fill", (_, i) => {
               if (i + 1 === bestDim) return "#39FF14";  // Best dim in neon green
               return i + 1 <= dimValue ? "orange" : "#4d79ff";  // Selected dims in orange
           });
        
        // Update point colors with faster transition
        svg.selectAll(".highlightPoint")
           .transition()
           .duration(150)  // Added transition with short duration
           .attr("fill", (_, i) => {
               if (i + 1 === bestDim) return "#39FF14";  // Best dim in neon green
               return i + 1 <= dimValue ? "orange" : "#4d79ff";  // Match bar colors
           });
        
        updateExplainedVariance();
        
        // Update PCA loadings table
        fetch('/top_features')
           .then(response => response.json())
           .then(data => populateTopFeaturesTable(data[dimValue]))
           .catch(error => console.error("Error loading top features:", error));

        // Update scatter plot matrix
        fetch('/scatterplot_matrix_data')
           .then(response => response.json())
           .then(data => renderScatterplotMatrix(data[dimValue].scatter_data, data[dimValue].top_features))
           .catch(error => console.error("Error fetching scatterplot matrix data:", error));
    }

    // Add click handlers to bars
    bars.on("click", function(event, d) {
        const bar = d3.select(this);
        const dataDimStr = bar.attr("data-dim");
        const clickedDim = parseInt(dataDimStr, 10);
        updateOnDimensionChange(clickedDim);
    });

    // Add click handlers to hitboxes
    svg.selectAll(".hitbox")
        .on("click", function(event, d) {
            const hitbox = d3.select(this);
            const dataDimStr = hitbox.attr("data-dim");
            const clickedDim = parseInt(dataDimStr, 10);
            updateOnDimensionChange(clickedDim);
        });

    // Label for the cumulative variance line
    svg.append("text")
        .attr("x", width - margin.right - 100)
        .attr("y", margin.top + 20)
        .attr("fill", "#4d79ff")  // Changed to match the line color
        .style("font-size", "14px")
        .style("opacity", 0)
        .text("Cumulative Variance")
        .transition()
        .duration(300)  // Reduced from 1000 to 300
        .style("opacity", 1);

    // Initial update of explained variance
    updateExplainedVariance();
}

function drawBiplot(data) {
    const width = 800, height = 500, margin = { top: 50, right: 50, bottom: 50, left: 50 };
    
    // Create a more pleasing color scale for clusters
    const colorScale = d3.scaleOrdinal()
        .domain(Array.from({ length: selectedK }, (_, i) => i))
        .range([
            "#3498db",  // Blue
            "#e74c3c",  // Red
            "#2ecc71",  // Green
            "#f1c40f",  // Yellow
            "#9b59b6",  // Purple
            "#e67e22",  // Orange
            "#1abc9c",  // Turquoise
            "#34495e",  // Dark Blue
            "#7f8c8d",  // Gray
            "#d35400"   // Dark Orange
        ]);

    // Set fixed range [-6, 6] for both axes
    const xScale = d3.scaleLinear()
        .domain([-6, 6])  // Changed from [-8, 8] to [-6, 6]
        .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
        .domain([-6, 6])  // Changed from [-8, 8] to [-6, 6]
        .range([height - margin.bottom, margin.top]);

    const svg = d3.select("#biplot")
        .attr("width", width)
        .attr("height", height);

    svg.selectAll("*").remove();

    // Add a subtle grid
    const gridColor = "#ecf0f1";
    const gridLines = svg.append("g")
        .attr("class", "grid-lines");

    // Add horizontal grid lines
    yScale.ticks(10).forEach(tick => {
        gridLines.append("line")
            .attr("x1", margin.left)
            .attr("x2", width - margin.right)
            .attr("y1", yScale(tick))
            .attr("y2", yScale(tick))
            .attr("stroke", gridColor)
            .attr("stroke-width", 1);
    });

    // Add vertical grid lines
    xScale.ticks(10).forEach(tick => {
        gridLines.append("line")
            .attr("x1", xScale(tick))
            .attr("x2", xScale(tick))
            .attr("y1", margin.top)
            .attr("y2", height - margin.bottom)
            .attr("stroke", gridColor)
            .attr("stroke-width", 1);
    });

    // Create array of all points with their cluster assignments
    const allPoints = data.pc1.map((pc1Val, idx) => ({
        pc1: pc1Val,
        pc2: data.pc2[idx],
        cluster: parseInt(data.cluster_labels[idx])
    }));

    // Draw points by cluster with animations
    for (let i = 0; i < selectedK; i++) {
        const clusterPoints = allPoints.filter(d => d.cluster === i);
        
        const points = svg.selectAll(`.point_${i}`)
            .data(clusterPoints)
            .enter()
            .append("circle")
            .attr("class", `point_${i}`)
            .attr("cx", width / 2)
            .attr("cy", height / 2)
            .attr("fill", colorScale(i))
            .attr("opacity", 0)
            .attr("r", 3.5)
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.5);

        // Animate points to their positions
        points.transition()
            .duration(1000)
            .delay((d, i) => i * 2)
            .attr("cx", d => xScale(d.pc1))
            .attr("cy", d => yScale(d.pc2))
            .attr("opacity", 0.7);

        // Add hover effects
        points.on("mouseover", function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", 6)
                .attr("opacity", 1)
                .attr("stroke-width", 1);
        })
        .on("mouseout", function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", 3.5)
                .attr("opacity", 0.7)
                .attr("stroke-width", 0.5);
        });
    }

    // Define an arrowhead marker with improved styling
    svg.append("defs")
        .append("marker")
        .attr("id", "arrowhead")
        .attr("refX", 8)
        .attr("refY", 4)
        .attr("markerWidth", 12)
        .attr("markerHeight", 12)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M 0,0 L 12,4 L 0,8 Z")
        .attr("fill", "#ff3366")
        .attr("stroke", "white")
        .attr("stroke-width", "0.5");  // Reduced from 1 to 0.5

    // Create a group for each vector and its label
    const vectorGroups = svg.selectAll(".vector-group")
        .data(data.loadings)
        .enter()
        .append("g")
        .attr("class", "vector-group");

    // Draw feature vectors with animations
    const vectors = vectorGroups
        .append("line")
        .attr("class", "vector")
        .attr("x1", xScale(0))
        .attr("y1", yScale(0))
        .attr("x2", xScale(0))
        .attr("y2", yScale(0))
        .attr("stroke", "#ff3366")  // Main color
        .attr("stroke-width", 4)
        .style("stroke-linecap", "round")
        .attr("opacity", 0)
        .each(function() {  // Add white border to vectors
            const vector = d3.select(this);
            const parent = d3.select(this.parentNode);
            parent.insert("line", ".vector")  // Insert white border behind the colored line
                .attr("x1", vector.attr("x1"))
                .attr("y1", vector.attr("y1"))
                .attr("x2", vector.attr("x2"))
                .attr("y2", vector.attr("y2"))
                .attr("stroke", "white")
                .attr("stroke-width", 5)  // Reduced from 6 to 5
                .attr("opacity", 0);
        })
        .attr("marker-end", "url(#arrowhead)")
        .on("mouseover", function(event, d, i) {
            const group = d3.select(this.parentNode);
            const vector = d3.select(this);
            const whiteBorder = group.select("line:first-child");
            
            group.select(".vector-label")
                .transition()
                .duration(200)
                .style("font-size", "18px")  // Increase font size on hover
                .style("font-weight", "700"); // Make bold on hover
            
            vector
                .transition()
                .duration(200)
                .attr("stroke-width", 5)
                .attr("opacity", 1);
                
            whiteBorder  // Also update the white border
                .transition()
                .duration(200)
                .attr("stroke-width", 6)  // Reduced from 7 to 6
                .attr("opacity", 1);
        })
        .on("mouseout", function(event, d) {
            const group = d3.select(this.parentNode);
            const vector = d3.select(this);
            const whiteBorder = group.select("line:first-child");
            
            group.select(".vector-label")
                .transition()
                .duration(200)
                .style("font-size", "14px")  // Return to normal size
                .style("font-weight", "400"); // Remove bold
            
            vector
                .transition()
                .duration(200)
                .attr("stroke-width", 4)
                .attr("opacity", 0.9);
                
            whiteBorder  // Also update the white border
                .transition()
                .duration(200)
                .attr("stroke-width", 5)  // Reduced from 6 to 5
                .attr("opacity", 0.9);
        });

    // Animate vectors and their borders
    vectorGroups.selectAll("line")
        .transition()
        .duration(1000)
        .delay((d, i) => i * 100)
        .attr("x2", d => xScale(d[0] * 5))
        .attr("y2", d => yScale(d[1] * 5))
        .attr("opacity", 0.9);

    // Add feature labels with fade-in animation
    const labels = vectorGroups
        .append("text")
        .attr("class", "vector-label")
        .attr("x", d => xScale(d[0] * 5.2))
        .attr("y", d => yScale(d[1] * 5.2))
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")  // Normal size
        .attr("font-weight", "400")  // Normal weight
        .attr("fill", "#ff3366")  // Match vector color
        .attr("stroke", "white")  // Add white outline
        .attr("stroke-width", "0.5")  // Thin white outline
        .attr("paint-order", "stroke")  // Ensure stroke is behind text
        .style("opacity", 1)  // Always visible
        .text((d, i) => data.feature_names[i]);

    // Remove label animation to keep them always visible
    labels.style("opacity", 1);  // Set immediate opacity instead of transition

    // Draw axes with animation
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    // Draw x-axis with animation
    const xAxisGroup = svg.append("g")
        .attr("transform", `translate(0,${yScale(0)})`)
        .style("opacity", 0);
    
    xAxisGroup.call(xAxis)
        .transition()
        .duration(1000)
        .style("opacity", 1);

    // Draw y-axis with animation
    const yAxisGroup = svg.append("g")
        .attr("transform", `translate(${xScale(0)},0)`)
        .style("opacity", 0);
    
    yAxisGroup.call(yAxis)
        .transition()
        .duration(1000)
        .style("opacity", 1);

    // Add legend with animation
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - margin.right - 100}, ${margin.top})`)
        .style("opacity", 0);

    // Add legend background
    legend.append("rect")
        .attr("width", 90)
        .attr("height", selectedK * 20 + 10)
        .attr("fill", "white")
        .attr("stroke", "#bdc3c7")
        .attr("stroke-width", 1)
        .attr("rx", 5);

    for (let i = 0; i < selectedK; i++) {
        const legendItem = legend.append("g")
            .attr("transform", `translate(10, ${i * 20 + 10})`);

        legendItem.append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 5)
            .attr("fill", colorScale(i))
            .attr("opacity", 0.7);

        legendItem.append("text")
            .attr("x", 10)
            .attr("y", 4)
            .text(`Cluster ${i}`)
            .attr("font-size", "11px")
            .attr("fill", "#2c3e50");
    }

    // Animate legend
    legend.transition()
        .duration(1000)
        .style("opacity", 1);

    // Update axis labels with animation
    const xLabel = svg.append("text")
        .attr("transform", `translate(${width/2}, ${height - margin.bottom/3})`)
        .style("text-anchor", "middle")
        .style("opacity", 0)
        .attr("fill", "#2c3e50")
        .attr("font-size", "12px")
        .text(`PC${data.x_pc}`);

    const yLabel = svg.append("text")
        .attr("transform", `rotate(-90)`)
        .attr("y", margin.left/2)
        .attr("x", -height/2)
        .style("text-anchor", "middle")
        .style("opacity", 0)
        .attr("fill", "#2c3e50")
        .attr("font-size", "12px")
        .text(`PC${data.y_pc}`);

    // Animate labels
    xLabel.transition()
        .duration(1000)
        .style("opacity", 1);

    yLabel.transition()
        .duration(1000)
        .style("opacity", 1);
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

    const size = 180;
    const padding = 100;  // Increased from 80 to 100
    const innerPadding = 15;
    const labelPadding = 80;  // Increased from 60 to 80

    const width = features.length * size + padding * 2;
    const height = features.length * size + padding * 2;

    const svg = d3.select("#scatterPlot")
        .attr("width", width)
        .attr("height", height);

    svg.selectAll("*").remove();

    // Create scales for each feature with dynamic ranges based on data
    const scales = {};
    features.forEach(feature => {
        const extent = d3.extent(data, d => d[feature]);
        // Add a small padding to the domain (5% of the range)
        const padding = (extent[1] - extent[0]) * 0.05;
        scales[feature] = d3.scaleLinear()
            .domain([extent[0] - padding, extent[1] + padding])
            .range([innerPadding, size - innerPadding]);
    });

    // Create axis generators with more ticks
    const axisGenerators = {};
    features.forEach(feature => {
        axisGenerators[feature] = {
            x: d3.axisBottom(scales[feature]).ticks(5).tickSize(6),
            y: d3.axisLeft(scales[feature]).ticks(5).tickSize(6)
        };
    });

    // Define a more pleasing color palette
    const pointColor = "#3498db";  // Softer blue
    const hoverColor = "#e74c3c";  // Coral red for hover
    const gridColor = "#ecf0f1";   // Light gray for grid
    const axisColor = "#7f8c8d";   // Medium gray for axes

    // Loop through features and generate the scatter plot matrix
    for (let row = 0; row < features.length; row++) {
        for (let col = 0; col < features.length; col++) {
            const xFeature = features[col];
            const yFeature = features[row];

            const cell = svg.append("g")
                .attr("transform", `translate(${col * size + padding}, ${row * size + padding})`)
                .attr("class", "scatter-plot-cell");

            // Add background rectangle with subtle border
            cell.append("rect")
                .attr("width", size)
                .attr("height", size)
                .attr("fill", "white")
                .attr("stroke", "#bdc3c7")
                .attr("stroke-width", 1);

            // Add grid lines with softer styling
            const gridLines = cell.append("g")
                .attr("class", "grid-lines");

            scales[xFeature].ticks(5).forEach(tick => {
                gridLines.append("line")
                    .attr("x1", scales[xFeature](tick))
                    .attr("x2", scales[xFeature](tick))
                    .attr("y1", 0)
                    .attr("y2", size)
                    .attr("stroke", gridColor)
                    .attr("stroke-width", 1);
            });

            scales[yFeature].ticks(5).forEach(tick => {
                gridLines.append("line")
                    .attr("x1", 0)
                    .attr("x2", size)
                    .attr("y1", scales[yFeature](tick))
                    .attr("y2", scales[yFeature](tick))
                    .attr("stroke", gridColor)
                    .attr("stroke-width", 1);
            });

            if (row === col) {
                // Diagonal: Feature name with improved styling
                cell.append("text")
                    .attr("x", size / 2)
                    .attr("y", size / 2)
                    .attr("text-anchor", "middle")
                    .attr("alignment-baseline", "middle")
                    .attr("font-size", "14px")
                    .attr("font-weight", "bold")
                    .attr("fill", "#2c3e50")
                    .text(xFeature);
            } else {
                // Create clip path
                const clipId = `clip-${row}-${col}`;
                cell.append("clipPath")
                    .attr("id", clipId)
                    .append("rect")
                    .attr("width", size)
                    .attr("height", size);

                // Add points with improved styling
                const pointsGroup = cell.append("g")
                    .attr("clip-path", `url(#${clipId})`);

                pointsGroup.selectAll("circle")
                    .data(data)
                    .enter()
                    .append("circle")
                    .attr("cx", d => scales[xFeature](d[xFeature]))
                    .attr("cy", d => scales[yFeature](d[yFeature]))
                    .attr("r", 3)
                    .attr("fill", pointColor)
                    .attr("opacity", 0.6)
                    .on("mouseover", function(event, d) {
                        d3.select(this)
                            .transition()
                            .duration(150)
                            .attr("r", 5)
                            .attr("fill", hoverColor)
                            .attr("opacity", 1);
                    })
                    .on("mouseout", function(event, d) {
                        d3.select(this)
                            .transition()
                            .duration(150)
                            .attr("r", 3)
                            .attr("fill", pointColor)
                            .attr("opacity", 0.6);
                    });

                if (row === features.length - 1) {
                    // Bottom axis with improved styling and positioning
                    cell.append("g")
                        .attr("transform", `translate(0, ${size})`)
                        .call(axisGenerators[xFeature].x)
                        .call(g => g.select(".domain").attr("stroke", axisColor))
                        .call(g => g.selectAll(".tick line").attr("stroke", axisColor))
                        .call(g => g.selectAll(".tick text")
                            .attr("font-size", "10px")
                            .attr("fill", "#2c3e50")
                            .attr("transform", "rotate(-45) translate(-5, 6)")
                            .attr("text-anchor", "end"));

                    // X-axis label with adjusted position
                    cell.append("text")
                        .attr("x", size / 2)
                        .attr("y", size + labelPadding - 10)  // Adjusted position
                        .attr("text-anchor", "middle")
                        .attr("font-size", "12px")
                        .attr("fill", "#2c3e50")
                        .text(xFeature);
                }

                if (col === 0) {
                    // Left axis with improved styling and positioning
                    cell.append("g")
                        .call(axisGenerators[yFeature].y)
                        .call(g => g.select(".domain").attr("stroke", axisColor))
                        .call(g => g.selectAll(".tick line").attr("stroke", axisColor))
                        .call(g => g.selectAll(".tick text")
                            .attr("font-size", "10px")
                            .attr("fill", "#2c3e50"));

                    // Y-axis label with adjusted position
                    cell.append("text")
                        .attr("transform", "rotate(-90)")
                        .attr("x", -size / 2)
                        .attr("y", -labelPadding + 25)  // Adjusted position
                        .attr("text-anchor", "middle")
                        .attr("font-size", "12px")
                        .attr("fill", "#2c3e50")
                        .text(yFeature);
                }
            }
        }
    }

    // Add correlation information with improved styling
    features.forEach((feature1, i) => {
        features.forEach((feature2, j) => {
            if (i !== j) {
                const correlation = calculateCorrelation(data, feature1, feature2);
                const cell = svg.append("g")
                    .attr("transform", `translate(${j * size + padding}, ${i * size + padding})`);
                
                cell.append("text")
                    .attr("x", size - 10)
                    .attr("y", 15)
                    .attr("text-anchor", "end")
                    .attr("font-size", "10px")
                    .attr("fill", "#7f8c8d")
                    .text(`r = ${correlation.toFixed(2)}`);
            }
        });
    });
}

// Helper function to calculate correlation
function calculateCorrelation(data, feature1, feature2) {
    const n = data.length;
    const x = data.map(d => d[feature1]);
    const y = data.map(d => d[feature2]);
    
    const mean1 = x.reduce((a, b) => a + b, 0) / n;
    const mean2 = y.reduce((a, b) => a + b, 0) / n;
    
    const variance1 = x.reduce((a, b) => a + Math.pow(b - mean1, 2), 0);
    const variance2 = y.reduce((a, b) => a + Math.pow(b - mean2, 2), 0);
    
    const covariance = x.reduce((a, b, i) => a + (b - mean1) * (y[i] - mean2), 0);
    
    return covariance / Math.sqrt(variance1 * variance2);
}

function renderKGraph(data,best_k) {
    const width = 800, height = 500;
    const margin = { 
        top: 50, 
        right: 30, 
        bottom: 50, 
        left: 80  // Increased left margin to accommodate y-axis label
    };

    const svg = d3.select("#kmeansPlot")
        .attr("width", width)
        .attr("height", height);

    // Clear previous content
    svg.selectAll("*").remove();
    
    // Create the scales for x and y axes
    const xScale = d3.scaleBand()
        .domain(data.map(d => d.k))
        .range([margin.left, width - margin.right])
        .padding(0.2);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.MSE)])
        .range([height - margin.bottom, margin.top]);

    // Add title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("K-means Clustering Analysis");
    
    const bars = svg.selectAll(".bar")
                .data(data)
                .enter()
                .append("rect")
                .attr("class", "bar")
                .attr("x", d => xScale(d.k))
                .attr("y", d => yScale(d.MSE))
                .attr("width", xScale.bandwidth())
                .attr("height", d => height - margin.bottom - yScale(d.MSE))
                .attr("fill", d => d.k === best_k ? "orange" : "#4d79ff")
                .on("click", function(event, d) {
                    if (selectedK === d.k) {
                        return;
                    }
                    selectedK = d.k;
                    console.log("Selected K value: " + selectedK);
                    
                    bars.attr("fill", d => d.k === selectedK ? "orange" : "#4d79ff");

                    fetch(`/get_clustered_biplot?k=${selectedK}`)
                        .then(response => response.json())
                        .then(data => drawBiplot(data))
                        .catch(error => console.error("Error fetching clustered biplot data:", error));
                });
    
    // Add x-axis with tick labels
    const xAxisGroup = svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale).tickSize(0));
    
    xAxisGroup.selectAll("path")
        .attr("stroke", "none");
    
    const yAxisGroup = svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale).ticks(5));
    
    yAxisGroup.selectAll("path")
        .attr("stroke", "none");
    
    // Add gridlines
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
    
    svg.append("g")
        .attr("class", "grid")
        .selectAll("line")
        .data(data)
        .enter()
        .append("line")
        .attr("x1", d => xScale(d.k) + xScale.bandwidth() / 2)
        .attr("x2", d => xScale(d.k) + xScale.bandwidth() / 2)
        .attr("y1", margin.top)
        .attr("y2", height - margin.bottom)
        .attr("stroke", "#ddd")
        .attr("stroke-dasharray", "2,2");
    
    // Add x-axis label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - margin.bottom / 3)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .text("k (Number of Clusters)");
    
    // Add y-axis label with improved positioning
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", margin.left / 3)
        .attr("x", -(height / 2))
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .text("Mean Squared Error (MSE)");
}

function updateBiplot(selectedPCs) {
    // ... existing code ...
    
    // Add feature vectors (loadings)
    const loadingLines = svg.selectAll('.loading-line')
        .data(loadings)
        .join('line')
        .attr('class', 'loading-line')
        .attr('x1', xScale(0))
        .attr('y1', yScale(0))
        .attr('x2', d => xScale(d[selectedPCs[0] - 1] * 5))
        .attr('y2', d => yScale(d[selectedPCs[1] - 1] * 5))
        .style('stroke', '#2c3e50')
        .style('stroke-width', 1);

    // Add feature labels with improved positioning
    const featureLabels = svg.selectAll('.feature-label')
        .data(loadings)
        .join('text')
        .attr('class', 'feature-label')
        .text((d, i) => features[i])
        .attr('x', d => {
            const x = xScale(d[selectedPCs[0] - 1] * 5.5);
            const baseX = xScale(d[selectedPCs[0] - 1] * 5);
            return x > baseX ? x + 5 : x - 5;
        })
        .attr('y', d => {
            const y = yScale(d[selectedPCs[1] - 1] * 5.5);
            const baseY = yScale(d[selectedPCs[1] - 1] * 5);
            return y > baseY ? y + 5 : y - 5;
        })
        .attr('text-anchor', d => xScale(d[selectedPCs[0] - 1] * 5.5) > xScale(d[selectedPCs[0] - 1] * 5) ? 'start' : 'end')
        .attr('dominant-baseline', d => yScale(d[selectedPCs[1] - 1] * 5.5) > yScale(d[selectedPCs[1] - 1] * 5) ? 'hanging' : 'baseline')
        .style('font-size', '12px')
        .style('fill', '#2d3748')
        .style('font-weight', '500');

    // Add a subtle background to the labels for better readability
    const labelBackgrounds = svg.selectAll('.label-background')
        .data(loadings)
        .join('rect')
        .attr('class', 'label-background')
        .attr('x', function() {
            const label = d3.select(this.parentNode).select('.feature-label');
            const bbox = label.node().getBBox();
            return bbox.x - 2;
        })
        .attr('y', function() {
            const label = d3.select(this.parentNode).select('.feature-label');
            const bbox = label.node().getBBox();
            return bbox.y - 2;
        })
        .attr('width', function() {
            const label = d3.select(this.parentNode).select('.feature-label');
            const bbox = label.node().getBBox();
            return bbox.width + 4;
        })
        .attr('height', function() {
            const label = d3.select(this.parentNode).select('.feature-label');
            const bbox = label.node().getBBox();
            return bbox.height + 4;
        })
        .style('fill', 'rgba(255, 255, 255, 0.8)')
        .style('rx', '3')
        .lower();  // Move backgrounds behind the labels

    // ... existing code ...
}






