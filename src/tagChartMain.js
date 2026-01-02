// tagChartMain.js

import { TagBubble } from './modules/tagsDistribution.js';

let tagChart_initialized = false;
let currentTagStep = -1;

export async function initTagCharts() {
    if (tagChart_initialized) return;

    console.log("TagChart: 初始化...");
    
    // 获取数据
    let data = null;
    if (window.DataManager && window.DataManager.getTagData) {
        data = window.DataManager.getTagData();
    } else {
        try { data = await d3.json("./tag_heat.json"); } catch(e) {}
    }
    
    if (!data) return;

    // 初始化图表
    TagBubble.init(data, 'tag-viz-container');
    
    // 启动滚动监听
    initTagScrolly();
    
    // 强制渲染第一帧 (Step 0)
    TagBubble.renderScene(0);
    
    tagChart_initialized = true;
}

// 【关键修改】定义剧本脚本
const tagScript = [
    // Step 0: 播放生长动画 (圆环 + 叶子)
    () => TagBubble.renderScene(0), 
    
    // Step 1: 自动点击 "角色扮演"
    () => TagBubble.renderScene(1), 
    
    // Step 2: 自动点击 "剧情叙事"
    () => TagBubble.renderScene(2), 
    
    // Step 3: 自动点击 "恐怖悬疑" (假设数据里叫这个名字，如果不对应需检查JSON key)
    () => TagBubble.renderScene(3),  

    // Step 4: 自由模式 (重置高亮，交还控制权)
    () => TagBubble.renderScene(4)   
];

function initTagScrolly() {
    const section = document.querySelector("#tag-chart-section");
    if (!section) return;

    // 选择所有的 story-step
    const steps = section.querySelectorAll(".story-step");
    if (steps.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // UI 状态更新
                steps.forEach(s => s.classList.remove("active"));
                entry.target.classList.add("active");

                const stepIndex = +entry.target.getAttribute("data-step");
                
                // 触发对应的脚本
                if (stepIndex !== currentTagStep) {
                    currentTagStep = stepIndex;
                    if (tagScript[stepIndex]) tagScript[stepIndex]();
                }
            }
        });
    }, { threshold: 0.6 }); // 0.6 意味着卡片进入 60% 时触发

    steps.forEach(step => observer.observe(step));
}