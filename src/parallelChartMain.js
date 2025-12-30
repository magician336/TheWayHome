// parallelChartMain.js

// 1. 【核心修改】引入 ParallelCoordinates 模块
import { ParallelCoordinates } from './modules/parallelCoordinates.js';

// 标记初始化状态
let parallelChart_initialized = false;
let currentStepIndex = -1;
let textRevealTimer = null; 
let lastScrollTime = 0; 
const SCROLL_COOLDOWN = 1200; // 滚动冷却时间

export async function initParallelCharts() {
    if (parallelChart_initialized) return;
    console.log("ParallelChart: 初始化场景管理器...");
    
    await parallelChart_loadData();
    initParallelScrolly();
    
    // 强制初始化第一帧
    setTimeout(() => {
        if(scrollyScript[0]) scrollyScript[0]();
    }, 200);
    
    parallelChart_initialized = true;
}

async function parallelChart_loadData() {
    // 使用 window.DataManager 获取数据 (假设 DataManager 仍挂载在 window 上)
    let data = window.DataManager ? window.DataManager.getData() : null;
    if (!data || data.length === 0) {
        try { await window.DataManager.loadData(); } catch (e) { console.error(e); }
    }
    
    // 初始化图表结构
    if (window.DataManager.getData()) {
        // 【核心修改】直接调用模块方法，无需 window. 前缀
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

function showStoryText(stepIndex) {
    const stepEl = document.querySelector(`.story-step[data-step="${stepIndex}"] .story-card`);
    if(!stepEl) return;
    stepEl.classList.remove("visible");
    stepEl.classList.add("waiting");
    if (textRevealTimer) clearTimeout(textRevealTimer);
    textRevealTimer = setTimeout(() => {
        if (currentStepIndex === stepIndex) {
            stepEl.classList.remove("waiting");
            stepEl.classList.add("visible");
        }
    }, 500); 
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

// === 核心剧本：使用 renderScene API ===
const scrollyScript = [
    // Step 0: 入场
    () => {
        ParallelCoordinates.renderScene({
            mode: 'story',
            dimensions: ["year", "original_price", "discount_strength", "favorable_rate", "log_players", "retention_days"],
            colorBy: 'year',
            focusAxes: null
        });
        toggleDashboardControls(false);
        showStoryText(0);
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
        showStoryText(1);
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
        showStoryText(2);
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
        showStoryText(3);
    },
    
    // Step 4: 自由模式
    () => {
        // [核心修改] 直接调用模块方法
        ParallelCoordinates.resetObserverMode();
        
        ParallelCoordinates.renderScene({
            mode: 'free',
            dimensions: ["year", "original_price", "discount_strength", "favorable_rate", "log_players", "retention_days"],
            colorBy: 'favorable_rate'
        });
        toggleDashboardControls(true);
        showStoryText(4);
        
        // 扩展容器高度，并触发重绘
        const wrapper = d3.select("#parallel-chart-main-wrapper");
        
        // 只有当尚未进入 free-mode-height 状态时才执行重绘，避免重复抖动
        if (!wrapper.classed("free-mode-height")) {
            wrapper.classed("free-mode-height", true);
            
            // 延时重绘以适应新高度
            setTimeout(() => {
                    // 重新初始化图表以利用新高度
                    if(window.DataManager.getData()) {
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
                        // 重新应用自由模式配置
                        ParallelCoordinates.renderScene({
                            mode: 'free',
                            dimensions: null, 
                            colorBy: document.getElementById("parallel-chart-colorSelect")?.value || 'favorable_rate'
                        });
                    }
            }, 300);
        }
        
        const btn = document.getElementById("parallel-chart-exitFocusBtn");
        if (btn) {
            btn.style.display = "inline-flex"; 
            btn.innerText = "进入观察者模式";
            btn.classList.remove("active"); 
            btn.classList.add("parallel-chart-button"); 
            
            btn.onclick = () => {
                ParallelCoordinates.toggleObserverMode();
            };
        }
        
        const colorSel = document.getElementById("parallel-chart-colorSelect");
        if(colorSel) {
            colorSel.value = "favorable_rate";
            colorSel.onchange = () => {
                ParallelCoordinates.renderScene({
                    mode: 'free',
                    dimensions: null, 
                    colorBy: colorSel.value
                });
            };
        }
        
        const searchIn = document.getElementById("parallel-chart-searchName");
        if(searchIn) {
            searchIn.oninput = () => {
                ParallelCoordinates.renderScene({ mode: 'free', dimensions: null, colorBy: null });
            };
        }
        const yearSel = document.getElementById("parallel-chart-selectYear");
        if(yearSel) {
            yearSel.onchange = () => {
                    ParallelCoordinates.renderScene({ mode: 'free', dimensions: null, colorBy: null });
            }
        }
    }
];

let transitionTimer = null;

export function initParallelScrolly() {
    const dashboardContainer = document.querySelector("#parallel-chart-dashboard");
    if (!dashboardContainer) return;
    
    const steps = dashboardContainer.querySelectorAll(".story-step");
    if (steps.length === 0) return;

    // 核心执行器
    const executeStep = (targetIndex) => {
        // A. 基础清理
        if (window.Utils) d3.select("#parallel-chart-shared-tooltip").style("opacity", 0);

        // B. 获取当前 DOM 状态
        const wrapper = d3.select("#parallel-chart-main-wrapper");
        const isCurrentlyFreeMode = wrapper.classed("free-mode-height");

        // C. 更新侧边栏高亮
        steps.forEach(s => s.classList.remove("active"));
        const stepEl = dashboardContainer.querySelector(`.story-step[data-step="${targetIndex}"]`);
        if(stepEl) stepEl.classList.add("active");
        
        // 更新全局索引
        currentStepIndex = targetIndex;

        // === D. 状态机逻辑 ===

        // 场景 1: 目标是 Step 4 (自由模式)
        if (targetIndex === 4) {
            // 如果已经是自由模式，直接 return！
            if (isCurrentlyFreeMode) {
                console.log("ParallelChart: 保持自由模式，忽略重绘");
                return; 
            }

            // 否则：进入自由模式
            console.log("ParallelChart: 进入自由模式");
            wrapper.classed("free-mode-height", true); // 展开高度
            toggleDashboardControls(true); // 显示控件
            
            // 等待 CSS 动画结束再重绘
            if (transitionTimer) clearTimeout(transitionTimer);
            transitionTimer = setTimeout(() => {
                forceReInitChart(); 
                if (scrollyScript[4]) scrollyScript[4]();
            }, 500); 
        } 
        
        // 场景 2: 目标是 Step 0, 1, 2, 3
        else {
            // 如果当前是自由模式（说明是从 Step 4 往上回滚的）
            if (isCurrentlyFreeMode) {
                console.log("ParallelChart: 退出自由模式");
                wrapper.classed("free-mode-height", false); // 收缩高度
                toggleDashboardControls(false); // 隐藏控件

                if (transitionTimer) clearTimeout(transitionTimer);
                transitionTimer = setTimeout(() => {
                    forceReInitChart();
                    if (scrollyScript[targetIndex]) scrollyScript[targetIndex]();
                }, 500);
            } 
            // 如果是普通切换
            else {
                if (scrollyScript[targetIndex]) scrollyScript[targetIndex]();
            }
        }
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const index = +entry.target.getAttribute("data-step");
                
                // 简单的防抖 (Step 4 除外)
                const now = Date.now();
                if (index !== 4 && index !== 0 && (now - lastScrollTime < 800)) return; 
                lastScrollTime = now;

                executeStep(index);
            }
        });
    }, { threshold: 0.5 }); 

    steps.forEach(step => observer.observe(step));
}

// 辅助函数
function forceReInitChart() {
    if(!window.DataManager.getData()) return;
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