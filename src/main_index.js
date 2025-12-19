import { GlobalVizConfig } from '@magician336/assets';

/**
 * 首页核心驱动：数据解析、微缩图表渲染与动态背景
 */
async function initHomePage() {
    try {
        // 1. 加载核心数据
        const [games, revenueData] = await Promise.all([
            d3.json("/src/games.json"),
            d3.csv("/src/data/revenue.csv")
        ]);

        // 2. 统计看板初始化
        renderQuickStats(games, revenueData);

        // 3. 渲染板块一：宏观趋势微缩图
        drawMacroTrend(revenueData);

        // 4. 动态背景
        initDynamicBackground();

    } catch (err) {
        console.error("首页初始化失败:", err);
    }
}

/**
 * 渲染顶部实时数据块
 */
function renderQuickStats(games, revenue) {
    const totalGames = games.length;
    const latestRevenue = +revenue[revenue.length - 1].actual_revenue;
    const avgRating = d3.mean(games, d => d.favorableRate).toFixed(1);

    const stats = [
        { label: "收录作品", value: totalGames, suffix: "+" },
        { label: "年度营收", value: latestRevenue, suffix: " 亿" },
        { label: "平均好评", value: avgRating, suffix: "%" }
    ];

    const container = d3.select("#quick-stats");
    stats.forEach(s => {
        const div = container.append("div").attr("class", "stat-item").style("text-align", "center");
        div.append("div").style("color", "var(--accent-color)").style("font-size", "2.5rem").style("font-weight", "800").text("0");
        div.append("div").style("opacity", "0.5").style("font-size", "0.8rem").style("letter-spacing", "2px").text(s.label);

        // 数字滚动动画
        div.select("div")
            .transition().duration(2000)
            .tween("text", function () {
                const i = d3.interpolateNumber(0, s.value);
                return t => d3.select(this).text((s.label === "平均好评" ? i(t).toFixed(1) : Math.round(i(t))) + s.suffix);
            });
    });

    // 动态生成第一板块的分析句
    const growth = revenue[revenue.length - 1].growth_rate;
    d3.select("#macro-dynamic-text").html(`<b>总结：</b>最新数据显示，年增长率已高达 <b>${growth}%</b>，国产独立游戏已正式进入“质变”阶段。`);
}

/**
 * 绘制宏观趋势微型预览
 */
function drawMacroTrend(data) {
    const selector = "#macro-trend-chart";
    const container = d3.select(selector);
    const width = container.node().clientWidth;
    const height = 300;

    const svg = GlobalVizConfig.utils.createResponsiveSvg(selector, width, height);
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };

    const x = d3.scalePoint().domain(data.map(d => d.year)).range([margin.left, width - margin.right]);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => +d.actual_revenue)]).range([height - margin.bottom, margin.top]);

    // 渐变面积
    const area = d3.area().x(d => x(d.year)).y0(height - margin.bottom).y1(d => y(+d.actual_revenue)).curve(d3.curveMonotoneX);
    svg.append("path").datum(data).attr("fill", "var(--accent-color)").attr("opacity", 0.15).attr("d", area);

    // 线条
    const line = d3.line().x(d => x(d.year)).y(d => y(+d.actual_revenue)).curve(d3.curveMonotoneX);
    svg.append("path").datum(data).attr("fill", "none").attr("stroke", "var(--accent-color)").attr("stroke-width", 3).attr("d", line);

    // 坐标轴
    svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).tickSize(0).tickPadding(10));
}

/**
 * 极简粒子背景
 */
function initDynamicBackground() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const svg = d3.select("#canvas-bg").append("svg").attr("viewBox", [0, 0, width, height]);

    const particles = d3.range(60).map(() => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3
    }));

    const node = svg.append("g").selectAll("circle").data(particles).join("circle")
        .attr("r", d => d.r).attr("fill", "var(--accent-color)");

    d3.timer(() => {
        particles.forEach(p => {
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0 || p.x > width) p.vx *= -1;
            if (p.y < 0 || p.y > height) p.vy *= -1;
        });
        node.attr("cx", d => d.x).attr("cy", d => d.y);
    });
}

initHomePage();
