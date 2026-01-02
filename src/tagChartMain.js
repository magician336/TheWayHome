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
    () => TagBubble.renderScene(4),
    
    // Step 5: 生态延续场景
    () => TagBubble.renderScene(5)   
];

function initTagScrolly() {
    const section = document.querySelector("#tag-chart-section");
    if (!section) return;

    const steps = section.querySelectorAll(".story-step");
    if (steps.length === 0) return;

    const switchTagBackground = (targetBgId) => {
        const allLayers = document.querySelectorAll('.bg-layer');
        allLayers.forEach(layer => {
            layer.classList.toggle('active', layer.id === targetBgId);
        });
    };

    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                switchTagBackground('bg-distribution');
            }
        });
    }, { threshold: 0.1 });

    sectionObserver.observe(section);

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                steps.forEach(s => s.classList.remove("active"));
                entry.target.classList.add("active");

                const stepIndex = +entry.target.getAttribute("data-step");
                const targetBgId = entry.target.getAttribute("data-bg");
                
                if (targetBgId) {
                    switchTagBackground(targetBgId);
                }
                
                if (stepIndex !== currentTagStep) {
                    currentTagStep = stepIndex;
                    if (tagScript[stepIndex]) tagScript[stepIndex]();
                }
            }
        });
    }, { threshold: 0.6 });

    steps.forEach(step => observer.observe(step));
}