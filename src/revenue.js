// src/revenue.js

export const createRevenueChart = (data) => {
    const container = d3.select("#revenue-chart");
    if (container.empty()) return null;

    // --- 1. Tooltip 初始化 ---
    let tooltip = d3.select(".revenue-dedicated-tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div")
            .attr("class", "revenue-dedicated-tooltip");
    }

    container.selectAll("*").remove();

    // --- 2. 尺寸计算 (保持顶部空间容纳标题和图例) ---
    const containerRect = container.node().getBoundingClientRect();
    const width = containerRect.width || 800;
    const height = containerRect.height || 600;
    const margin = { top: 100, right: 100, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // --- 3. 数据处理与比例尺 ---
    data.forEach(d => {
        d.actual_revenue = +d.actual_revenue;
        d.growth_rate = +d.growth_rate;
        d.num_games = +d.num_games;
    });

    const xScale = d3.scaleBand()
        .domain(data.map(d => d.year))
        .range([0, innerWidth])
        .padding(0.3);

    const yScaleLeft = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.actual_revenue) * 1.1])
        .range([innerHeight, 0]);

    const yScaleRight = d3.scaleLinear()
        .domain([d3.min(data, d => d.growth_rate) - 10, d3.max(data, d => d.growth_rate) * 1.1])
        .range([innerHeight, 0]);

    /**
     * 核心修改：颜色映射逻辑 (橙色主调)
     * 通过向两侧延伸 domain (原本是 min 到 max)，
     * 使得实际数据的颜色落在渐变带的中部，从而缩小深浅的对比范围。
     */
    const gamesExtent = d3.extent(data, d => d.num_games);
    const colorScale = d3.scaleSequential()
        .domain([gamesExtent[0] - 500, gamesExtent[1] + 800]) // 扩大输入定义域以收窄颜色感官跨度
        .interpolator(d3.interpolateOranges);

    // --- 4. 标题居中绘制 ---
    svg.append("text")
        .attr("class", "chart-title")
        .attr("x", innerWidth / 2)
        .attr("y", -70)
        .attr("text-anchor", "middle")
        .style("fill", "#fff")
        .style("font-size", "1.4rem")
        .style("font-weight", "bold")
        .text("中国买断制游戏市场趋势");

    // --- 5. 右上角垂直图例绘制 ---
    const legendGroup = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${innerWidth - 120}, -85)`);

    // 5.1 第一行：销售额
    const row1 = legendGroup.append("g").attr("transform", "translate(0, 0)");
    row1.append("rect")
        .attr("width", 12).attr("height", 12)
        .attr("fill", "#fdae6b").attr("rx", 2);
    row1.append("text")
        .attr("x", 20).attr("y", 11)
        .style("fill", "#aaa").style("font-size", "12px")
        .text("销售额(亿)");

    // 5.2 第二行：增长率
    const row2 = legendGroup.append("g").attr("transform", "translate(0, 22)");
    row2.append("line")
        .attr("x1", 0).attr("y1", 6).attr("x2", 15).attr("y2", 6)
        .attr("stroke", "#ff69b4").attr("stroke-width", 2);
    row2.append("circle")
        .attr("cx", 7.5).attr("cy", 6).attr("r", 3)
        .attr("fill", "#fff").attr("stroke", "#ff69b4");
    row2.append("text")
        .attr("x", 20).attr("y", 11)
        .style("fill", "#aaa").style("font-size", "12px")
        .text("增长率(%)");

    // 5.3 第三行：发售量 (渐变条)
    const row3 = legendGroup.append("g").attr("transform", "translate(0, 44)");
    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "legend-gradient-games-v2");

    // 渐变色选取更温和的中间区间
    linearGradient.append("stop").attr("offset", "0%").attr("stop-color", d3.interpolateOranges(0.35));
    linearGradient.append("stop").attr("offset", "100%").attr("stop-color", d3.interpolateOranges(0.65));

    row3.append("rect")
        .attr("width", 30).attr("height", 10).attr("y", 1)
        .attr("fill", "url(#legend-gradient-games-v2)").attr("rx", 2);
    row3.append("text")
        .attr("x", 35).attr("y", 10)
        .style("fill", "#aaa").style("font-size", "12px")
        .text("发售量(多/少)");

    // --- 6. 坐标轴、柱状图、折线与交互逻辑 ---
    svg.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).tickSize(0))
        .selectAll("text").style("fill", "#aaa").attr("dy", "15px");

    svg.append("g").call(d3.axisLeft(yScaleLeft).ticks(5))
        .selectAll("text").style("fill", "#aaa");

    svg.append("g")
        .attr("transform", `translate(${innerWidth},0)`)
        .call(d3.axisRight(yScaleRight).ticks(5).tickFormat(d => d + "%"))
        .selectAll("text").style("fill", "#aaa");

    const bars = svg.selectAll(".bar").data(data).enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d.year))
        .attr("y", d => yScaleLeft(d.actual_revenue))
        .attr("width", xScale.bandwidth())
        .attr("height", d => innerHeight - yScaleLeft(d.actual_revenue))
        .attr("fill", d => colorScale(d.num_games)) // 使用优化的颜色
        .style("cursor", "pointer")
        .on("mouseover", (event, d) => {
            tooltip.classed("visible", true).html(`
                <strong>${d.year} 年度数据</strong>
                <div class="tooltip-row"><span>销售额:</span><span class="val-money">${d.actual_revenue.toFixed(2)} 亿</span></div>
                <div class="tooltip-row"><span>增长率:</span><span class="val-rate">${d.growth_rate.toFixed(1)}%</span></div>
                <div class="tooltip-row"><span>发售量:</span><span class="val-games">${d.num_games} 款</span></div>
            `);
        })
        .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", () => tooltip.classed("visible", false));

    const lineGenerator = d3.line()
        .x(d => xScale(d.year) + xScale.bandwidth() / 2)
        .y(d => yScaleRight(d.growth_rate))
        .curve(d3.curveMonotoneX);

    svg.append("path").datum(data).attr("class", "growth-line")
        .attr("d", lineGenerator).attr("fill", "none")
        .attr("stroke", "#ff69b4").attr("stroke-width", 3).attr("pointer-events", "none");

    const dots = svg.selectAll(".dot").data(data).enter().append("circle")
        .attr("class", "growth-dot")
        .attr("cx", d => xScale(d.year) + xScale.bandwidth() / 2)
        .attr("cy", d => yScaleRight(d.growth_rate))
        .attr("r", 5).attr("fill", "#fff").attr("stroke", "#ff69b4").style("cursor", "pointer")
        .on("mouseover", function (event, d) {
            d3.select(this).transition().duration(200).attr("r", 8);
            tooltip.classed("visible", true).html(`
                <strong>${d.year} 增长率</strong>
                <div class="tooltip-row"><span>增长率:</span><span class="val-rate">${d.growth_rate.toFixed(1)}%</span></div>
                <div class="tooltip-row"><span>销售额:</span><span class="val-money">${d.actual_revenue.toFixed(2)} 亿</span></div>
            `);
        })
        .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function () {
            d3.select(this).transition().duration(200).attr("r", 5);
            tooltip.classed("visible", false);
        });

    return {
        highlight: (targetYear) => {
            const yearStr = String(targetYear);
            bars.transition().duration(400)
                .attr("opacity", d => String(d.year) === yearStr ? 1 : 0.2)
                .attr("stroke", d => String(d.year) === yearStr ? "#fff" : "none")
                .attr("stroke-width", 2);
            dots.transition().duration(400)
                .attr("r", d => String(d.year) === yearStr ? 8 : 5)
                .attr("fill", d => String(d.year) === yearStr ? "#ff69b4" : "#fff");
        }
    };
};
