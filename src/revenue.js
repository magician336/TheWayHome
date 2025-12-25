// 中国客户端游戏市场情况可视化
export const createRevenueChart = (data) => {
    const container = d3.select("#revenue-chart");
    if (container.empty()) return;

    container.selectAll("*").remove();

    // 获取容器尺寸
    const containerRect = container.node().getBoundingClientRect();
    const containerWidth = containerRect.width || 960;
    const containerHeight = containerRect.height || 500;
    const margin = { top: 60, right: 80, bottom: 60, left: 60 };

    // 1. 计算【内部】绘图宽度 = 总宽度 - 左边距 - 右边距
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    // 从你之前定义的 container（通常是一个 div 容器）开始操作
    const svg = container
        // 在容器内部添加一个 <svg> 标签 svg:可缩放矢量图形
        .append("svg")
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`) // 让图表自适应
        // 添加<g>元素
        .append("g")
        // 应用位移变换
        .attr("transform", `translate(${margin.left},${margin.top})`);
    // 定义渐变色 ID (给后面的图例用)
    const defs = svg.append("defs");
    const gradientId = "revenue-legend-gradient";

    const linearGradient = defs.append("linearGradient")
        .attr("id", gradientId)
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");

    // 生成渐变色 (从浅橙到深橙)
    linearGradient.selectAll("stop")
        .data(d3.ticks(0, 1, 10))
        .enter().append("stop")
        .attr("offset", d => `${d * 100}%`)
        .attr("stop-color", d => d3.interpolateOranges(d));
    // 数据解析
    data.forEach((d) => {
        d.actual_revenue = +d.actual_revenue;
        d.num_games = +d.num_games;
        d.growth_rate = +d.growth_rate;
    });

    console.log("Revenue data processing:", data);

    // X轴比例尺
    const xScale = d3
        // 创建分段比例尺
        .scaleBand()
        // 定义域
        .domain(data.map((d) => d.year))
        // 值域
        .range([0, width])
        // 间隙百分比
        .padding(0.3);

    // 左Y轴比例尺 - 实际收入(亿元)
    const yScaleLeft = d3
        // 线性比例尺
        .scaleLinear()
        // 定义域
        .domain([0, d3.max(data, (d) => d.actual_revenue) * 1.1])
        .range([height, 0]);

    // 右Y轴比例尺 - 增长率(%)
    const yScaleRight = d3
        .scaleLinear()
        .domain([d3.min(data, (d) => d.growth_rate) - 10, d3.max(data, (d) => d.growth_rate) * 1.1])
        .range([height, 0]);

    // 颜色比例尺 - 游戏发售量越多颜色越深
    const colorScale = d3
        // 顺序比例尺，数字映射到颜色值
        .scaleSequential()
        // 数值阈值
        .domain([-d3.max(data, (d) => d.num_games) * 0.3, d3.max(data, (d) => d.num_games) * 1.8])
        // 插值器，使用橙色渐变
        .interpolator(d3.interpolateOranges);

    // 添加标题
    svg
        .append("text")
        .attr("class", "chart-title")
        .attr("x", width / 2)
        .attr("y", -25)
        .attr("text-anchor", "middle")
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
            d3.select(this)
                .attr("opacity", 1)
                .attr("stroke", "#fff")
                .attr("stroke-width", 1);
            showTooltip(event, d);
        })
        .on("mouseout", function () {
            d3.select(this)
                .attr("opacity", 0.9)
                .attr("stroke", "none");
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
        .attr("class", "growth-line")
        .attr("d", line);

    // 绘制增长率数据点
    svg
        .selectAll(".dot")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "growth-dot")
        .attr("cx", (d) => xScale(d.year) + xScale.bandwidth() / 2)
        .attr("cy", (d) => yScaleRight(d.growth_rate))
        .attr("r", 5)
        .on("mouseover", function (event, d) {
            d3.select(this).attr("r", 7);
            showTooltip(event, d);
        })
        .on("mouseout", function () {
            d3.select(this).attr("r", 5);
            hideTooltip();
        });


    svg.append("g")
        .attr("class", "axis x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale));

    // 左Y轴
    svg.append("g")
        .attr("class", "axis y-axis-left")
        .call(d3.axisLeft(yScaleLeft).ticks(8));

    svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .text("实际收入 (亿元)");

    // 右Y轴
    svg.append("g")
        .attr("class", "axis y-axis-right")
        .attr("transform", `translate(${width},0)`)
        .call(d3.axisRight(yScaleRight).ticks(8).tickFormat(d => d + "%"));

    svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", width + 60)
        .attr("text-anchor", "middle")
        .text("增长率 (%)");

    // 7. 图例 (Legend) - 三行版
    // 调整 Y 为 0，确保从顶部开始画
    const legend = svg.append("g")
        .attr("transform", `translate(${width - 240}, -50)`);

    const rowHeight = 25; // 每一行的高度间距

    // --- 第一行：实际收入 (方块) ---
    const row1Y = 0;
    legend.append("rect")
        .attr("x", 0).attr("y", row1Y)
        .attr("width", 20).attr("height", 15)
        .attr("fill", d3.interpolateOranges(0.8)) // 使用深橙色代表
        .attr("opacity", 0.9);

    legend.append("text")
        .attr("class", "legend-text")
        .attr("x", 28).attr("y", row1Y + 9)
        .text("实际收入");

    // --- 第二行：增长率 (折线+圆点) ---
    const row2Y = row1Y + rowHeight;
    legend.append("line")
        .attr("x1", 0).attr("x2", 20)
        .attr("y1", row2Y + 7).attr("y2", row2Y + 7)
        .attr("class", "growth-line");

    legend.append("circle")
        .attr("cx", 10).attr("cy", row2Y + 7).attr("r", 4)
        .attr("class", "growth-dot");

    legend.append("text")
        .attr("class", "legend-text")
        .attr("x", 28).attr("y", row2Y + 9)
        .text("增长率");

    // --- 第三行：发售量 (新增的渐变条) ---
    const row3Y = row2Y + rowHeight;
    const legendBarWidth = 60; // 渐变条宽度

    legend.append("rect")
        .attr("x", 0).attr("y", row3Y + 2)
        .attr("width", legendBarWidth)
        .attr("height", 12)
        .style("fill", `url(#${gradientId})`) // 引用第一步定义的渐变ID
        .style("stroke", "rgba(255,255,255,0.3)")
        .style("stroke-width", "0.5px");

    legend.append("text")
        .attr("class", "legend-text")
        .attr("x", legendBarWidth + 10) // 文字跟在长条后面
        .attr("y", row3Y + 9)
        .text("游戏发售量 (颜色深浅)");

    // 8. 独立的 Tooltip 逻辑
    // 检查是否存在，不存在则创建。注意使用新的专用类名。
    let tooltip = d3.select("body").select(".revenue-dedicated-tooltip");

    if (tooltip.empty()) {
        tooltip = d3.select("body")
            .append("div")
            .attr("class", "revenue-dedicated-tooltip");
    }

    function showTooltip(event, d) {
        let html = `<strong>${d.year}年</strong><br/>`;
        html += `实际收入: <span class="val-money">${d.actual_revenue.toFixed(2)} 亿元</span><br/>`;
        html += `增长率: <span class="val-rate">${d.growth_rate}%</span><br/>`;
        html += `游戏发售量: ${d.num_games}`;

        tooltip.html(html).style("visibility", "visible");
        updateTooltipPosition(event);
    }

    function updateTooltipPosition(event) {
        // 防止 tooltip 跑出屏幕，做简单的边界检查
        const tooltipNode = tooltip.node();
        const tooltipWidth = tooltipNode.offsetWidth;
        // 如果靠右边缘太近，就显示在鼠标左侧
        let leftPos = event.clientX + 15;
        if (event.clientX + tooltipWidth + 20 > window.innerWidth) {
            leftPos = event.clientX - tooltipWidth - 15;
        }

        tooltip
            .style("left", leftPos + "px")
            .style("top", (event.clientY + 10) + "px");
    }

    function hideTooltip() {
        tooltip.style("visibility", "hidden");
    }

    // 在图表区域移动时也要更新 Tooltip 位置
    container.on("mousemove", function (event) {
        if (tooltip.style("visibility") === "visible") {
            updateTooltipPosition(event);
        }
    });
};
