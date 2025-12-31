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

    // 初始化
    TagBubble.init(data, 'tag-viz-container');
    
    // 启动滚动监听
    initTagScrolly();
    
    // 强制第一帧
    TagBubble.renderScene(0);
    tagChart_initialized = true;
}

const tagScript = [
    () => TagBubble.renderScene(0), // Soil
    () => TagBubble.renderScene(1), // Bloom
    () => TagBubble.renderScene(2), // Roots (Demo)
    () => TagBubble.renderScene(3)  // Freedom
];

function initTagScrolly() {
    const section = document.querySelector("#tag-chart-section");
    if (!section) return;

    const steps = section.querySelectorAll(".story-step");
    if (steps.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                steps.forEach(s => s.classList.remove("active"));
                entry.target.classList.add("active");

                const stepIndex = +entry.target.getAttribute("data-step");
                
                if (stepIndex !== currentTagStep) {
                    currentTagStep = stepIndex;
                    if (tagScript[stepIndex]) tagScript[stepIndex]();
                }
            }
        });
    }, { threshold: 0.6 });

    steps.forEach(step => observer.observe(step));
}