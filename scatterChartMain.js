// scatterChartMain.js

import { ScatterPlot } from './modules/scatterPlot.js';

let scatter_initialized = false;
let currentStep = -1;

export async function initScatterCharts() {
    if (scatter_initialized) return;
    
    let data = window.DataManager ? window.DataManager.getData() : null;
    
    if (!data || data.length === 0) {
        setTimeout(initScatterCharts, 500);
        return;
    }

    console.log("Scatter: 初始化成功");
    
    injectScatterControls();
    injectFreeModeStep();
    
    ScatterPlot.init(data, window.DataManager.getNameMap(), 'scatter-viz-container');
    initScatterScrolly();
    
    if(scatterScript[0]) scatterScript[0]();
    
    scatter_initialized = true;
}

const scatterScript = [
    () => { ScatterPlot.renderScene({ mode: 'scatter', xKey: 'year', yKey: 'max_players', colorBy: 'year', colorTitle: '发售年份', xTitle: '发售年份', yTitle: '在线人数 (10^x)' }); },
    () => { ScatterPlot.renderScene({ mode: 'scatter', xKey: 'original_price', yKey: 'favorable_rate', colorBy: 'favorable_rate', colorTitle: '好评率 (%)', xTitle: '原价 (CNY)', yTitle: '好评率 (%)' }); },
    () => { ScatterPlot.renderScene({ mode: 'scatter', xKey: 'discount_strength', yKey: 'retention_days', colorBy: 'discount_strength', colorTitle: '折扣力度指数', xTitle: '折扣力度指数', yTitle: '留存天数 (天)' }); },
    () => { ScatterPlot.renderScene({ mode: 'matrix', xKey: 'discount_frequency', yKey: 'avg_discount_rate', colorBy: 'year', colorTitle: '发售年份', xTitle: '打折频率 (次/年)', yTitle: '平均折扣 (%)' }); },
    () => {
        d3.select("#scatter-controls").style("display", "flex");
        d3.select("#scatter-chart-wrapper").classed("free-mode-height", true);
        setTimeout(() => {
            ScatterPlot.resize(); 
            const xSel = d3.select("#scatter-x-select");
            if (!xSel.empty()) xSel.dispatch("change");
        }, 300);
    }
];

function initScatterScrolly() {
    const steps = document.querySelectorAll("#scatter-chart-section .story-step");
    if (steps.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                steps.forEach(s => s.classList.remove("active"));
                entry.target.classList.add("active");
                
                const stepIndex = +entry.target.getAttribute("data-step");
                if (stepIndex !== currentStep) {
                    currentStep = stepIndex;
                    if (scatterScript[stepIndex]) scatterScript[stepIndex]();
                }

                const wrapper = d3.select("#scatter-chart-wrapper");
                if (stepIndex === 4) {
                    d3.select("#scatter-controls").style("display", "flex");
                    wrapper.classed("free-mode-height", true);
                } else {
                    d3.select("#scatter-controls").style("display", "none");
                    wrapper.classed("free-mode-height", false);
                    setTimeout(() => ScatterPlot.resize(), 300); 
                }
            }
        });
    }, { threshold: 0.6 }); 

    steps.forEach(step => observer.observe(step));
}

function injectScatterControls() {
    const container = d3.select("#scatter-chart-wrapper");
    if (container.select("#scatter-controls").empty()) {
        // 【核心修改】这里注入的 Class 换成了 scatter-chart-input-group
        const controls = container.insert("div", ":first-child")
            .attr("id", "scatter-controls")
            .attr("class", "scatter-chart-input-group") // <--- CHANGED
            .style("display", "none");

        const options = [
            {k: 'year', l: '发售年份'},
            {k: 'original_price', l: '原价 (CNY)'},
            {k: 'favorable_rate', l: '好评率 (%)'},
            {k: 'max_players', l: '在线峰值 (人)'},
            {k: 'discount_strength', l: '折扣力度 (指数)'},
            {k: 'retention_days', l: '留存天数 (天)'},
            {k: 'discount_frequency', l: '打折频率 (次/年)'},
            {k: 'avg_discount_rate', l: '平均折扣 (%)'}
        ];

        const getLabel = (k) => {
            const f = options.find(o => o.k === k);
            return f ? f.l : k;
        };

        controls.append("span").text("X轴: ");
        // 【核心修改】Select 换成 scatter-chart-select
        const xSel = controls.append("select").attr("class", "scatter-chart-select").attr("id", "scatter-x-select"); // <--- CHANGED
        xSel.selectAll("option").data(options).enter().append("option").attr("value", d=>d.k).text(d=>d.l);
        xSel.property("value", "discount_frequency");

        controls.append("span").text("Y轴: ").style("margin-left", "10px");
        const ySel = controls.append("select").attr("class", "scatter-chart-select").attr("id", "scatter-y-select"); // <--- CHANGED
        ySel.selectAll("option").data(options).enter().append("option").attr("value", d=>d.k).text(d=>d.l);
        ySel.property("value", "avg_discount_rate");

        controls.append("span").text("颜色: ").style("margin-left", "10px");
        const cSel = controls.append("select").attr("class", "scatter-chart-select").attr("id", "scatter-c-select"); // <--- CHANGED
        cSel.selectAll("option").data(options).enter().append("option").attr("value", d=>d.k).text(d=>d.l);
        cSel.property("value", "year");

        const update = () => {
            const xVal = xSel.property("value");
            const yVal = ySel.property("value");
            const cVal = cSel.property("value");
            ScatterPlot.renderScene({
                mode: (xVal === 'discount_frequency' && yVal === 'avg_discount_rate') ? 'matrix' : 'scatter',
                xKey: xVal, yKey: yVal, colorBy: cVal,
                xTitle: getLabel(xVal), yTitle: getLabel(yVal), colorTitle: getLabel(cVal)
            });
        };

        xSel.on("change", update);
        ySel.on("change", update);
        cSel.on("change", update);

        // 【核心修改】Button 换成 scatter-chart-button
        controls.append("button")
            .attr("class", "scatter-chart-button") // <--- CHANGED
            .style("margin-left", "15px")
            .text("📊 切换至策略视图")
            .on("click", function() {
                const btn = d3.select(this);
                const isMatrix = btn.text().includes("策略");
                if (isMatrix) {
                    xSel.property("value", "discount_frequency").attr("disabled", true);
                    ySel.property("value", "avg_discount_rate").attr("disabled", true);
                    cSel.property("value", "year"); 
                    btn.text("🔙 返回散点视图");
                    btn.classed("active", true);
                } else {
                    xSel.property("value", "original_price").attr("disabled", null);
                    ySel.property("value", "favorable_rate").attr("disabled", null);
                    btn.text("📊 切换至策略视图");
                    btn.classed("active", false);
                }
                update();
            });

        controls.append("div")
            .attr("id", "scatter-legend-container")
            .style("margin-left", "auto")
            .style("display", "flex");
    }
}

function injectFreeModeStep() {
    const container = d3.select("#scatter-chart-dashboard .scrolly-story-container");
    if (container.select("[data-step='4']").empty()) {
        const step = container.append("div").attr("class", "story-step").attr("data-step", "4");
        step.append("div").attr("class", "story-card").html(`
                <h3>自由探索实验室</h3>
                <p>这里没有预设的剧本。请随意切换坐标轴和颜色，探索数据背后未被发现的规律。</p>
                <p>比如：<b>折扣力度</b>真的能带来更高的<b>在线峰值</b>吗？</p>
            `);
        container.append("div").style("height", "40vh");
    }
}