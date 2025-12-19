import { GlobalVizConfig } from '@magician336/assets';

console.log("D3 version:", typeof d3 !== 'undefined' ? d3.version : "not loaded");
console.log("GlobalVizConfig loaded:", GlobalVizConfig);

// 中国客户端游戏市场情况可视化
const createRevenueChart = () => {
    if (!GlobalVizConfig) {
        console.error("GlobalVizConfig is not loaded!");
        return;
    }
    const { theme, layout, utils } = GlobalVizConfig;

    const container = d3.select("#chart-revenue");
    if (container.empty()) {
        console.error("Container #chart-revenue not found!");
        return;
    }
    container.selectAll("*").remove();

    // 获取容器尺寸
    const containerWidth = container.node().getBoundingClientRect().width || 900;
    const containerHeight = container.node().getBoundingClientRect().height || 600;

    const margin = layout.margin;
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    console.log("Chart dimensions:", { width, height });

    // 使用 GlobalVizConfig.utils.createResponsiveSvg 创建响应式 SVG
    const svgSelection = utils.createResponsiveSvg("#chart-revenue", width + margin.left + margin.right, height + margin.top + margin.bottom);

    if (!svgSelection) {
        console.error("Failed to create SVG! Is D3 loaded?");
        return;
    }

    const svg = svgSelection
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // 加载数据 - 使用绝对路径确保在不同根目录下都能找到
    d3.csv("/src/data/revenue.csv").then((data) => {
        if (!data || data.length === 0) {
            console.error("No data loaded from CSV!");
            return;
        }
        // 数据解析
        data.forEach((d) => {
            d.year = d.year;
            d.actual_revenue = +d.actual_revenue;
            d.num_games = +d.num_games;
            d.growth_rate = +d.growth_rate;
        });

        console.log("Revenue data loaded successfully:", data);

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
            .domain([-d3.max(data, (d) => d.num_games) * 0.3, d3.max(data, (d) => d.num_games) * 1.8])
            .interpolator(d3.interpolateOranges);

        // 添加标题
        svg
            .append("text")
            .attr("x", width / 2)
            .attr("y", -70)
            .attr("text-anchor", "middle")
            .style("font-size", "20px")
            .style("font-weight", "bold")
            .style("fill", theme.textMain)
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
                d3.select(this).attr("opacity", 1).attr("stroke", theme.textMain).attr("stroke-width", 1);
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
            .attr("stroke", theme.categorical[7])
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
            .attr("fill", theme.categorical[7])
            .attr("stroke", theme.textMain)
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

        xAxis.selectAll("text").style("fill", theme.textMain);
        xAxis.selectAll(".domain, .tick line").style("stroke", theme.gridColor);

        // 左Y轴 - 实际收入
        const yAxisLeft = svg
            .append("g")
            .call(d3.axisLeft(yScaleLeft).ticks(8))
            .style("font-size", "12px");

        yAxisLeft.selectAll("text").style("fill", theme.textMain);
        yAxisLeft.selectAll(".domain, .tick line").style("stroke", theme.gridColor);

        // 左Y轴标签
        svg
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -55)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .style("font-weight", "600")
            .style("fill", theme.textMain)
            .text("实际收入 (亿元)");

        // 右Y轴 - 增长率
        const yAxisRight = svg
            .append("g")
            .attr("transform", `translate(${width},0)`)
            .call(d3.axisRight(yScaleRight).ticks(8).tickFormat(d => d + "%"))
            .style("font-size", "12px");

        yAxisRight.selectAll("text").style("fill", theme.textMain);
        yAxisRight.selectAll(".domain, .tick line").style("stroke", theme.gridColor);

        // 右Y轴标签
        svg
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", width + 55)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .style("font-weight", "600")
            .style("fill", theme.textMain)
            .text("增长率 (%)");

        // 图例
        const legend = svg
            .append("g")
            .attr("transform", `translate(${width - 350}, -40)`); // 整体上移并调整位置

        // 1. 颜色条图例 (代表发售量)
        const legendGradient = svg.append("defs")
            .append("linearGradient")
            .attr("id", "legend-gradient")
            .attr("x1", "0%").attr("y1", "0%")
            .attr("x2", "100%").attr("y2", "0%");

        legendGradient.append("stop").attr("offset", "0%").attr("stop-color", d3.interpolateOranges(0.2));
        legendGradient.append("stop").attr("offset", "100%").attr("stop-color", d3.interpolateOranges(0.8));

        legend.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 100)
            .attr("height", 10)
            .attr("fill", "url(#legend-gradient)");

        legend.append("text")
            .attr("x", 0)
            .attr("y", 22)
            .style("font-size", "10px")
            .style("fill", theme.textMain)
            .text("发售量: 小");

        legend.append("text")
            .attr("x", 100)
            .attr("y", 22)
            .attr("text-anchor", "end")
            .style("font-size", "10px")
            .style("fill", theme.textMain)
            .text("大");

        // 2. 实际收入图例
        legend.append("rect")
            .attr("x", 115)
            .attr("y", 0)
            .attr("width", 15)
            .attr("height", 10)
            .attr("fill", theme.categorical[1]);

        legend.append("text")
            .attr("x", 135)
            .attr("y", 10)
            .style("font-size", "12px")
            .style("fill", theme.textMain)
            .text("实际收入");

        // 3. 增长率图例
        const growthLegend = legend.append("g")
            .attr("transform", "translate(210, 0)");

        growthLegend.append("line")
            .attr("x1", 0)
            .attr("x2", 25)
            .attr("y1", 8)
            .attr("y2", 8)
            .attr("stroke", theme.categorical[7])
            .attr("stroke-width", 2.5);

        growthLegend.append("circle")
            .attr("cx", 12.5)
            .attr("cy", 8)
            .attr("r", 4)
            .attr("fill", theme.categorical[7])
            .attr("stroke", theme.textMain)
            .attr("stroke-width", 1.5);

        growthLegend.append("text")
            .attr("x", 30)
            .attr("y", 12)
            .style("font-size", "12px")
            .style("fill", theme.textMain)
            .text("增长率");

        // Tooltip
        const tooltip = d3
            .select("body")
            .append("div")
            .attr("class", "viz-tooltip")
            .style("visibility", "hidden");

        function showTooltip(event, d, type) {
            let html = `<strong>${d.year}年</strong><br/>`;
            html += `实际收入: <span style="color:${theme.categorical[1]};font-weight:bold">${d.actual_revenue.toFixed(2)} 亿元</span><br/>`;
            html += `增长率: <span style="color:${theme.categorical[7]};font-weight:bold">${d.growth_rate}%</span><br/>`;
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
    }).catch(err => {
        console.error("Error loading or processing CSV data:", err);
    });
};

// 页面加载后创建图表
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createRevenueChart);
} else {
    createRevenueChart();
}
