document.addEventListener("DOMContentLoaded", function () {
    fetch('/data')  // Fetch PCA eigenvalues from Flask
        .then(response => response.json())
        .then(data => drawScreePlot(data))
        .catch(error => console.error("Error loading data:", error));
        
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
        .attr("fill", "red") // Highlight color
        .attr("stroke", "black")
        .attr("stroke-width", 1);

    // Label for the cumulative variance line
    svg.append("text")
        .attr("x", width - margin.right - 50)
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
