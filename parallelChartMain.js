// parallelChartMain.js

import { ParallelCoordinates } from './modules/parallelCoordinates.js';

let parallelChart_initialized = false;
let currentStepIndex = -1;
let lastScrollTime = 0; 
const SCROLL_COOLDOWN = 800; 
let transitionTimer = null;
let isFirstLoad = true; // 【新增】标记是否为首次加载

// 定义每个步骤的“阅读等待时间”
const STEP_DELAYS = [
    500,  
    800, 
    800, 
    800,  
    500   
];

export async function initParallelCharts() {
    if (parallelChart_initialized) return;
    console.log("ParallelChart: 初始化...");
    
    await parallelChart_loadData();
    initParallelScrolly();
    
    // 强制触发第一帧
    setTimeout(() => {
        // Scrolly逻辑由 Observer 触发，但为了保险，如果用户停在 Step 0，
        // 我们不在这里手动调用 scrollyScript[0]，因为那会打断动画。
        // Observer 会自动处理。
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
        // 【关键修复】如果是首次加载，initChart 已经在播放动画了，不要打断它！
        if (isFirstLoad) {
            console.log("ParallelChart: Skipping Step 0 render to allow intro animation.");
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
        
        // 【关键修复】自由模式初始颜色强制设为 'year'，而不是读取之前的状态
        // 这样可以避免从 Step 3 继承 'favorable_rate'
        const initialColor = 'year'; 
        
        // 同步 UI
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
                colorSel.onchange = null; // 先解绑
                colorSel.onchange = () => {
                    // 仅在 Step 4 有效
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

        // 从自由模式回滚时的清理逻辑
        if (targetIndex !== 4 && isCurrentlyFreeMode) {
            console.log("ParallelChart: Back from Free Mode. Resetting...");
            wrapper.classed("free-mode-height", false); 
            toggleDashboardControls(false); 
            
            const colorSel = document.getElementById("parallel-chart-colorSelect");
            if(colorSel) colorSel.onchange = null;

            forceReInitChart();
            // 重置后 isFirstLoad 会变成 true (因为 forceReInit 调用的 initChart 不带参数可能不会重置 flag，
            // 但这里我们希望回滚后正常渲染，不需要动画)
            // 修正：forceReInitChart 内部调用的 init 默认带动画，这里我们手动把 isFirstLoad 关掉，以免回滚时又播一次长动画影响体验
            // 或者保留动画看你喜好。这里保留动画效果：
            isFirstLoad = false; // 回滚时不需要“跳过Step0”，直接渲染即可
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

function forceReInitChart() {
    if(!window.DataManager.getData()) return;
    
    const colorSelect = document.getElementById('parallel-chart-colorSelect');
    if (colorSelect) {
        colorSelect.value = "year"; 
    }

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