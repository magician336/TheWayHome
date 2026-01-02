// tagChartMain.js

import { TagBubble } from './modules/tagsDistribution.js';

let tagChart_initialized = false;
let currentTagStep = -1;

export async function initTagCharts() {
    if (tagChart_initialized) return;

    console.log("TagChart: 初始化启动...");
    
    // 获取数据逻辑
    let data = null;
    if (window.DataManager && window.DataManager.getTagData) {
        data = window.DataManager.getTagData();
    } else {
        try { data = await d3.json("./tag_heat.json"); } catch(e) {
            console.error("TagChart: 数据加载失败", e);
        }
    }
    
    if (!data) return;

    // 初始化图表结构
    TagBubble.init(data, 'tag-viz-container');
    
    // 启动滚动监听
    initTagScrolly();
    
    // 初始状态强制重置（确保面板不出现）
    TagBubble.renderScene(0);
    
    tagChart_initialized = true;
}

/**
 * 核心剧本脚本映射
 * Step 0-3 负责自动激活特定分类展示剧情
 * Step 4 负责隐藏面板并交还控制权
 */
const tagScript = [
    // Step 0: 初始状态 (播放生长动画，隐藏面板)
    () => TagBubble.renderScene(0), 
    
    // Step 1: 自动点击激活 "角色扮演"
    () => TagBubble.renderScene(1), 
    
    // Step 2: 自动点击激活 "剧情叙事"
    () => TagBubble.renderScene(2), 
    
    // Step 3: 自动点击激活 "恐怖悬疑"
    () => TagBubble.renderScene(3),  

    // Step 4: 自由模式 - 【关键点】当滑到这一步时，执行面板消失和图表重置
    () => {
        console.log("TagChart: 进入自由探索模式，重置面板状态");
        TagBubble.renderScene(4);
    }
];

function initTagScrolly() {
    const section = document.querySelector("#tag-chart-section");
    if (!section) return;

    const steps = section.querySelectorAll(".story-step");
    if (steps.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // 更新右侧文本框的高亮状态
                steps.forEach(s => s.classList.remove("active"));
                entry.target.classList.add("active");

                const stepIndex = +entry.target.getAttribute("data-step");
                
                // 只有当步骤真正改变时才触发对应的动画脚本
                if (stepIndex !== currentTagStep) {
                    currentTagStep = stepIndex;
                    if (tagScript[stepIndex]) {
                        tagScript[stepIndex]();
                    }
                }
            }
        });
    }, { 
        // 调整触发敏感度，确保文本框进入视口 60% 后再切换状态
        threshold: 0.6,
        rootMargin: "-10% 0px -10% 0px"
    });

    steps.forEach(step => observer.observe(step));
}