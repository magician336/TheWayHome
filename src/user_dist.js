/**
 * user_dist.js
 * 第三屏：各语言用户占比 (支持滚动动态排序)
 */

export const createDistributionChart = (data) => {
    const container = d3.select("#user-distribution-chart");
    if (container.empty()) return;

    container.selectAll("*").remove();

    // --- 1. 数据保护与加载 ---
    if (!data) {
        // 如果没有数据传进来，尝试自己加载（兼容旧逻辑）
        d3.csv("src/data/user_distribution.csv").then(raw => {
            const cleanData = raw.map(d => ({
                year: +d.year,
                zhCN: +d.zhCN || 0,
                en: +d.en || 0,
                ru: +d.ru || 0,
                es: +d.es || 0,
                pt: +d.pt || 0,
                de: +d.de || 0,
                others: +d.others || 0
            }));
            createDistributionChart(cleanData);
        });
        return;
    }

    // --- 2. 布局常量 ---
    const containerRect = container.node().getBoundingClientRect();
    const safeWidth = containerRect.width > 250 ? containerRect.width : 900;
    const rowHeight = 45;
    const rowGap = 15;
    const height = Math.max(500, data.length * (rowHeight + rowGap) + 120);
    const margin = { top: 60, right: 140, bottom: 40, left: 80 };
    const innerWidth = safeWidth - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", safeWidth)
        .attr("height", height)
        .attr("viewBox", `0 0 ${safeWidth} ${height}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // --- 3. 配置定义 ---
    const languages = ["zhCN", "en", "ru", "es", "pt", "de", "others"];
    // 固定顺序：用于初始展示
    const fixedOrderList = ["zhCN", "en", "ru", "es", "pt", "de", "others"];

    const languageLabels = {
        zhCN: "简体中文", en: "英语", ru: "俄语",
        es: "西班牙语", pt: "葡萄牙语", de: "德语", others: "其他"
    };

    const colorScale = d3.scaleOrdinal()
        .domain(languages)
        .range([
            "#e15759", "#4e79a7", "#f28e2c", "#76b7b2",
            "#59a14f", "#edc949", "#af7aa1"
        ]);

    // 比例尺
    let maxTotal = d3.max(data, d => languages.reduce((sum, lang) => sum + (d[lang] || 0), 0)) || 1;
    const isPercentageData = maxTotal > 1.5;
    const x = d3.scaleLinear().domain([0, maxTotal]).range([0, innerWidth]);
    const y = d3.scaleBand().domain(data.map(d => d.year)).range([0, innerHeight]).paddingInner(0.25);

    // --- 4. 核心：数据处理函数 (根据模式计算位置) ---
    // mode: 'fixed' (固定顺序) | 'ranked' (排名顺序)
    function processData(mode) {
        return data.map(d => {
            // 1. 确定排序逻辑
            let displayOrder;
            if (mode === 'ranked') {
                // 按数值大小降序，others 永远放最后
                const rankList = fixedOrderList.filter(l => l !== 'others')
                    .sort((a, b) => (d[b] || 0) - (d[a] || 0));
                displayOrder = rankList.concat(['others']);
            } else {
                // 固定顺序
                displayOrder = fixedOrderList;
            }

            // 2. 计算真实排名 (Label显示的排名永远基于真实数值，不随显示顺序改变)
            const trueRankOrder = fixedOrderList.filter(l => l !== 'others')
                .sort((a, b) => (d[b] || 0) - (d[a] || 0));

            // 3. 计算堆叠坐标
            let acc = 0;
            const segs = displayOrder.map(lang => {
                const start = acc;
                const value = d[lang] || 0;
                acc += value;
                const rank = trueRankOrder.indexOf(lang) + 1;
                return {
                    lang, start, end: acc, value,
                    year: d.year,
                    rank: lang === 'others' ? 99 : rank
                };
            });
            return { d, segs }; // segs 里的顺序就是页面上的显示顺序
        });
    }

    // --- 5. 初始绘制 (默认使用 Fixed 模式) ---
    // 先计算一次数据用于生成 DOM
    const initialData = processData('fixed');

    // 绘制坐标轴
    const yAxis = svg.append("g").attr("class", "axis text").call(d3.axisLeft(y).tickFormat(d3.format("d")));
    yAxis.select(".domain").remove();
    yAxis.selectAll("line").remove();

    // 绘制行
    const rows = svg.selectAll(".year-row")
        .data(data) // 绑定原始年份数据
        .join("g")
        .attr("class", "year-row")
        .attr("transform", d => `translate(0, ${y(d.year)})`);

    // 背景槽
    rows.append("rect")
        .attr("width", innerWidth).attr("height", y.bandwidth())
        .attr("fill", "#ffffff").attr("opacity", 0.05).attr("rx", 6);

    // 绘制分段 (Rect)
    // 这里的关键是：我们将在 updateLayout 中更新它们，这里只负责初始化
    // 我们需要给 rows 绑定具体的 segments 数据，但 rows 已经在上面绑定了 data
    // 所以我们在 each 里面处理
    rows.each(function (d, i) {
        const rowSegs = initialData[i].segs;
        d3.select(this).selectAll(".segment")
            .data(rowSegs, d => d.lang) // 【关键】使用 lang 作为 key，保证动画时能找到对应的条
            .join("rect")
            .attr("class", "segment")
            .attr("x", d => x(d.start))
            .attr("y", 0)
            .attr("width", d => Math.max(0, x(d.end) - x(d.start) - 1))
            .attr("height", y.bandwidth())
            .attr("fill", d => colorScale(d.lang))
            .attr("opacity", 0.9).attr("rx", 3);

        d3.select(this).selectAll(".segment-label")
            .data(rowSegs, d => d.lang)
            .join("text")
            .attr("class", "segment-label")
            // 初始位置
            .attr("x", d => x(d.start) + (x(d.end) - x(d.start)) / 2)
            .attr("y", y.bandwidth() / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .style("pointer-events", "none")
            .style("fill", "#fff")
            .style("font-size", d => d.rank <= 3 ? "12px" : "10px")
            .style("font-weight", d => d.rank <= 3 ? "bold" : "normal")
            .style("text-shadow", "0 1px 2px rgba(0,0,0,0.8)")
            .text(d => getLabelText(d));
    });

    // 辅助函数：生成标签文字
    function getLabelText(d) {
        if (d.lang === 'others') return '';
        const w = x(d.end) - x(d.start);
        if (isNaN(w) || w < 20) return '';
        const val = isPercentageData ? d.value : d.value * 100;
        const percentStr = Math.round(val) + "%";
        if (w > 60) {
            const prefix = d.rank <= 3 ? ["🥇", "🥈", "🥉"][d.rank - 1] + " " : "";
            return `${prefix}${languageLabels[d.lang]} ${percentStr}`;
        }
        return percentStr;
    }

    // --- 6. 暴露更新接口 (供 ScrollTrigger 调用) ---
    // mode: 'fixed' | 'ranked'
    function updateLayout(mode) {
        const newData = processData(mode);

        // 遍历每一行，应用新的位置
        svg.selectAll(".year-row").each(function (d, i) {
            const rowSegs = newData[i].segs;
            const row = d3.select(this);

            // 更新矩形位置
            row.selectAll(".segment")
                .data(rowSegs, d => d.lang) // 重新绑定数据(位置变了)
                .transition() // 开启丝滑动画
                .duration(1000)
                .ease(d3.easeCubicOut)
                .attr("x", d => x(d.start)); // 宽度不变，只变 x

            // 更新标签位置
            row.selectAll(".segment-label")
                .data(rowSegs, d => d.lang)
                .transition()
                .duration(1000)
                .ease(d3.easeCubicOut)
                .attr("x", d => x(d.start) + (x(d.end) - x(d.start)) / 2);
        });
    }

    // --- 7. 标题与图例 (保持不变) ---
    svg.append("text").attr("class", "chart-title")
        .attr("x", innerWidth / 2).attr("y", -25)
        .attr("text-anchor", "middle").text("各语言用户占比演变");

    // 添加交互事件(Tooltip等，为简化代码略去部分重复逻辑，保留核心交互)
    // 重新绑定一次交互事件确保新建元素生效（虽然 join 会保留，但为了保险）
    svg.selectAll(".segment")
        .on("mouseover", function (event, d) {
            d3.select(this).attr("opacity", 1).attr("stroke", "#fff").attr("stroke-width", 1);
            showTooltip(event, d);
        })
        .on("mouseout", function () {
            d3.select(this).attr("stroke", "none").attr("opacity", 0.9);
            hideTooltip();
        });

    // 图例绘制...
    const legend = svg.append("g").attr("transform", `translate(${innerWidth + 20}, 0)`);
    languages.forEach((lang, i) => {
        const row = legend.append("g").attr("transform", `translate(0, ${i * 30})`);
        row.append("rect").attr("width", 16).attr("height", 16).attr("fill", colorScale(lang)).attr("rx", 4);
        row.append("text").attr("class", "legend-text").attr("x", 24).attr("y", 12).text(languageLabels[lang]);
    });

    // Tooltip 逻辑
    let tooltip = d3.select("body").select(".dist-tooltip");
    if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("class", "dist-tooltip");
    function showTooltip(event, d) {
        const val = isPercentageData ? d.value : d.value * 100;

        // 构建基础内容：年份与语言名称
        let tooltipHtml = `<strong>${d.year}年 - ${languageLabels[d.lang]}</strong>
                       <div>占比: ${val.toFixed(2)}%</div>`;

        // 核心修改：仅当不是 'others' 时才添加排名显示
        if (d.lang !== 'others') {
            tooltipHtml += `<div>排名: 第 ${d.rank} 名</div>`;
        }

        tooltip.style("visibility", "visible").html(tooltipHtml);

        // 定位逻辑保持不变
        tooltip.style("left", (event.clientX + 15) + "px")
            .style("top", (event.clientY - 20) + "px");
    }
    function hideTooltip() { tooltip.style("visibility", "hidden"); }

    // 【重要】返回控制对象
    return {
        updateLayout: updateLayout
    };
};