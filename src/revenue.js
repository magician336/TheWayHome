// 中国客户端游戏市场情况可视化
// src/revenue.js

export const createRevenueChart = (data) => {
    const container = d3.select("#revenue-chart");
    if (container.empty()) return null; // 返回 null

    container.selectAll("*").remove();

    // 1. 尺寸计算
    const containerRect = container.node().getBoundingClientRect();
    const width = containerRect.width || 800;
    const height = containerRect.height || 600;
    const margin = { top: 60, right: 80, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // 2. 创建 SVG
    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // 数据清洗
    data.forEach((d) => {
        d.actual_revenue = +d.actual_revenue;
        d.num_games = +d.num_games;
        d.growth_rate = +d.growth_rate;
    });

    // 3. 比例尺
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

    const colorScale = d3.scaleSequential()
        .domain([-d3.max(data, d => d.num_games) * 0.3, d3.max(data, d => d.num_games) * 1.8])
        .interpolator(d3.interpolateOranges);

    // 4. 绘制元素
    // 标题
    svg.append("text")
        .attr("class", "chart-title")
        .attr("x", innerWidth / 2)
        .attr("y", -25)
        .attr("text-anchor", "middle")
        .style("fill", "#fff")
        .text("中国买断制游戏市场实际收入及增长率");

    // 柱子 (Revenue)
    const bars = svg.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d.year))
        .attr("y", d => yScaleLeft(d.actual_revenue))
        .attr("width", xScale.bandwidth())
        .attr("height", d => innerHeight - yScaleLeft(d.actual_revenue))
        .attr("fill", d => colorScale(d.num_games))
        .attr("opacity", 0.9); // 默认透明度

    // 折线 (Growth)
    const line = d3.line()
        .x(d => xScale(d.year) + xScale.bandwidth() / 2)
        .y(d => yScaleRight(d.growth_rate));

    svg.append("path")
        .datum(data)
        .attr("class", "growth-line")
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", "#ff69b4")
        .attr("stroke-width", 3);

    // 数据点
    const dots = svg.selectAll(".dot")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "growth-dot")
        .attr("cx", d => xScale(d.year) + xScale.bandwidth() / 2)
        .attr("cy", d => yScaleRight(d.growth_rate))
        .attr("r", 5)
        .attr("fill", "#fff")
        .attr("stroke", "#ff69b4");

    // 坐标轴
    svg.append("g").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(xScale).tickSize(0)).selectAll("text").style("fill", "#aaa").style("font-size", "14px");
    svg.append("g").call(d3.axisLeft(yScaleLeft).ticks(5)).selectAll("text").style("fill", "#aaa");
    svg.append("g").attr("transform", `translate(${innerWidth},0)`).call(d3.axisRight(yScaleRight).ticks(5).tickFormat(d => d + "%")).selectAll("text").style("fill", "#aaa");

    // --- 5. 交互控制接口 (API) ---
    // 这个对象将被返回给外部调用者 (treeScrolly.js)
    const controller = {
        // 外部调用此方法高亮特定年份
        highlight: (targetYear) => {
            const yearStr = String(targetYear);

            // 1. 柱子变淡/高亮
            bars.transition().duration(200)
                .attr("opacity", d => {
                    // 如果没传年份，或者年份匹配，保持高亮；否则变淡
                    if (!targetYear) return 0.9;
                    return String(d.year) === yearStr ? 1 : 0.2;
                })
                .style("filter", d => String(d.year) === yearStr ? "brightness(1.2)" : "none");

            // 2. 折线上的点放大
            dots.transition().duration(200)
                .attr("r", d => String(d.year) === yearStr ? 8 : 5)
                .attr("fill", d => String(d.year) === yearStr ? "#fff" : "#ff69b4")
                .attr("stroke-width", d => String(d.year) === yearStr ? 2 : 0);
        }
    };

    return controller; // 返回控制器
};
