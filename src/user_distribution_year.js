// 矩形树图：指定年份各语言用户占比
function createTreemapByYear(year = 2025, xScale = null, xAxisHeight = null, margins = null) {
    // 使用传入的 margin 或默认值
    const margin = margins || { top: 40, right: 120, bottom: 70, left: 60 };
    const width = 900 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // 清空容器（但保留 X 轴和 tooltip）
    const container = d3.select("#chart-area");

    // 移除旧的 tooltip
    container.selectAll(".tooltip").remove();

    // 创建 tooltip
    const tooltip = container
        .append("div")
        .attr("class", "tooltip")
        .style("position", "fixed")
        .style("visibility", "hidden")
        .style("background", "rgba(0, 0, 0, 0.9)")
        .style("color", "white")
        .style("padding", "12px 16px")
        .style("border-radius", "8px")
        .style("font-size", "14px")
        .style("pointer-events", "none")
        .style("box-shadow", "0 4px 16px rgba(0,0,0,0.4)")
        .style("z-index", "1000")
        .style("backdrop-filter", "blur(8px)");

    // 获取或创建 SVG
    let svgContainer = container.select("svg");
    if (svgContainer.empty()) {
        svgContainer = container
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);
    }

    // 获取主 g 元素
    let mainGroup = svgContainer.select("g.main-group");
    if (mainGroup.empty()) {
        mainGroup = svgContainer
            .append("g")
            .attr("class", "main-group")
            .attr("transform", `translate(${margin.left},${margin.top})`);
    }

    // 检查 X 轴是否存在
    const xAxisGroup = mainGroup.select(".x-axis-group");
    console.log("X轴存在:", !xAxisGroup.empty(), "X轴节点:", xAxisGroup.node());

    // 清除主 g 元素中除了 X 轴之外的所有内容（包括旧的面积图层和树图内容）
    mainGroup.selectAll(".layer, .treemap-content, text:not(.x-axis-group text)").remove();

    // 创建树图内容组
    const svgGroup = mainGroup
        .append("g")
        .attr("class", "treemap-content");    // 加载数据
    d3.csv("data/user_distribution.csv").then((rawData) => {
        // 筛选指定年份数据
        const yearData = rawData.find(d => d.year === String(year));

        if (!yearData) {
            console.error(`未找到 ${year} 年数据`);
            // 显示错误提示
            container
                .append("div")
                .style("text-align", "center")
                .style("color", "white")
                .style("padding", "50px")
                .style("font-size", "18px")
                .html(`<strong>错误：</strong>未找到 ${year} 年的数据`);
            return;
        }

        // 语言配置
        const languageLabels = {
            zhCN: "简体中文",
            en: "英语",
            ru: "俄语",
            es: "西班牙语",
            pt: "葡萄牙语",
            de: "德语",
            others: "其他"
        };

        // 转换为树图所需的数据结构
        const treeData = {
            name: `${year}年用户分布`,
            children: [
                { name: "zhCN", label: languageLabels.zhCN, value: +yearData.zhCN },
                { name: "en", label: languageLabels.en, value: +yearData.en },
                { name: "ru", label: languageLabels.ru, value: +yearData.ru },
                { name: "es", label: languageLabels.es, value: +yearData.es },
                { name: "pt", label: languageLabels.pt, value: +yearData.pt },
                { name: "de", label: languageLabels.de, value: +yearData.de },
                { name: "others", label: languageLabels.others, value: +yearData.others }
            ]
        };

        console.log("树图数据:", treeData);

        // 配色方案
        const color = d3
            .scaleOrdinal()
            .domain(["zhCN", "en", "ru", "es", "pt", "de", "others"])
            .range(["#e15759", "#4e79a7", "#f28e2c", "#76b7b2", "#59a14f", "#edc949", "#af7aa1"]);

        // 创建树图布局
        const treemap = d3.treemap()
            .size([width, height])
            .paddingInner(3)
            .paddingOuter(6)
            .round(true);

        // 构建层次结构
        const root = d3.hierarchy(treeData)
            .sum(d => d.value)
            .sort((a, b) => b.value - a.value);

        // 计算布局
        treemap(root);

        console.log("树图布局:", root.leaves());

        // 绘制矩形
        const cells = svgGroup
            .selectAll("g")
            .data(root.leaves())
            .join("g")
            .attr("transform", d => `translate(${d.x0},${d.y0})`);

        // 矩形背景
        cells
            .append("rect")
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d => d.y1 - d.y0)
            .attr("fill", d => color(d.data.name))
            .attr("stroke", "#1f2937")
            .attr("stroke-width", 2)
            .attr("rx", 6)
            .style("cursor", "pointer")
            .style("transition", "all 0.3s ease")
            .on("mouseover", function (event, d) {
                // 高亮当前矩形
                d3.select(this)
                    .attr("stroke", "white")
                    .attr("stroke-width", 3)
                    .style("filter", "brightness(1.2)");

                // 显示 tooltip
                const percentage = (d.data.value * 100).toFixed(1);
                tooltip
                    .style("visibility", "visible")
                    .html(`
                        <div style="font-weight: bold; color: #38bdf8; margin-bottom: 4px;">
                            ${d.data.label}
                        </div>
                        <div style="font-size: 18px; font-weight: bold;">
                            ${percentage}%
                        </div>
                        <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">
                            ${year}年数据
                        </div>
                    `);
            })
            .on("mousemove", function (event) {
                tooltip
                    .style("top", (event.clientY + 10) + "px")
                    .style("left", (event.clientX + 15) + "px");
            })
            .on("mouseout", function () {
                d3.select(this)
                    .attr("stroke", "#1f2937")
                    .attr("stroke-width", 2)
                    .style("filter", "brightness(1)");

                tooltip.style("visibility", "hidden");
            });

        // 添加语言标签
        cells
            .append("text")
            .attr("x", d => (d.x1 - d.x0) / 2)
            .attr("y", d => (d.y1 - d.y0) / 2 - 10)
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .style("font-size", d => {
                const width = d.x1 - d.x0;
                const height = d.y1 - d.y0;
                const size = Math.min(width / 6, height / 4, 18);
                return `${Math.max(size, 12)}px`;
            })
            .style("font-weight", "600")
            .style("text-shadow", "0 1px 4px rgba(0,0,0,0.6)")
            .style("pointer-events", "none")
            .text(d => d.data.label);

        // 添加百分比
        cells
            .append("text")
            .attr("x", d => (d.x1 - d.x0) / 2)
            .attr("y", d => (d.y1 - d.y0) / 2 + 15)
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .style("font-size", d => {
                const width = d.x1 - d.x0;
                const height = d.y1 - d.y0;
                const size = Math.min(width / 8, height / 5, 16);
                return `${Math.max(size, 11)}px`;
            })
            .style("font-weight", "bold")
            .style("text-shadow", "0 1px 4px rgba(0,0,0,0.6)")
            .style("pointer-events", "none")
            .text(d => `${(d.data.value * 100).toFixed(1)}%`);

        // 图例
        const languages = ["zhCN", "en", "ru", "es", "pt", "de", "others"];
        const legend = svgGroup
            .append("g")
            .attr("transform", `translate(${width + 20}, 0)`);

        languages.forEach((lang, i) => {
            const legendRow = legend
                .append("g")
                .attr("transform", `translate(0, ${i * 25})`)
                .style("cursor", "pointer")
                .on("mouseover", function () {
                    // 突出显示对应的矩形
                    cells.filter(d => d.data.name === lang)
                        .select("rect")
                        .attr("opacity", 1)
                        .attr("stroke-width", 3)
                        .attr("stroke", "white")
                        .style("filter", "brightness(1.2)");

                    cells.filter(d => d.data.name !== lang)
                        .select("rect")
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
                    cells.select("rect")
                        .attr("opacity", 1)
                        .attr("stroke-width", 2)
                        .attr("stroke", "#1f2937")
                        .style("filter", "brightness(1)");

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
        svgGroup
            .append("text")
            .attr("x", width / 2)
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .style("font-size", "20px")
            .style("font-weight", "bold")
            .text(`${year}年 Steam 各语言用户占比`);
    });
}
