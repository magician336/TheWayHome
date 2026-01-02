// parallelChartMain.js

import { ParallelCoordinates } from './modules/parallelCoordinates.js';

let parallelChart_initialized = false;
let currentStepIndex = -1;
let lastScrollTime = 0; 
const SCROLL_COOLDOWN = 800; 
let transitionTimer = null;
let isFirstLoad = true; 

const STEP_DELAYS = [500, 800, 800, 800, 500];

export async function initParallelCharts() {
    if (parallelChart_initialized) return;
    
    await parallelChart_loadData();
    initParallelScrolly();
    
    setTimeout(() => {
        const steps = document.querySelectorAll("#parallel-chart-dashboard .story-step");
        if(steps[0]) steps[0].classList.add("active");
    }, 200);
    
    parallelChart_initialized = true;
}

async function parallelChart_loadData() {
    let data = window.DataManager ? window.DataManager.getData() : null;
    if (!data || data.length === 0) {
        try { await window.DataManager.loadData(); } catch (e) { console.error(e); }
    }
    
    if (window.DataManager.getData()) {
        ParallelCoordinates.init(
            window.DataManager.getData(),
            ["year", "original_price", "discount_strength", "favorable_rate", "log_players", "retention_days"],
            window.DataManager.getNameMap(),
            'parallel-chart-main-container',
            {
                colorSelectId: 'parallel-chart-colorSelect', 
                searchNameId: 'parallel-chart-searchName', 
                selectYearId: 'parallel-chart-selectYear', 
                exitFocusBtnId: 'parallel-chart-exitFocusBtn'
            }
        );
    }
}

function toggleDashboardControls(show) {
    const dashboard = document.querySelector("#parallel-chart-dashboard");
    if (!dashboard) return;
    if (show) {
        dashboard.classList.remove("controls-hidden");
        dashboard.classList.add("controls-visible");
    } else {
        dashboard.classList.add("controls-hidden");
        dashboard.classList.remove("controls-visible");
    }
}

const scrollyScript = [
    // Step 0: 入场
    () => {
        if (isFirstLoad) {
            isFirstLoad = false;
            toggleDashboardControls(false);
            return;
        }
        ParallelCoordinates.renderScene({
            mode: 'story',
            dimensions: ["year", "original_price", "discount_strength", "favorable_rate", "log_players", "retention_days"],
            colorBy: 'year', 
            focusAxes: null
        });
        toggleDashboardControls(false);
    },
    // Step 1: 售价 vs 好评
    () => {
        ParallelCoordinates.renderScene({
            mode: 'story',
            dimensions: ["year", "discount_strength", "original_price", "favorable_rate", "log_players", "retention_days"],
            colorBy: 'year',
            focusAxes: [2, 3]
        });
        toggleDashboardControls(false);
    },
    // Step 2: 折扣 vs 留存
    () => {
        ParallelCoordinates.renderScene({
            mode: 'story',
            dimensions: ["year", "original_price", "discount_strength", "retention_days", "log_players", "favorable_rate"],
            colorBy: 'year',
            focusAxes: [2, 3]
        });
        toggleDashboardControls(false);
    },
    // Step 3: 口碑效应
    () => {
        ParallelCoordinates.renderScene({
            mode: 'story',
            dimensions: ["year", "original_price", "discount_strength", "favorable_rate", "log_players", "retention_days"],
            colorBy: 'favorable_rate',
            focusAxes: null
        });
        toggleDashboardControls(false);
    },
    // Step 4: 自由模式
    () => {
        ParallelCoordinates.resetObserverMode();
        const initialColor = 'year'; 
        const colorSel = document.getElementById("parallel-chart-colorSelect");
        if(colorSel) colorSel.value = initialColor;

        ParallelCoordinates.renderScene({
            mode: 'free',
            dimensions: ["year", "original_price", "discount_strength", "favorable_rate", "log_players", "retention_days"],
            colorBy: initialColor,
            focusAxes: null
        });
        
        const wrapper = d3.select("#parallel-chart-main-wrapper");
        if (!wrapper.classed("free-mode-height")) {
            wrapper.classed("free-mode-height", true); 
            toggleDashboardControls(true); 
            
            const btn = document.getElementById("parallel-chart-exitFocusBtn");
            if (btn) btn.onclick = () => ParallelCoordinates.toggleObserverMode();
            
            if(colorSel) {
                colorSel.onchange = null;
                colorSel.onchange = () => {
                    if (currentStepIndex === 4) {
                        ParallelCoordinates.renderScene({ mode: 'free', dimensions: null, colorBy: colorSel.value });
                    }
                };
            }
        }
    }
];

export function initParallelScrolly() {
    const dashboardContainer = document.querySelector("#parallel-chart-dashboard");
    if (!dashboardContainer) return;
    
    const steps = dashboardContainer.querySelectorAll(".story-step");
    if (steps.length === 0) return;

    const executeStep = (targetIndex) => {
        if (window.Utils) d3.select("#parallel-chart-shared-tooltip").style("opacity", 0);
        const wrapper = d3.select("#parallel-chart-main-wrapper");
        const isCurrentlyFreeMode = wrapper.classed("free-mode-height");

        // 【关键修复点】回滚逻辑
        if (targetIndex !== 4 && isCurrentlyFreeMode) {
            wrapper.classed("free-mode-height", false); 
            toggleDashboardControls(false); 
            
            // 强制触发浏览器重绘布局，确保 clientHeight 刷新
            void wrapper.node().offsetHeight; 

            // 不再调用 forceReInitChart()（这会因为高度中间态导致压缩）
            // 而是通过 renderScene 恢复状态
            ParallelCoordinates.renderScene({
                mode: 'story',
                dimensions: ["year", "original_price", "discount_strength", "favorable_rate", "log_players", "retention_days"],
                colorBy: 'year', 
                focusAxes: null
            });
            
            // 重置 colorSelect UI
            const colorSel = document.getElementById("parallel-chart-colorSelect");
            if(colorSel) {
                colorSel.value = "year";
                colorSel.onchange = null;
            }
        }

        if (scrollyScript[targetIndex]) scrollyScript[targetIndex]();

        steps.forEach(s => s.classList.remove("active"));
        const delay = STEP_DELAYS[targetIndex] || 600;
        
        if (transitionTimer) clearTimeout(transitionTimer);
        transitionTimer = setTimeout(() => {
            const stepEl = dashboardContainer.querySelector(`.story-step[data-step="${targetIndex}"]`);
            if(stepEl) stepEl.classList.add("active");
        }, delay);
        
        currentStepIndex = targetIndex;
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const index = +entry.target.getAttribute("data-step");
                const now = Date.now();
                if (index !== 4 && index !== 0 && (now - lastScrollTime < SCROLL_COOLDOWN)) return; 
                lastScrollTime = now;
                executeStep(index);
            }
        });
    }, { 
        rootMargin: "-45% 0px -45% 0px", 
        threshold: 0
    }); 

    steps.forEach(step => observer.observe(step));
}