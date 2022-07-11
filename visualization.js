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
    // Set the static parameters
    var measure = "AverageCityMPG";
    var selectedFuel = ["Diesel", "Electricity", "Gasoline"];
    var cylinderRange = [0, 12];

    //Read the raw data and extract the unique car makes
    const rawData = await d3.csv("https://flunky.github.io/cars2017.csv");
    const makes = [...new Set(rawData.map(d => { return d.Make; }))];

    // set the dimensions and margins of the graph
    const margin = { top: 10, right: 100, bottom: 40, left: 100 };
    const width = 800 - margin.left - margin.right;
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
    svg.append("text")
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
        .attr("transform", "translate(" + (width - legendWidth) + "," + margin.top + ")");

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
    const formatSliderLabel = range => { 
        return "Engine Cylinders - (" +
            range
                .map(d3.format('1.0f'))
                .join(' - ')
            + ")"
    };
    var sliderRange = d3.sliderBottom()
        .min(0)
        .max(12)
        .width(300)
        .tickFormat(d3.format('2.0f'))
        .ticks(13)
        .default([0, 12])
        .fill('#2196f3')
        .on('end', range => {
            cylinderRange = range;
            d3.select('p#slider-label').text(
                formatSliderLabel(cylinderRange)
            );
            update(cylinderRange, selectedFuel);
        });
    
    var gRange = d3.select('div#slider-range')
        .append('svg')
        .attr('width', 500)
        .attr('height', 100)
        .append('g')
        .attr('transform', 'translate(30,30)');
    
    gRange.call(sliderRange);
    
    d3.select('p#slider-label').text(
        formatSliderLabel(sliderRange.value())
    );

    d3.select("form#checkbox-selection")
        .selectAll(("input")).on("change", function() {
            if (this.checked) {
                selectedFuel = selectedFuel.filter(d => { return d != this.value; });
            }
            else
            {
                selectedFuel.push(this.value);
                selectedFuel.sort();
            }
            update(cylinderRange, selectedFuel);
        });

    d3.select('p#checkbox-label').text(
        "Exclude Fuel Type:"
    );

    function update(cylinderRange, selectedFuel) {
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
    }

    update(cylinderRange, selectedFuel);
}
