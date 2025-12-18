// 中国客户端游戏市场情况可视化
const createRevenueChart = () => {
    const container = d3.select("#chart-revenue");
    container.selectAll("*").remove();

    const margin = { top: 40, right: 80, bottom: 60, left: 80 };
    const width = 900 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = container
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // 加载数据
    d3.csv("data/revenue.csv").then((data) => {
        // 数据解析
        data.forEach((d) => {
            d.year = d.year;
            d.actual_revenue = +d.actual_revenue;
            d.num_games = +d.num_games;
            d.growth_rate = +d.growth_rate;
        });

        console.log("Revenue data loaded:", data);

        // X轴比例尺
        const xScale = d3
            .scaleBand()
            .domain(data.map((d) => d.year))
            .range([0, width])
            .padding(0.3);

        // 左Y轴比例尺 - 实际收入(亿元)
        const yScaleLeft = d3
            .scaleLinear()
            .domain([0, d3.max(data, (d) => d.actual_revenue) * 1.1])
            .range([height, 0]);

        // 右Y轴比例尺 - 增长率(%)
        const yScaleRight = d3
            .scaleLinear()
            .domain([d3.min(data, (d) => d.growth_rate) - 10, d3.max(data, (d) => d.growth_rate) * 1.1])
            .range([height, 0]);

        // 颜色比例尺 - 游戏发售量越多颜色越深
        const colorScale = d3
            .scaleSequential()
            .domain([0, d3.max(data, (d) => d.num_games)])
            .interpolator(d3.interpolateOranges);

        // 添加标题
        svg
            .append("text")
            .attr("x", width / 2)
            .attr("y", -20)
            .attr("text-anchor", "middle")
            .style("font-size", "20px")
            .style("font-weight", "bold")
            .style("fill", "#ffffff")
            .style("text-shadow", "0 0 10px rgba(56, 189, 248, 0.5)")
            .text("中国买断制游戏市场实际收入及增长率");

        // 绘制柱状图 - 实际收入
        svg
            .selectAll(".bar")
            .data(data)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", (d) => xScale(d.year))
            .attr("y", (d) => yScaleLeft(d.actual_revenue))
            .attr("width", xScale.bandwidth())
            .attr("height", (d) => height - yScaleLeft(d.actual_revenue))
            .attr("fill", (d) => colorScale(d.num_games))
            .attr("opacity", 0.9)
            .on("mouseover", function (event, d) {
                d3.select(this).attr("opacity", 1).attr("stroke", "#fff").attr("stroke-width", 1);
                showTooltip(event, d, "revenue");
            })
            .on("mouseout", function () {
                d3.select(this).attr("opacity", 0.9).attr("stroke", "none");
                hideTooltip();
            });

        // 绘制增长率折线
        const line = d3
            .line()
            .x((d) => xScale(d.year) + xScale.bandwidth() / 2)
            .y((d) => yScaleRight(d.growth_rate));

        svg
            .append("path")
            .datum(data)
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke", "#ff69b4")
            .attr("stroke-width", 2.5)
            .attr("d", line);

        // 绘制增长率数据点
        svg
            .selectAll(".dot")
            .data(data)
            .enter()
            .append("circle")
            .attr("class", "dot")
            .attr("cx", (d) => xScale(d.year) + xScale.bandwidth() / 2)
            .attr("cy", (d) => yScaleRight(d.growth_rate))
            .attr("r", 5)
            .attr("fill", "#ff69b4")
            .attr("stroke", "#fff")
            .attr("stroke-width", 2)
            .on("mouseover", function (event, d) {
                d3.select(this).attr("r", 7);
                showTooltip(event, d, "growth");
            })
            .on("mouseout", function () {
                d3.select(this).attr("r", 5);
                hideTooltip();
            });


        // X轴
        const xAxis = svg
            .append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale))
            .style("font-size", "12px");

        xAxis.selectAll("text").style("fill", "#ffffff");
        xAxis.selectAll(".domain, .tick line").style("stroke", "rgba(255, 255, 255, 0.3)");

        // 左Y轴 - 实际收入
        const yAxisLeft = svg
            .append("g")
            .call(d3.axisLeft(yScaleLeft).ticks(8))
            .style("font-size", "12px");

        yAxisLeft.selectAll("text").style("fill", "#ffffff");
        yAxisLeft.selectAll(".domain, .tick line").style("stroke", "rgba(255, 255, 255, 0.3)");

        // 左Y轴标签
        svg
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -55)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .style("font-weight", "600")
            .style("fill", "#ffffff")
            .text("实际收入 (亿元)");

        // 右Y轴 - 增长率
        const yAxisRight = svg
            .append("g")
            .attr("transform", `translate(${width},0)`)
            .call(d3.axisRight(yScaleRight).ticks(8).tickFormat(d => d + "%"))
            .style("font-size", "12px");

        yAxisRight.selectAll("text").style("fill", "#ffffff");
        yAxisRight.selectAll(".domain, .tick line").style("stroke", "rgba(255, 255, 255, 0.3)");

        // 右Y轴标签
        svg
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", width + 55)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .style("font-weight", "600")
            .style("fill", "#ffffff")
            .text("增长率 (%)");

        // 图例
        const legend = svg
            .append("g")
            .attr("transform", `translate(${width - 220}, 10)`);

        // 实际收入图例
        legend
            .append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 20)
            .attr("height", 15)
            .attr("fill", "#f28e2c")
            .attr("opacity", 0.8);

        legend
            .append("text")
            .attr("x", 28)
            .attr("y", 12)
            .style("font-size", "12px")
            .style("fill", "#ffffff")
            .text("实际收入 (颜色深浅代表发售量)");

        // 增长率图例
        legend
            .append("line")
            .attr("x1", 0)
            .attr("x2", 20)
            .attr("y1", 30)
            .attr("y2", 30)
            .attr("stroke", "#ff69b4")
            .attr("stroke-width", 2.5);

        legend
            .append("circle")
            .attr("cx", 10)
            .attr("cy", 30)
            .attr("r", 4)
            .attr("fill", "#ff69b4")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5);

        legend
            .append("text")
            .attr("x", 28)
            .attr("y", 35)
            .style("font-size", "12px")
            .style("fill", "#ffffff")
            .text("增长率");

        // Tooltip
        const tooltip = d3
            .select("body")
            .append("div")
            .attr("class", "tooltip-revenue")
            .style("position", "fixed")
            .style("visibility", "hidden")
            .style("background-color", "rgba(0, 0, 0, 0.85)")
            .style("color", "#fff")
            .style("padding", "10px 14px")
            .style("border-radius", "6px")
            .style("font-size", "13px")
            .style("pointer-events", "none")
            .style("z-index", "1000")
            .style("backdrop-filter", "blur(4px)");

        function showTooltip(event, d, type) {
            let html = `<strong>${d.year}年</strong><br/>`;
            html += `实际收入: <span style="color:#f28e2c;font-weight:bold">${d.actual_revenue.toFixed(2)} 亿元</span><br/>`;
            html += `增长率: <span style="color:#ff69b4;font-weight:bold">${d.growth_rate}%</span><br/>`;
            html += `游戏发售量: ${d.num_games}`;
            tooltip.html(html).style("visibility", "visible");
            updateTooltipPosition(event);
        }

        function updateTooltipPosition(event) {
            tooltip
                .style("left", event.clientX + 15 + "px")
                .style("top", event.clientY + 10 + "px");
        }

        function hideTooltip() {
            tooltip.style("visibility", "hidden");
        }

        // 鼠标移动时更新tooltip位置
        container.on("mousemove", function (event) {
            if (tooltip.style("visibility") === "visible") {
                updateTooltipPosition(event);
            }
        });
    });
};

// 页面加载后创建图表
createRevenueChart();
