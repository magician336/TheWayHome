import { createRevenueChart } from './revenue.js';
// 1. 引入用户分布图表函数 (注意文件名是 user_dist.js)
import { createDistributionChart } from './user_dist.js';

/**
 * 首页核心驱动：数据解析、微缩图表渲染与动态交互
 */
async function initHomePage() {
    try {
        // 1. 初始化滚动交互
        initScrollInteractions();

        // 2. 加载核心数据 (增加 user_distribution.csv 的加载)
        const [games, revenueData, rawdistData] = await Promise.all([
            d3.json("/src/games.json"),
            d3.csv("/src/data/revenue.csv"),
            d3.csv("/src/data/user_distribution.csv")
        ]);

        const distData = rawdistData.map(d => ({
            year: +d.year,
            zhCN: +d.zhCN || 0,
            en: +d.en || 0,
            ru: +d.ru || 0,
            es: +d.es || 0,
            pt: +d.pt || 0,
            de: +d.de || 0,
            others: +d.others || 0
        }));

        // 3. 统计看板初始化
        renderQuickStats(games, revenueData);

        // 4. 渲染板块一：宏观趋势图表
        createRevenueChart(revenueData);

        // 1. 获取图表控制器
        const distChartController = createDistributionChart(distData);

        // 2. 设置专门的滚动监听，控制图表排序动画
        setupDistChartAnimation(distChartController);

    } catch (err) {
        console.error("首页初始化失败:", err);
    }
}
/**
 * 专门用于控制第三屏图表排序动画的 Observer
 */
function setupDistChartAnimation(controller) {
    if (!controller) return;

    const section = document.querySelector("#distribution-section");

    // 1. 状态追踪：记录当前是哪个模式，默认为 'fixed'
    let currentMode = 'fixed';

    // --- 滚动监听部分 (保持原有逻辑并增加状态同步) ---
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // 保留调试日志
            // console.log(`当前显示比例: ${entry.intersectionRatio.toFixed(2)}`);

            if (entry.intersectionRatio > 0.7) {
                // 只有当状态真的改变时才执行，避免重复调用
                if (currentMode !== 'ranked') {
                    currentMode = 'ranked';
                    controller.updateLayout('ranked');
                }
            } else if (entry.intersectionRatio < 0.2) {
                if (currentMode !== 'fixed') {
                    currentMode = 'fixed';
                    controller.updateLayout('fixed');
                }
            }
        });
    }, {
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
    });

    if (section) {
        observer.observe(section);

        // 1. 设置鼠标手势，提示用户可以点击
        section.style.cursor = 'pointer';
        section.setAttribute('title', '点击切换排序视图');

        // 2. 添加点击事件监听
        section.addEventListener('click', (e) => {
            // 阻止冒泡，防止触发页面其他潜在点击事件
            e.stopPropagation();

            // 切换逻辑：如果是 fixed 就变 ranked，反之亦然
            const nextMode = (currentMode === 'fixed') ? 'ranked' : 'fixed';

            console.log(`🖱️ 用户手动点击，切换至: ${nextMode}`);

            // 执行动画
            controller.updateLayout(nextMode);

            // 更新当前状态记录
            currentMode = nextMode;
        });
    }
}

/**
 * 初始化滚动交互：背景切换与内容揭示 (ID 匹配版)
 */
function initScrollInteractions() {
    const sections = document.querySelectorAll('section');
    const reveals = document.querySelectorAll('.reveal');

    // 背景切换观察者
    const bgObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // 当某个 Section 进入视口超过 50% 时
            if (entry.isIntersecting) {
                // 1. 获取该 Section 指定的背景 ID
                const targetBgId = entry.target.getAttribute('data-bg');

                // 2. 如果存在 ID，则进行切换
                if (targetBgId) {
                    switchBackground(targetBgId);
                }
            }
        });
    }, { threshold: 0.5 });

    // 内容揭示观察者 (保持不变)
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    });

    sections.forEach(section => bgObserver.observe(section));
    reveals.forEach(reveal => revealObserver.observe(reveal));

    // --- 核心修改逻辑 ---
    function switchBackground(targetId) {
        // 1. 找到所有的背景层
        const allLayers = document.querySelectorAll('.bg-layer');

        // 2. 遍历所有层
        allLayers.forEach(layer => {
            // 3. 如果这个层的 ID 等于目标 ID，就加上 active，否则移除
            if (layer.id === targetId) {
                layer.classList.add('active');
            } else {
                layer.classList.remove('active');
            }
        });
    }
}

/**
 * 渲染顶部实时数据块
 */
function renderQuickStats(games, revenue) {
    if (!games || !revenue) return;

    const totalGames = games.length;
    const latestRevenue = +revenue[revenue.length - 1].actual_revenue;
    const avgRating = d3.mean(games, d => d.favorableRate).toFixed(1);

    const stats = [
        { label: "收录作品", value: totalGames, suffix: "+" },
        { label: "年度营收", value: latestRevenue, suffix: " 亿" },
        { label: "平均好评", value: avgRating, suffix: "%" }
    ];

    const container = d3.select("#quick-stats");
    container.selectAll("*").remove();

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

        div.select("div")
            .transition().duration(2000)
            .tween("text", function () {
                const i = d3.interpolateNumber(0, s.value);
                return t => d3.select(this).text((s.label === "平均好评" ? i(t).toFixed(1) : Math.round(i(t))) + s.suffix);
            });
    });

    const growth = revenue[revenue.length - 1].growth_rate;
    d3.select("#macro-dynamic-text").html(`<b>实时洞察：</b>最新数据显示，年增长率已达 <b>${growth}%</b>，国产独立游戏正处于黄金成长期。`);
}

document.addEventListener('DOMContentLoaded', initHomePage);