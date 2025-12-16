// 全局状态：当前选中的年份（null 表示显示堆叠图）
let currentSelectedYear = null;

// 堆叠面积图：各语言用户占比随年份变化
function createStackedAreaChart() {
    const margin = { top: 40, right: 120, bottom: 70, left: 60 };
    const width = 900 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // 清空容器并创建 SVG
    const container = d3.select("#chart-area");
    container.selectAll("*").remove();

    // 创建 tooltip
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

    const svg = container
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("class", "main-group")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // 加载数据
    d3.csv("data/user_distribution.csv").then((rawData) => {
        console.log("原始数据:", rawData);

        // 数据预处理：转换年份为数字，提取语言列
        const data = rawData.map((d) => ({
            year: +d["year"],
            zhCN: +d["zhCN"],
            en: +d["en"],
            ru: +d["ru"],
            es: +d["es"],
            pt: +d["pt"],
            de: +d["de"],
            others: +d["others"],
        }));

        console.log("处理后数据:", data);

        // 语言列表（用于堆叠）- 必须匹配 data 对象的键名
        const languages = ["zhCN", "en", "ru", "es", "pt", "de", "others"];
        const languageLabels = {
            zhCN: "简体中文",
            en: "英语",
            ru: "俄语",
            es: "西班牙语",
            pt: "葡萄牙语",
            de: "德语",
            others: "其他"
        };

        // 配色方案
        const color = d3
            .scaleOrdinal()
            .domain(languages)
            .range(["#e15759", "#4e79a7", "#f28e2c", "#76b7b2", "#59a14f", "#edc949", "#af7aa1"]);

        // 堆叠数据
        const stack = d3.stack().keys(languages);
        const series = stack(data);

        console.log("堆叠数据:", series);

        // 比例尺
        const x = d3
            .scaleLinear()
            .domain(d3.extent(data, (d) => d.year))
            .range([0, width]);

        const y = d3
            .scaleLinear()
            .domain([0, 1]) // 占比总和为 1
            .range([height, 0]);

        // 面积生成器
        const area = d3
            .area()
            .x((d) => x(d.data.year))
            .y0((d) => y(d[0]))
            .y1((d) => y(d[1]))
            .curve(d3.curveMonotoneX);

        // 绘制堆叠面积
        const paths = svg
            .selectAll(".layer")
            .data(series)
            .join("path")
            .attr("class", "layer")
            .attr("d", area)
            .attr("fill", (d) => color(d.key))
            .attr("opacity", 0.75)
            .attr("stroke", "#1f2937")
            .attr("stroke-width", 0.5)
            .style("cursor", "pointer")
            .style("transition", "opacity 0.2s ease, stroke-width 0.2s ease")
            .on("mouseover", function (event, d) {
                // 突出显示当前区域
                d3.select(this)
                    .attr("opacity", 1)
                    .attr("stroke-width", 2)
                    .attr("stroke", "white");

                // 降低其他区域透明度
                paths.filter(layer => layer.key !== d.key)
                    .attr("opacity", 0.3);

                // 显示 tooltip
                const lang = languageLabels[d.key];
                tooltip
                    .style("visibility", "visible")
                    .html(`<strong>${lang}</strong><br/>`);
            })
            .on("mousemove", function (event) {
                tooltip
                    .style("top", (event.clientY + 10) + "px")
                    .style("left", (event.clientX + 15) + "px");
            })
            .on("mouseout", function () {
                // 恢复所有区域
                paths
                    .attr("opacity", 0.75)
                    .attr("stroke-width", 0.5)
                    .attr("stroke", "#1f2937");

                tooltip.style("visibility", "hidden");
            });

        console.log("绘制的路径数量:", paths.size());
        console.log("第一个路径的d属性:", paths.attr("d"));

        // X 轴
        const xAxis = svg
            .append("g")
            .attr("class", "x-axis-group")
            .attr("transform", `translate(0,${height})`)
            .call(
                d3
                    .axisBottom(x)
                    .ticks(data.length)
                    .tickFormat(d3.format("d"))
            );

        // 给 X 轴的年份标签添加点击事件
        xAxis.selectAll(".tick text")
            .style("cursor", "pointer")
            .style("font-weight", "normal")
            .style("transition", "all 0.2s ease")
            .on("mouseover", function () {
                d3.select(this)
                    .style("fill", "#38bdf8")
                    .style("font-weight", "bold")
                    .style("font-size", "13px");
            })
            .on("mouseout", function (event, d) {
                const year = Math.round(d);
                // 如果是当前选中的年份，保持高亮
                if (year === currentSelectedYear) {
                    d3.select(this)
                        .style("fill", "#38bdf8")
                        .style("font-weight", "bold")
                        .style("font-size", "13px");
                } else {
                    d3.select(this)
                        .style("fill", "white")
                        .style("font-weight", "normal")
                        .style("font-size", "11px");
                }
            })
            .on("click", function (event, d) {
                const year = Math.round(d);
                console.log(`点击年份: ${year}`);

                // 如果点击的是当前选中的年份，返回堆叠图
                if (year === currentSelectedYear) {
                    currentSelectedYear = null;
                    createStackedAreaChart();
                } else {
                    // 否则显示该年份的树图
                    currentSelectedYear = year;
                    if (typeof createTreemapByYear === 'function') {
                        createTreemapByYear(year, x, height, margin);
                    } else {
                        console.error('createTreemapByYear 函数未定义');
                    }
                }
            });

        xAxis
            .append("text")
            .attr("x", width / 2)
            .attr("y", 40)
            .attr("fill", "white")
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .text("年份（点击查看详情）");

        // Y 轴
        svg
            .append("g")
            .call(d3.axisLeft(y).tickFormat(d3.format(".0%")))
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -40)
            .attr("fill", "white")
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .text("用户占比");

        // 图例
        const legend = svg
            .append("g")
            .attr("transform", `translate(${width + 20}, 0)`);

        languages.forEach((lang, i) => {
            const legendRow = legend
                .append("g")
                .attr("transform", `translate(0, ${i * 25})`)
                .style("cursor", "pointer")
                .on("mouseover", function () {
                    // 突出显示对应的面积
                    paths.filter(d => d.key === lang)
                        .attr("opacity", 1)
                        .attr("stroke-width", 2)
                        .attr("stroke", "white");

                    paths.filter(d => d.key !== lang)
                        .attr("opacity", 0.3);

                    // 突出显示图例项
                    d3.select(this).select("rect")
                        .attr("opacity", 1)
                        .attr("stroke", "white")
                        .attr("stroke-width", 2);

                    d3.select(this).select("text")
                        .style("font-weight", "bold");
                })
                .on("mouseout", function () {
                    // 恢复所有
                    paths
                        .attr("opacity", 0.75)
                        .attr("stroke-width", 0.5)
                        .attr("stroke", "#1f2937");

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

        // 标题
        svg
            .append("text")
            .attr("x", width / 2)
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .style("font-size", "18px")
            .style("font-weight", "bold")
            .text("各语言用户占比变化（2017-2025）");
    });
}

// 页面加载时自动绘制堆叠面积图
createStackedAreaChart();
