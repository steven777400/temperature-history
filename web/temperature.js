'use strict';

const resizeSVG = () => {
    const marginX = window.innerWidth < 800 ? 20 : 50;
    const marginY = window.innerHeight < 800 ? 20 : 50;
    const svg = d3.select("svg");
    svg
        .attr("width", window.innerWidth - marginX * 2)
        .attr("height", window.innerHeight - marginY * 2)
        .style("margin-left", marginX)
        .style("margin-top", marginY);
  
};

window.addEventListener('resize', event => {
    resizeSVG();
});

const run = () => {
    let data, xt, suppressFurtherLoads = false, instFadeOut;

    const spinner = new Spinner();
    if ('ontouchstart' in document.documentElement)
        document.getElementsByTagName("h3")[0].textContent = "Pinch to zoom, drag to scroll";

    const doInstFadeOut = () => {
        if (!instFadeOut)
            instFadeOut = d3.select("h3")
                .transition().duration(2000).style("opacity", 0);
    };

    const setData = newdata => {
        data = newdata;

        x.domain(d3.extent(data, d => d.date));

        areag.datum(data);
        pathg.datum(data);
    };

    const mousemove = () => {
        if (!data) return;
        doInstFadeOut();

        focus.style("display", null);
        const bisectDate = d3.bisector(d => d.date).left;
        const x0 = xt.invert(d3.mouse(document.getElementById("maing"))[0]),
            i = bisectDate(data, x0, 1),
            d0 = data[i - 1],
            d1 = data[i];

        let d;
        if (d1) d = x0 - d0.date > d1.date - x0 ? d1 : d0; else d = d0;

        focus.attr("transform", `translate(${xt(d.date)},${y(d.value)})`);
        focus.select("text").html(`${d.value} &deg;F @ ${focusDateFormat(d.date)}`);
    };


    const focusDateFormat = d => d3.timeFormat("%I:%M %p")(d);


    const zoomed = () => {        
        focus.style("display", "none");
        const t = d3.event.transform;
        if (d3.event.sourceEvent) /* zoomed fires on each day load, initially twice, don't count those */
            doInstFadeOut();

        xt = t.rescaleX(x);

        g.select(".area").attr("d", area.x(d => xt(d.date)));
        g.select(".line").attr("d", line.x(d => xt(d.date)));

        g.select(".axis--x").call(xAxis.scale(xt));

        if (xt.domain()[0] <= x.domain()[0] && !suppressFurtherLoads) {
            suppressFurtherLoads = true;
            const od = xt.domain()[0];
            let date = new Date(od.getFullYear(), od.getMonth(), od.getDate());
            date.setDate(date.getDate() - 1);
            const d0 = xt.domain()[0];
            const d1 = xt.domain()[1];
            loadDay(date)
                .then(newdata => {
                    setData(newdata.concat(data));
                    svg.call(zoom)
                        .call(zoom.transform, d3.zoomIdentity
                            .scale(width / (x(d1) - x(d0)))
                            .translate(-x(d0), 0));
                    suppressFurtherLoads = false;
                });

        }
    };


    const loadDay = day =>
        new Promise((resolve, reject) => {

            spinner.spin(document.getElementById("ssvg"));
            const begin = new Date(day.getFullYear(), day.getMonth(), day.getDate());
            let delta = 0, localdata = [];
            const oReq = new XMLHttpRequest();
            oReq.open("GET", "data/" + d3.timeFormat("%Y%m%d")(begin) + ".bin", true);
            oReq.responseType = "arraybuffer";

            oReq.onload = oEvent => {
                if (oReq.status >= 200 && oReq.status < 300) {
                    delta = 0;
                    const arrayBuffer = oReq.response; // Note: not oReq.responseText
                    if (arrayBuffer) {
                        const byteArray = new Uint8Array(arrayBuffer);
                        for (let i = 0; i < byteArray.byteLength; i++) {                            
                            const val = new Date(begin.getTime() + delta);
                            // Bytes are stored 1 per minute, so increment 1 minute
                            delta += 60 * 1000;
                            // Bytes are stored as degF * 2, so divide by 2 to restore actual value
                            localdata.push({ date: val, value: byteArray[i] / 2.0 });
                        }

                        spinner.stop();
                        resolve(localdata);
                    }
                } else {
                    spinner.stop();
                    reject({
                        status: oReq.status,
                        statusText: oReq.statusText
                    });

                }
            };
            oReq.onerror = () => {
                spinner.stop();
                reject({
                    status: oReq.status,
                    statusText: oReq.statusText
                });
            };

            oReq.send(null);
        });


    const svg = d3.select("svg"),
        margin = { top: 30, right: 30, bottom: 30, left: 30 },
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom;

    const x = d3.scaleTime().range([0, width]),
        y = d3.scaleLinear().range([height, 0]).domain([40, 100]);

    const xAxis = d3.axisBottom(x),
        yAxis = d3.axisLeft(y),
        yAxisR = d3.axisRight(y);

    const zoom = d3.zoom()
        .scaleExtent([1, 32])
        .translateExtent([[0, 0], [width, height]])
        .extent([[0, 0], [width, height]])
        .on("zoom", zoomed);

    const area = d3.area()
        .curve(d3.curveMonotoneX)
        .x(d => x(d.date))
        .y0(height)
        .y1(d => y(d.value));


    const line = d3.line()
        .curve(d3.curveMonotoneX)
        .x(d => x(d.date))
        .y(d => y(d.value));


    const g = d3.select("#maing")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const areag = d3.select("#graph").append("path")
          .datum([])
          .attr("class", "area")
          .attr("d", area);

    const pathg = d3.select("#graph").append("path")
          .datum([])
          .attr("class", "line")
          .attr("d", line);

    const focus = d3.select("g.focus");

    xt = x;
    g.append("g")
          .attr("class", "axis axis--x")
          .attr("transform", `translate(0,${height})`)
          .call(xAxis);

    g.append("g")
        .attr("class", "axis axis--y")
        .call(yAxis);

    g.append("g")
        .attr("class", "axis axis--y")
        .attr("transform", `translate(${width}, 0)`)
        .call(yAxisR);

    d3.select("#clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

    d3.select("#gradient")
        .attr("y1", y(40))
        .attr("y2", y(100));


    svg.on("mouseover", () => { focus.style("display", null); })
        .on("mouseout", () => { focus.style("display", "none"); })
        .on("mousemove", mousemove);





    resizeSVG();
    let date = new Date();
    date.setDate(date.getDate() - 1);
    loadDay(date)
        .then(setData)
        .then(() => {
            const d0 = x.domain()[0],
                d1 = x.domain()[1];

            svg.call(zoom)
                .call(zoom.transform, d3.zoomIdentity
                    .scale(width / (x(d1) - x(d0)))
                    .translate(-x(d0), 0));
        })
        .then(() => {
            setTimeout(doInstFadeOut, 3000);
        });


};


