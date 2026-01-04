// src/main_index.js

import { createRevenueChart } from './revenue.js';
import { createDistributionChart } from './user_dist.js';
import { initParallelCharts } from './parallelChartMain.js';
import { initScatterCharts } from './scatterChartMain.js';
import { initTagCharts } from './tagChartMain.js';
// 修改导入：引入 Video 版本的模块
import { TreeVideoScrolly } from './modules/treeVideoScrolly.js';

window.initParallelCharts = initParallelCharts;
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual'; // 禁用浏览器自动恢复滚动位置
}

let isFlowerReady = false;
let isMainDataLoaded = false;

/**
 * 初始化入口
 */
async function initHomePage() {
    // 1. 立即锁定用户操作
    document.body.classList.add('loading-locked');
    console.log("Main: 页面锁定，开始初始化...");

    try {
        initScrollInteractions();
        setupFlowerScrollTrigger();

        console.log("Main: 正在加载核心数据...");
        const [games, revenueData, rawdistData] = await Promise.all([
            d3.json("./games.json").catch(err => { console.warn("Games load failed:", err); return []; }),
            d3.csv("./data/revenue.csv").catch(err => { console.warn("Revenue load failed:", err); return []; }),
            d3.csv("./data/user_distribution.csv").catch(err => { console.warn("UserDist load failed:", err); return []; })
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

        // 渲染基础统计
        renderQuickStats(games, revenueData);

        // 初始化营收视频 Scrolly
        const revenueChartController = createRevenueChart(revenueData);
        const revenueStorySteps = buildRevenueStorySteps(revenueData);

        let scrollyInstance = null;

        if (revenueChartController) {
            scrollyInstance = new TreeVideoScrolly({
                videoSelector: '#tree-video',
                containerSelector: '#revenue-section',
                chartController: revenueChartController,
                data: revenueData,
                storySteps: revenueStorySteps

            });
        }

        if (scrollyInstance) {
            console.log("Main: 等待视频预载...");
            // 它是并行的，所以取决于最大的那个视频文件的下载时间。
            await scrollyInstance.preloadAllVideos();
        }

        // 初始化用户分布图
        const distChartController = createDistributionChart(distData);
        setupDistChartAnimation(distChartController);

        // 注册滚动触发器
        setupParallelChartScrollTrigger();
        setupScatterChartScrollTrigger();
        setupTagChartScrollTrigger();

        // 标记主页面数据加载完成
        isMainDataLoaded = true;
        checkAndUnlock();

    } catch (err) {
        console.error("首页初始化失败:", err);
        checkAndUnlock(true); // 出错时强制解锁
    }
}

/**
 * 检查是否满足解锁条件
 * @param {boolean} force 是否强制解锁
 */
function checkAndUnlock(force = false) {
    if (force || (isMainDataLoaded && isFlowerReady)) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
                document.body.classList.remove('loading-locked');
                console.log("Main: 页面完全就绪，解锁交互");
            }, 800);
        }
    }
}

/**
 * 平行坐标图滚动触发器
 */
function setupParallelChartScrollTrigger() {
    const section = document.querySelector("#parallel-chart-section");
    if (!section) {
        // console.error("找不到 #parallel-chart-section 元素！");
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.1) {
                console.log("平行坐标图进入视口，触发初始化...");
                initParallelCharts().catch(err => {
                    console.error("平行坐标系图表初始化失败:", err);
                });
                observer.unobserve(section);
            }
        });
    }, {
        threshold: 0.1
    });

    observer.observe(section);
}

function setupScatterChartScrollTrigger() {
    const section = document.querySelector("#scatter-chart-section");
    if (!section) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.1) {
                console.log("散点图进入视口，触发初始化...");
                initScatterCharts();
                observer.unobserve(section);
            }
        });
    }, { threshold: 0.1 });

    observer.observe(section);
}

function setupTagChartScrollTrigger() {
    const section = document.querySelector("#tag-chart-section");
    if (!section) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.05) {
                console.log("Tag图进入视口，触发初始化...");
                initTagCharts();
                observer.unobserve(section);
            }
        });
    }, { threshold: 0.05 });

    observer.observe(section);
}

function setupDistChartAnimation(controller) {
    if (!controller) return;

    const section = document.querySelector("#distribution-section");
    // 核心修改：将事件监听器绑定到图表容器上
    const chartContainer = document.querySelector("#distribution-section .chart-container");

    let currentMode = 'fixed';

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // 滚动超过 70% 自动切换为排序模式
            if (entry.intersectionRatio > 0.7) {
                if (currentMode !== 'ranked') {
                    currentMode = 'ranked';
                    controller.updateLayout('ranked');
                }
            }
            // 滚出视口（低于 20%）重置为固定模式
            else if (entry.intersectionRatio < 0.2) {
                if (currentMode !== 'fixed') {
                    currentMode = 'fixed';
                    controller.updateLayout('fixed');
                }
            }
        });
    }, {
        threshold: [0, 0.2, 0.7, 1.0]
    });

    if (section) {
        observer.observe(section);
    }

    // 核心修改：点击图表容器手动切换模式
    if (chartContainer) {
        chartContainer.style.cursor = "pointer"; // 添加手型光标提示可点击
        chartContainer.addEventListener('click', (e) => {
            e.stopPropagation();
            const nextMode = (currentMode === 'fixed') ? 'ranked' : 'fixed';
            controller.updateLayout(nextMode);
            currentMode = nextMode;
            console.log(`手动切换模式至: ${currentMode}`);
        });
    }
}

function initScrollInteractions() {
    window.isPageInitialLoading = true;
    setTimeout(() => { window.isPageInitialLoading = false; }, 1500);
    const sections = document.querySelectorAll('section');
    const reveals = document.querySelectorAll('.reveal');

    const bgObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !window.isPageInitialLoading) {
                const targetBgId = entry.target.getAttribute('data-bg');
                if (targetBgId) {
                    const allLayers = document.querySelectorAll('.bg-layer');
                    allLayers.forEach(l => l.classList.toggle('active', l.id === targetBgId));
                }
            }
        });
    }, { threshold: 0.5 });

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    sections.forEach(section => bgObserver.observe(section));
    reveals.forEach(reveal => revealObserver.observe(reveal));

    const switchBackground = (targetId) => {
        // 同样加入保护
        if (globalInitialLoad) return;

        const allLayers = document.querySelectorAll('.bg-layer');
        allLayers.forEach(layer => {
            layer.classList.toggle('active', layer.id === targetId);
        });
    };
}

function setupFlowerScrollTrigger() {
    // 已废弃：花瓣图改为按钮控制，不再需要滚动监听
}

// 确保刷新后也能正常工作
window.addEventListener('load', () => {
    setupFlowerScrollTrigger();
});

function renderQuickStats(games, revenue) {
    if (!games || !revenue || revenue.length === 0) return;
    const totalGames = games.length;
    const latestRevenue = d3.sum(revenue, d => d.actual_revenue);
    const avgRating = d3.mean(games, d => d.favorableRate).toFixed(1);

    const stats = [
        { label: "收录作品", value: totalGames, suffix: "款" },
        { label: "2017-2024年中国客户端游戏市场年度营收", value: latestRevenue, suffix: " 亿" },
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

function buildRevenueStorySteps(revenueData) {
    const findRow = (year) => revenueData.find(d => +d.year === year);
    const macro = (year) => {
        const row = findRow(year);
        if (!row) return null;
        const revenue = (+row.actual_revenue).toFixed(1);
        const growth = (+row.growth_rate).toFixed(1);
        return `<b>实时洞察：</b>${year} 年收入约 <b>${revenue} 亿</b>，同比 <b>${growth}%</b>。`;
    };

    return [
        {
            videoIdx: 0,
            year: 2017,
            titleOverride: '2017 · 破土',
            macroText: macro(2017)
        },
        {
            videoIdx: 1,
            year: 2018,
            titleOverride: '2018 · 萌芽',
            macroText: macro(2018)
        },
        {
            videoIdx: 2,
            year: 2019,
            titleOverride: '2019· 扩张',
            macroText: macro(2019)
        },
        {
            videoIdx: 3,
            year: 2020,
            titleOverride: '2020 · 爆发前夜',
            macroText: macro(2020)
        },
        {
            videoIdx: 4,
            year: 2021,
            titleOverride: '2021 · 科幻与修仙',
            macroText: macro(2021)
        },
        {
            videoIdx: 5,
            year: 2022,
            titleOverride: '2022 · 叙事的温度',
            macroText: macro(2022)
        },
        {
            videoIdx: 6,
            year: 2023,
            titleOverride: '2023 · 创意涌现',
            macroText: macro(2023)
        },
        {
            videoIdx: 7,
            year: 2024,
            titleOverride: '2024 · 得偿所愿',
            macroText: macro(2024)
        }
    ];
}

/**
 * 监听来自 iframe (花瓣图) 的消息
 */
window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin && event.origin !== 'null') return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    // 监听花瓣图就绪信号
    if (data.type === 'flower-ready') {
        isFlowerReady = true;
        console.log("Main: 接收到花瓣图就绪信号");
        checkAndUnlock();
    }

    // 处理花瓣图高度自适应
    if (data.type === 'flowerchart-resize') {
        const iframe = document.getElementById('flowerchart-iframe');
        if (iframe) {
            const height = Number(data.height);
            const nextHeight = Math.max(window.innerHeight, height);
            iframe.style.height = `${nextHeight}px`;
        }
    }

    // 处理花瓣图内部向主页面的滚动分发
    if (data.type === 'flowerchart-scroll') {
        window.scrollBy({
            top: data.deltaY,
            behavior: 'auto'
        });
    }
});

document.addEventListener('DOMContentLoaded', initHomePage);// src/main_index.js

