import { createRevenueChart } from './revenue.js';
/**
 * 首页核心驱动：数据解析、微缩图表渲染与动态交互
 */
async function initHomePage() {
    try {
        // 1. 初始化滚动交互
        initScrollInteractions();

        // 2. 加载核心数据
        const [games, revenueData] = await Promise.all([
            d3.json("/src/games.json"),
            d3.csv("/src/data/revenue.csv")
        ]);

        // 3. 统计看板初始化
        renderQuickStats(games, revenueData);

        // 4. 渲染板块一：宏观趋势图表
        createRevenueChart(revenueData);

        // 5. 渲染板块二：用户分布

    } catch (err) {
        console.error("首页初始化失败:", err);
    }
}

/**
 * 初始化滚动交互：背景切换与内容揭示
 */
function initScrollInteractions() {
    const sections = document.querySelectorAll('section');
    const bgLayers = document.querySelectorAll('.bg-layer');
    const reveals = document.querySelectorAll('.reveal');

    // 背景切换观察者
    const bgObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const index = entry.target.getAttribute('data-bg-index');
                if (index !== null) {
                    switchBackground(index);
                }
            }
        });
    }, { threshold: 0.5 });

    // 内容揭示观察者
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // 当元素进入视口时
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // 性能优化：动画触发后就不需要再观察了，避免反复触发消耗资源
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        // 修改这里：
        threshold: 0.15, // 稍微降低阈值，露头 15% 就开始准备跳
        rootMargin: "0px 0px -50px 0px" // 意思是：视口底部向上缩 50px 才算边界。这能确保元素是在屏幕内部跳出来，而不是贴着底边。
    });

    sections.forEach(section => bgObserver.observe(section));
    reveals.forEach(reveal => revealObserver.observe(reveal));

    function switchBackground(index) {
        bgLayers.forEach((layer, i) => {
            layer.classList.toggle('active', i == index);
        });
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
    container.selectAll("*").remove(); // 清空占位符

    stats.forEach(s => {
        const div = container.append("div").attr("class", "stat-item");
        div.append("div")
            .style("color", "var(--accent-color, #00d4ff)")
            .style("font-size", "2.5rem")
            .style("font-weight", "800")
            .text("0");
        div.append("div")
            .style("opacity", "0.6")
            .style("font-size", "0.9rem")
            .style("margin-top", "10px")
            .text(s.label);

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
    d3.select("#macro-dynamic-text").html(`<b>实时洞察：</b>最新数据显示，年增长率已达 <b>${growth}%</b>，国产独立游戏正处于黄金成长期。`);
}



// 启动初始化
document.addEventListener('DOMContentLoaded', initHomePage);
