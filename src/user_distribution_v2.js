// 水平分段条图：每一行代表一个年份，内部按语言占比分块
function createStackedAreaChart() {
    const margin = { top: 40, right: 160, bottom: 30, left: 80 };
    const width = 900 - margin.left - margin.right;

    // 清空容器
    const container = d3.select("#chart-area");
    container.selectAll("*").remove();

    // tooltip
    const tooltip = container
        .append("div")
        .attr("class", "tooltip")
        .style("position", "fixed")
        .style("visibility", "hidden")
        .style("background", "rgba(0, 0, 0, 0.85)")
        .style("color", "white")
        .style("padding", "10px 14px")
        .style("border-radius", "6px")
        .style("font-size", "13px")
        .style("pointer-events", "none")
        .style("box-shadow", "0 4px 12px rgba(0,0,0,0.3)")
        .style("z-index", "1000");

    d3.csv("data/user_distribution.csv").then((rawData) => {
        const data = rawData.map((d) => ({
            year: +d.year,
            zhCN: +d.zhCN,
            en: +d.en,
            ru: +d.ru,
            es: +d.es,
            pt: +d.pt,
            de: +d.de,
            others: +d.others,
        }));

        const languages = ["zhCN", "en", "ru", "es", "pt", "de", "others"];
        const languageLabels = {
            zhCN: "简体中文",
            en: "英语",
            ru: "俄语",
            es: "西班牙语",
            pt: "葡萄牙语",
            de: "德语",
            others: "其他",
        };

        const color = d3
            .scaleOrdinal()
            .domain(languages)
            .range(["#e15759", "#4e79a7", "#f28e2c", "#76b7b2", "#59a14f", "#edc949", "#af7aa1"]);

        const rowHeight = 32;
        const rowGap = 10;
        const height = data.length * (rowHeight + rowGap) - rowGap;

        const svg = container
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

        const svgGroup = svg
            .append("g")
            .attr("class", "main-group")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear().domain([0, 1]).range([0, width]);
        const y = d3
            .scaleBand()
            .domain(data.map((d) => d.year))
            .range([0, height])
            .paddingInner(0.15);

        const rows = svgGroup
            .selectAll(".year-row")
            .data(data)
            .join("g")
            .attr("class", "year-row")
            .attr("transform", (d) => `translate(0, ${y(d.year)})`);

        rows
            .append("rect")
            .attr("class", "row-bg")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", x(1))
            .attr("height", y.bandwidth())
            .attr("fill", "#111827")
            .attr("opacity", 0.35)
            .attr("rx", 6);

        const segments = rows
            .selectAll(".segment")
            .data((d) => {
                let acc = 0;
                return languages.map((lang) => {
                    const start = acc;
                    const value = d[lang];
                    acc += value;
                    return { lang, start, end: acc, value, year: d.year };
                });
            })
            .join("rect")
            .attr("class", "segment")
            .attr("x", (d) => x(d.start))
            .attr("y", 0)
            .attr("width", (d) => Math.max(x(d.end) - x(d.start), 0))
            .attr("height", y.bandwidth())
            .attr("fill", (d) => color(d.lang))
            .attr("stroke", "#1f2937")
            .attr("stroke-width", 1)
            .attr("opacity", 0.85)
            .style("cursor", "pointer")
            .on("mouseover", function (event, d) {
                d3.select(this)
                    .attr("opacity", 1)
                    .attr("stroke", "white")
                    .attr("stroke-width", 2);

                segments.filter((s) => s.lang !== d.lang)
                    .attr("opacity", 0.35);

                tooltip
                    .style("visibility", "visible")
                    .html(`<strong>${d.year} 年 - ${languageLabels[d.lang]}</strong><br/>占比：${(d.value * 100).toFixed(1)}%`);
            })
            .on("mousemove", function (event) {
                tooltip
                    .style("top", event.clientY + 10 + "px")
                    .style("left", event.clientX + 15 + "px");
            })
            .on("mouseout", function () {
                segments
                    .attr("opacity", 0.85)
                    .attr("stroke", "#1f2937")
                    .attr("stroke-width", 1);

                tooltip.style("visibility", "hidden");
            });

        // 在足够宽的分块上放置标签
        const labelThreshold = 100; // px
        rows
            .selectAll(".segment-label")
            .data((d) => {
                let acc = 0;
                return languages.map((lang) => {
                    const start = acc;
                    const value = d[lang];
                    acc += value;
                    return { lang, start, end: acc, value, year: d.year };
                });
            })
            .join("text")
            .attr("class", "segment-label")
            .attr("x", (d) => x(d.start) + (x(d.end) - x(d.start)) / 2)
            .attr("y", y.bandwidth() / 2 + 5)
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .style("font-size", "12px")
            .style("font-weight", "600")
            .style("pointer-events", "none")
            .style("text-shadow", "0 1px 2px rgba(0,0,0,0.45)")
            .text((d) => {
                const label = `${languageLabels[d.lang]} ${(d.value * 100).toFixed(1)}%`;
                const blockWidth = x(d.end) - x(d.start);
                return blockWidth >= labelThreshold ? label : "";
            });

        const yAxis = svgGroup
            .append("g")
            .attr("class", "y-axis-group")
            .call(d3.axisLeft(y).tickFormat(d3.format("d")));

        yAxis.selectAll("text")
            .attr("fill", "white")
            .style("font-size", "13px");

        const legend = svgGroup
            .append("g")
            .attr("transform", `translate(${width + 20}, 0)`);

        languages.forEach((lang, i) => {
            const legendRow = legend
                .append("g")
                .attr("transform", `translate(0, ${i * 25})`)
                .style("cursor", "pointer")
                .on("mouseover", function () {
                    segments
                        .filter((s) => s.lang === lang)
                        .attr("opacity", 1)
                        .attr("stroke", "white")
                        .attr("stroke-width", 2);

                    segments
                        .filter((s) => s.lang !== lang)
                        .attr("opacity", 0.35);

                    d3.select(this).select("rect")
                        .attr("opacity", 1)
                        .attr("stroke", "white")
                        .attr("stroke-width", 2);

                    d3.select(this).select("text")
                        .style("font-weight", "bold");
                })
                .on("mouseout", function () {
                    segments
                        .attr("opacity", 0.85)
                        .attr("stroke", "#1f2937")
                        .attr("stroke-width", 1);

                    d3.select(this).select("rect")
                        .attr("opacity", 0.8)
                        .attr("stroke", "none");

                    d3.select(this).select("text")
                        .style("font-weight", "normal");
                });

            legendRow
                .append("rect")
                .attr("width", 18)
                .attr("height", 18)
                .attr("fill", color(lang))
                .attr("opacity", 0.8)
                .attr("rx", 3);

            legendRow
                .append("text")
                .attr("x", 25)
                .attr("y", 14)
                .attr("fill", "white")
                .style("font-size", "13px")
                .text(languageLabels[lang]);
        });

        svgGroup
            .append("text")
            .attr("x", width / 2)
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .style("font-size", "18px")
            .style("font-weight", "bold")
            .text("各语言用户占比（按年份分行）");
    });
}

// 页面加载时自动绘制
createStackedAreaChart();
