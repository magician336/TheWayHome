// src/main_index.js

import { createRevenueChart } from './revenue.js';
import { createDistributionChart } from './user_dist.js';
import { initParallelCharts } from './parallelChartMain.js';
import { initScatterCharts } from './scatterChartMain.js';
import { initTagCharts } from './tagChartMain.js';
// 修改导入：引入 Video 版本的模块
import { TreeVideoScrolly } from './modules/treeVideoScrolly.js';

window.initParallelCharts = initParallelCharts;

async function initHomePage() {
    try {
        console.log("Main: 初始化首页...");
        initScrollInteractions();

        console.log("Main: 加载数据中...");
        const [games, revenueData, rawdistData] = await Promise.all([
            d3.json("./games.json").catch(err => { console.warn("Games load failed:", err); return []; }),
            d3.csv("./data/revenue.csv").catch(err => { console.warn("Revenue load failed:", err); return []; }),
            d3.csv("./data/user_distribution.csv").catch(err => { console.warn("UserDist load failed:", err); return []; })
        ]);

        console.log("Main: 数据加载完成。");

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

        renderQuickStats(games, revenueData);

        // --- 核心逻辑修改区域 ---

        // 1. 创建图表并获取控制器
        const revenueChartController = createRevenueChart(revenueData);

        // 2. 初始化视频 Scrolly 模块
        if (revenueChartController) {
            new TreeVideoScrolly({
                videoSelector: '#tree-video',       // 视频元素 ID
                containerSelector: '#revenue-section', // 滚动容器 ID
                chartController: revenueChartController,
                data: revenueData
            });
        }
        // -----------------------

        const distChartController = createDistributionChart(distData);
        setupDistChartAnimation(distChartController);

        setupParallelChartScrollTrigger();
        setupScatterChartScrollTrigger();
        setupTagChartScrollTrigger();

    } catch (err) {
        console.error("首页初始化失败:", err);
    }
}

// ... (setupParallelChartScrollTrigger, setupDistChartAnimation 等后续辅助函数保持不变) ...
/**
 * 核心修复：平行坐标图滚动触发器
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
    let currentMode = 'fixed';

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.intersectionRatio > 0.7) {
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
        section.addEventListener('click', (e) => {
            e.stopPropagation();
            const nextMode = (currentMode === 'fixed') ? 'ranked' : 'fixed';
            controller.updateLayout(nextMode);
            currentMode = nextMode;
        });
    }
}

function initScrollInteractions() {
    const sections = document.querySelectorAll('section');
    const reveals = document.querySelectorAll('.reveal');

    const bgObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const targetBgId = entry.target.getAttribute('data-bg');
                if (targetBgId) switchBackground(targetBgId);
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

    function switchBackground(targetId) {
        const allLayers = document.querySelectorAll('.bg-layer');
        allLayers.forEach(layer => {
            if (layer.id === targetId) layer.classList.add('active');
            else layer.classList.remove('active');
        });
    }
}

function renderQuickStats(games, revenue) {
    if (!games || !revenue || revenue.length === 0) return;
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