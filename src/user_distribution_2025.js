// 矩形树图：2025年各语言用户占比
(function () {
    const margin = { top: 40, right: 20, bottom: 20, left: 20 };
    const width = 900 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // 清空容器并创建 SVG
    const container = d3.select("#chart");
    container.selectAll("*").remove();

    // 创建 tooltip
    const tooltip = container
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
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

    const svg = container
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // 加载数据
    d3.csv("data/user_distribution.csv").then((rawData) => {
        // 筛选 2025 年数据
        const data2025 = rawData.find(d => d.year === "2025");

        if (!data2025) {
            console.error("未找到 2025 年数据");
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
            name: "2025年用户分布",
            children: [
                { name: "zhCN", label: languageLabels.zhCN, value: +data2025.zhCN },
                { name: "en", label: languageLabels.en, value: +data2025.en },
                { name: "ru", label: languageLabels.ru, value: +data2025.ru },
                { name: "es", label: languageLabels.es, value: +data2025.es },
                { name: "pt", label: languageLabels.pt, value: +data2025.pt },
                { name: "de", label: languageLabels.de, value: +data2025.de },
                { name: "others", label: languageLabels.others, value: +data2025.others }
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
        const cells = svg
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
                            2025年8月数据
                        </div>
                    `);
            })
            .on("mousemove", function (event) {
                tooltip
                    .style("top", (event.pageY - 80) + "px")
                    .style("left", (event.pageX - 350) + "px");
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

        // 标题
        svg
            .append("text")
            .attr("x", width / 2)
            .attr("y", -15)
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .style("font-size", "20px")
            .style("font-weight", "bold")
            .text("2025年8月 Steam 各语言用户占比");
    });
})();
