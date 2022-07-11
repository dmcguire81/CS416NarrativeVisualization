function averageOverMake(makes, data) {
    var averagedData = makes.map(m => {
        const makeData = data.filter(d => { return d.Make == m; });
        const meanAverageCityMPG = d3.mean(makeData.map(d => { return d.AverageCityMPG; }));
        const meanAverageHighwayMPG = d3.mean(makeData.map(d => { return d.AverageHighwayMPG; }));

        return {
            Make: m,
            EngineCylinders: d3.mean(makeData.map(d => { return d.EngineCylinders; })),
            AverageCityMPG: meanAverageCityMPG,
            AverageHighwayMPG: meanAverageHighwayMPG,
            AverageCombinedMPG: (meanAverageCityMPG + meanAverageHighwayMPG) / 2.0,
        };
    });

    return averagedData;
}

async function init() {
    // Set the default parameters
    var scene = 1;
    var measure = "AverageCityMPG";
    var selectedFuel = ["Diesel", "Electricity", "Gasoline"];
    var cylinderRange = [0, 12];

    //Read the raw data and extract the unique car makes
    const rawData = await d3.csv("https://flunky.github.io/cars2017.csv");
    const makes = [...new Set(rawData.map(d => { return d.Make; }))];

    // set the dimensions and margins of the graph
    const margin = { top: 10, right: 150, bottom: 40, left: 100 };
    const width = 1100 - margin.left - margin.right;
    const height = 650 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    var svg = d3.select("#narrative_visualization")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // Process data according to parameters
    const inSelectedFuel = d => { return selectedFuel.includes(d.Fuel); };
    const inCylinderRange = d => { return d.EngineCylinders >= cylinderRange[0] && d.EngineCylinders <= cylinderRange[1]; };
    const filteredData = rawData.filter(inSelectedFuel).filter(inCylinderRange);
    var data = averageOverMake(makes, filteredData);
    data.sort((a, b) => { return a[measure] - b[measure]; });

    // Add X axis
    var x = d3.scaleLinear()
        .domain([0, 150])
        .range([0, width]);
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x).tickSize(-height * 1.3))
        .select(".domain").remove();

    // Add Y axis
    var y = d3.scaleBand()
        .domain(data.map(d => { return d.Make; }))
        .range([height, 0]);
    svg.append("g")
        .call(d3.axisLeft(y))
        .select(".domain").remove();

    // Add X axis label:
    const measureLabel = measure.replace(/([a-z])([A-Z])/g, '$1 $2');
    var xLabel = svg.append("text")
        .attr("text-anchor", "end")
        .attr("x", width)
        .attr("y", height + margin.top + 20)
        .text(measureLabel);

    // Y axis label:
    svg.append("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -margin.top)
        .text("Make");

    // Color scale: light blue (0 Cylinders) to dark blue (12 Cylinders)
    var color = d3.scaleLinear()
        .domain(cylinderRange)
        .range(["lightblue", "darkblue"]);

    // Add bars
    svg.append('g')
        .selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", () => { return 0; })
        .attr("y", d => { return y(d.Make); })
        .attr("height", y.bandwidth())
        .attr("width", d => { return x(d[measure]); })
        .style("fill", d => { return color(d.EngineCylinders) });

    // Add legend
    legendWidth = 30;
    svg.append("g")
        .attr("class", "legendLinear")
        .attr("transform", "translate(" + (margin.left + width - 0.5 * margin.right) + "," + margin.top + ")");

    var legendLinear = d3.legendColor()
        .shapeWidth(legendWidth)
        .cells(13)
        .orient('vertical')
        .title("Engine Cylinders")
        .labelFormat(d3.format(".0f"))
        .scale(color);

    svg.select(".legendLinear")
        .call(legendLinear);

    // Features of the annotation
    const annotations = [
        {
            note: {
                label: "Tesla appears dominant in " + measureLabel,
                title: "Dominant"
            },
            x: 350,
            y: 10,
            dy: 50,
            dx: 50
        }
    ];

    // Add annotation to the chart
    const makeAnnotations = d3.annotation()
        .annotations(annotations);
    svg
        .append("g")
        .call(makeAnnotations);        

    // Add Engine Cylinders slider
    var sliderRange = d3.sliderBottom()
        .min(0)
        .max(12)
        .width(300)
        .tickFormat(d3.format('2.0f'))
        .ticks(13)
        .default([0, 12])
        .fill('#2196f3');
    
    sliderRange
        .on('end', range => {
            if (scene < 4) {
                sliderRange.silentValue([0, 12]);
                return;
            }

            cylinderRange = range;
            update(cylinderRange, selectedFuel, measure);
        });
    
    var gRange = d3.select('div#slider-range')
        .append('svg')
        .attr('width', 500)
        .attr('height', 100)
        .append('g')
        .attr('transform', 'translate(30,30)');
    
    gRange.call(sliderRange);

    d3.select("form#checkbox-selection")
        .selectAll(("input"))
        .on("change", function() {
            if (this.checked) {
                selectedFuel = selectedFuel.filter(d => { return d != this.value; });
            }
            else
            {
                selectedFuel.push(this.value);
                selectedFuel.sort();
            }
            update(cylinderRange, selectedFuel, measure);
        });

    d3.select("select#dropdown-selection")
        .on("change", function() {
            measure = this.value;
            update(cylinderRange, selectedFuel, measure);
        });

    d3.select("button#arrow-previous")
        .on("click", function() {
            scene -= 1;

            d3.select("button#arrow-next")
                .property("disabled", false);

            if (scene < 4) {
                cylinderRange = [0, 12];
                sliderRange.value(cylinderRange);

                selectedFuel = ["Electricity"];
                d3.select("form#checkbox-selection")
                    .select("input[value=Diesel]")
                    .property("checked", true);
                d3.select("form#checkbox-selection")
                    .select("input[value=Gasoline]")
                    .property("checked", true);
            }

            if (scene < 3) {
                measure = "AverageHighwayMPG";
                d3.select("select#dropdown-selection")
                    .select("option[value=" + measure + "]")
                    .property("selected", true);

                selectedFuel = ["Diesel", "Electricity", "Gasoline"];
                d3.select("form#checkbox-selection")
                    .selectAll("input")
                    .property("disabled", true)
                    .property("checked", false);
            }

            if (scene < 2) {
                measure = "AverageCityMPG";
                d3.select("select#dropdown-selection")
                    .selectAll("option")
                    .property("disabled", true)
                    .property("selected", false);
                d3.select("select#dropdown-selection")
                    .select("option[value=" + measure + "]")
                    .property("selected", true);
            }

            if (scene == 1) {
                this.disabled = true;
            }

            update(cylinderRange, selectedFuel, measure);
        });

    d3.select("button#arrow-next")
        .on("click", function() {
            scene += 1;

            d3.select("button#arrow-previous")
                .property("disabled", false);

            if (scene >= 2) {
                d3.select("select#dropdown-selection")
                    .selectAll("option")
                    .property("disabled", false);
                measure = "AverageHighwayMPG";
                d3.select("select#dropdown-selection")
                    .select("option[value=" + measure + "]")
                    .property("selected", true);
            }

            if (scene >= 3) {
                measure = "AverageCombinedMPG";
                d3.select("select#dropdown-selection")
                    .select("option[value=" + measure + "]")
                    .property("selected", true);

                d3.select("form#checkbox-selection")
                    .selectAll("input")
                    .property("disabled", false);

                selectedFuel = ["Electricity"];
                d3.select("form#checkbox-selection")
                    .select("input[value=Diesel]")
                    .property("checked", true);
                d3.select("form#checkbox-selection")
                    .select("input[value=Gasoline]")
                    .property("checked", true);
            }

            if (scene == 4) {
                this.disabled = true;

                selectedFuel = ["Diesel", "Electricity", "Gasoline"];
                d3.select("form#checkbox-selection")
                    .selectAll("input")
                    .property("checked", false);

                cylinderRange = [0, 4];
                sliderRange.value(cylinderRange);
            }

            update(cylinderRange, selectedFuel, measure);
        });

    function update(cylinderRange, selectedFuel, measure) {
        // Process data according to parameters
        const inSelectedFuel = d => { return selectedFuel.includes(d.Fuel); };
        const inCylinderRange = d => { return d.EngineCylinders >= cylinderRange[0] && d.EngineCylinders <= cylinderRange[1]; };
        const filteredData = rawData.filter(inSelectedFuel).filter(inCylinderRange);
        var data = averageOverMake(makes, filteredData);

        // Update bars
        updateBars = svg.selectAll(".bar")
            .data(data);
        
        updateBars
            .enter()
            .append("rect")
            .merge(updateBars)
            .transition()
            .duration(1000)
                .attr("class", "bar")
                .attr("x", () => { return 0; })
                .attr("y", d => { return y(d.Make); })
                .attr("height", y.bandwidth())
                .attr("width", d => { return x(d[measure]); })
                .style("fill", d => { return color(d.EngineCylinders) });

        // Update label
        const measureLabel = measure.replace(/([a-z])([A-Z])/g, '$1 $2');
        xLabel.text(measureLabel);
    }

    update(cylinderRange, selectedFuel, measure);
}
