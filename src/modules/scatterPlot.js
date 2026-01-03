// modules/scatterPlot.js

const MARGIN = { top: 20, right: 20, bottom: 70, left: 60 };

let _canvas = null;
let _ctx = null;
let _svg = null;
let _axisGroup = null;
let _bgGroup = null;

let _width = 0, _height = 0;
let _xScale = null, _yScale = null;
let _particles = [];
let _timer = null;
let _data = [];
let _nameMap = {};
let _currentMode = 'scatter'; 
let _hoveredParticle = null;

const ScatterPlot = {
    init: initChart,
    renderScene: renderScene,
    resize: resizeChart
};

function initChart(data, nameMap, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    _data = data;
    _nameMap = nameMap;
    
    container.innerHTML = "";
    container.style.position = 'relative';

    updateDimensions(container);

    _canvas = d3.select(container).append("canvas")
        .attr("width", _width).attr("height", _height)
        .style("position", "absolute").style("top", 0).style("left", 0)
        .style("z-index", 10).style("pointer-events", "all")
        .node();
    _ctx = _canvas.getContext('2d');

    _svg = d3.select(container).append("svg")
        .attr("width", _width).attr("height", _height)
        .attr("class", "scatter-chart-svg")
        .style("position", "absolute").style("top", 0).style("left", 0)
        .style("z-index", 5).style("pointer-events", "none");

    _bgGroup = _svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
    _axisGroup = _svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    _axisGroup.append("g").attr("class", "x-axis");
    _axisGroup.append("g").attr("class", "y-axis");
    
    _axisGroup.append("text").attr("class", "x-label")
        .attr("text-anchor", "middle").style("font-size", "12px").style("fill", "#666").style("font-weight", "bold");
    _axisGroup.append("text").attr("class", "y-label")
        .attr("text-anchor", "middle").style("font-size", "12px").style("fill", "#666").style("font-weight", "bold")
        .attr("transform", "rotate(-90)");

    // 1:1 复刻初始化逻辑：粒子从中心点出发
    _particles = data.map(d => ({
        data: d,
        x: _width/2, y: _height/2, 
        tx: _width/2, ty: _height/2, 
        r: 4, color: "#ccc",
        delay: Math.random() * 0.5 
    }));

    if (_timer) _timer.stop();
    _timer = d3.timer(renderLoop);

    d3.select(_canvas)
        .on("mousemove", (e) => handleMouseMove(e, container))
        .on("mouseout", () => { 
            _hoveredParticle = null; 
            if(window.Utils) d3.select("#parallel-chart-shared-tooltip").style("opacity", 0); 
        });
}

function updateDimensions(container) {
    const rect = container.getBoundingClientRect();
    _width = rect.width;
    _height = rect.height;
    if (_height === 0) { _height = 600; container.style.height = "600px"; }
}

function resizeChart() {
    const container = _canvas.parentElement;
    if (!container) return;
    
    updateDimensions(container);
    
    d3.select(_canvas).attr("width", _width).attr("height", _height);
    _svg.attr("width", _width).attr("height", _height);
}

function renderScene(config) {
    const { colorTitle } = config; 
    if (!_canvas) return;

    const container = _canvas.parentElement;
    
    const d3Container = d3.select(container);
    const isFreeMode = config.stepIndex === 4 || config.isFreeMode; 
    
    d3Container.classed("free-mode-height", isFreeMode);
    
    let resizeTimer = setInterval(() => resizeChart(), 16); 
    setTimeout(() => clearInterval(resizeTimer), 600); 

    const { xKey, yKey, mode, colorBy, xTitle, yTitle } = config;
    _currentMode = mode || 'scatter';

    const iW = _width - MARGIN.left - MARGIN.right;
    const iH = _height - MARGIN.top - MARGIN.bottom;

    let xFormat, yFormat, xTransform, yTransform;
    
    if (_currentMode === 'matrix') {
        _xScale = d3.scaleLinear().domain([-0.5, 10.5]).range([0, iW]); 
        _yScale = d3.scaleLinear().domain([-0.05, 0.6]).range([iH, 0]); 
        xFormat = d => d < 0 ? "" : d;
        yFormat = d => (d < 0 ? "" : (d*100).toFixed(0) + "%");
        xTransform = d => d;
        yTransform = d => d;
    } else {
        const xCfg = getScaleConfig(xKey, [0, iW], _data);
        _xScale = xCfg.scale;
        xFormat = xCfg.format;
        xTransform = xCfg.transform;

        const yCfg = getScaleConfig(yKey, [iH, 0], _data);
        _yScale = yCfg.scale;
        yFormat = yCfg.format;
        yTransform = yCfg.transform;
    }

    const t = _svg.transition().duration(800).ease(d3.easeCubicOut);
    
    let xAxisGen = d3.axisBottom(_xScale).ticks(8);
    let yAxisGen = d3.axisLeft(_yScale).ticks(6);
    
    xAxisGen.tickFormat(xFormat);
    yAxisGen.tickFormat(yFormat);

    _axisGroup.select(".x-axis").transition(t).attr("transform", `translate(0,${iH})`).call(xAxisGen);
    _axisGroup.select(".y-axis").transition(t).call(yAxisGen);
    
    _axisGroup.select(".x-label").transition(t).attr("x", iW/2).attr("y", iH + 35)
        .text(xTitle || _nameMap[xKey] || xKey);
    _axisGroup.select(".y-label").transition(t).attr("x", -iH/2).attr("y", -45)
        .text(yTitle || _nameMap[yKey] || yKey);

    updateMatrixBackground(_currentMode, iW, iH, _xScale, _yScale);

    // 【新增功能】绘制线性回归直线 (当 X 轴为 'year' 时)
    drawRegressionLine(_currentMode, xKey, yKey, xTransform, yTransform);

    const cScale = getCustomColorScale(colorBy); 

    _particles.forEach(p => {
        const d = p.data;
        if (_currentMode === 'matrix') {
            p.tx = _xScale(d.discount_frequency);
            p.ty = _yScale(d.avg_discount_rate > 0.5 ? 0.5 : d.avg_discount_rate);
        } else {
            p.tx = _xScale(xTransform(d[xKey]));
            p.ty = _yScale(yTransform(d[yKey]));
        }
        p.targetColor = cScale(d[colorBy]);
    });
    
    renderLegend(colorBy, colorTitle);
}

// 【新增】绘制回归直线函数
function drawRegressionLine(mode, xKey, yKey, xTransform, yTransform) {
    // 1. 清理旧线
    _bgGroup.selectAll(".regression-line-group").transition().duration(500).style("opacity", 0).remove();

    // 仅在非矩阵模式且 X 轴为年份时绘制
    if (mode === 'matrix' || xKey !== 'year') return;

    // 2. 准备回归数据 (应用 Transform 确保对数轴等逻辑正确)
    const points = _data.map(d => ({
        x: xTransform(d[xKey]),
        y: yTransform(d[yKey])
    })).filter(p => !isNaN(p.x) && !isNaN(p.y));

    if (points.length < 2) return;

    // 3. 计算线性回归 (最小二乘法)
    const xMean = d3.mean(points, p => p.x);
    const yMean = d3.mean(points, p => p.y);
    const num = d3.sum(points, p => (p.x - xMean) * (p.y - yMean));
    const den = d3.sum(points, p => (p.x - xMean) ** 2);

    if (den === 0) return;

    const slope = num / den;
    const intercept = yMean - slope * xMean;

    // 4. 计算线条端点 (基于 X 轴 Domain)
    const xDomain = _xScale.domain();
    const x1 = xDomain[0];
    const y1 = slope * x1 + intercept;
    const x2 = xDomain[1];
    const y2 = slope * x2 + intercept;

    // 5. 绘制线条
    const group = _bgGroup.append("g").attr("class", "regression-line-group");
    
    group.append("line")
        .attr("x1", _xScale(x1))
        .attr("y1", _yScale(y1))
        .attr("x2", _xScale(x2))
        .attr("y2", _yScale(y2))
        .style("stroke", "var(--accent-color)") // 使用统一的强调色
        .style("stroke-width", 2)
        .style("stroke-dasharray", "8, 4") // 虚线风格
        .style("stroke-opacity", 0.6)      // 半透明，不抢戏
        .style("opacity", 0)
        .transition().delay(500).duration(1000)
        .style("opacity", 1);
        
    // (可选) 添加文字说明趋势
     const trendText = slope > 0 ? "↗ 上升趋势" : "↘ 下降趋势";
     group.append("text")
         .attr("x", _xScale(x2) - 10)
         .attr("y", _yScale(y2) - 10)
         .attr("text-anchor", "end")
         .style("fill", "var(--accent-color)")
        .style("font-size", "10px")
         .style("opacity", 0)
        .text(trendText)
        .transition().delay(1000).duration(500).style("opacity", 0.8);
}

function renderLoop() {
    if (!_ctx) return;
    _ctx.clearRect(0, 0, _width, _height);
    _ctx.save();
    _ctx.translate(MARGIN.left, MARGIN.top);

    const easing = 0.08; 

    _particles.forEach(p => {
        p.x += (p.tx - p.x) * easing;
        p.y += (p.ty - p.y) * easing;
        p.color = p.targetColor || "#999";

        _ctx.beginPath();
        const isHover = (p === _hoveredParticle);
        const radius = isHover ? 8 : 4; 
        
        _ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        _ctx.fillStyle = p.color;
        _ctx.fill();
        
        if (isHover) {
            _ctx.strokeStyle = "#333";
            _ctx.lineWidth = 2;
            _ctx.stroke();
        } else {
            _ctx.strokeStyle = "rgba(255,255,255,0.5)";
            _ctx.lineWidth = 1;
            _ctx.stroke();
        }
    });

    _ctx.restore();
}

function updateMatrixBackground(mode, w, h, x, y) {
    _bgGroup.selectAll(".matrix-element").transition().duration(500).style("opacity", 0).remove();
    
    if (mode === 'matrix') {
        const t = _svg.transition().duration(1000);
        const midFreq = 3.0; const midRate = 0.25;
        
        _bgGroup.append("line").attr("class", "matrix-element")
            .attr("x1", x(midFreq)).attr("y1", 0).attr("x2", x(midFreq)).attr("y2", h)
            .style("stroke", "#cbd5e1").style("stroke-dasharray", "4,4").style("opacity", 0).transition(t).style("opacity", 1);
        
        _bgGroup.append("line").attr("class", "matrix-element")
            .attr("x1", 0).attr("y1", y(midRate)).attr("x2", w).attr("y2", y(midRate))
            .style("stroke", "#cbd5e1").style("stroke-dasharray", "4,4").style("opacity", 0).transition(t).style("opacity", 1);

        const labels = [
            { txt: "💸 清仓甩卖", x: w-20, y: 30, anchor: "end" },
            { txt: "💎 高冷节日", x: 20, y: 30, anchor: "start" },
            { txt: "🛡️ 价值坚守", x: 20, y: h-20, anchor: "start" },
            { txt: "📢 刷脸曝光", x: w-20, y: h-20, anchor: "end" }
        ];
        
        _bgGroup.selectAll(".matrix-label")
            .data(labels).enter().append("text")
            .attr("class", "matrix-label matrix-element")
            .attr("x", d => d.x).attr("y", d => d.y).attr("text-anchor", d => d.anchor)
            .style("font-size", "14px").style("font-weight", "bold").style("fill", "#94a3b8")
            .text(d => d.txt)
            .style("opacity", 0)
            .transition().delay(500).duration(800).style("opacity", 1);
    }
}

function handleMouseMove(event, container) {
    const rect = container.getBoundingClientRect();
    const mx = event.clientX - rect.left - MARGIN.left;
    const my = event.clientY - rect.top - MARGIN.top;
    
    let minDist = 20; 
    let nearest = null;

    _particles.forEach(p => {
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < minDist) {
            minDist = dist;
            nearest = p;
        }
    });

    _hoveredParticle = nearest;
    d3.select(container).style("cursor", nearest ? "pointer" : "default");

    if (nearest && window.Utils) {
        const d = nearest.data;
        let content = `<div class="tooltip-title">${d.name}</div>`;
        if (_currentMode === 'matrix') {
            let eventsStr = "日常";
            if (d.events_breakdown) {
                const topEvents = Object.entries(d.events_breakdown)
                    .filter(([k, v]) => k !== '日常' && v > 0)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(e => e[0]);
                if (topEvents.length > 0) eventsStr = topEvents.join(", ");
            }
            content += `<div class="tooltip-row"><span>📊 策略:</span> <b>${d.strategy_class}</b></div><div class="tooltip-row"><span>🎉 重点:</span> <b>${eventsStr}</b></div><div class="tooltip-row"><span>📉 频率:</span> <b>${d.discount_frequency.toFixed(1)} 次/年</b></div><div class="tooltip-row"><span>💸 折扣:</span> <b>${(d.avg_discount_rate*100).toFixed(0)}%</b></div>`;
        } else {
            content += `<div class="tooltip-row"><span>📅 年份:</span> <b>${d.year}</b></div><div class="tooltip-row"><span>👥 在线:</span> <b>${d.max_players.toLocaleString()}</b></div><div class="tooltip-row"><span>💰 售价:</span> <b>¥${d.original_price}</b></div><div class="tooltip-row"><span>👍 好评:</span> <b>${d.favorable_rate}%</b></div><div class="tooltip-row"><span>🔥 留存:</span> <b>${d.retention_days}天</b></div>`;
        }
        window.Utils.showTooltip(event, content);
    } else {
        if(window.Utils) d3.select("#parallel-chart-shared-tooltip").style("opacity", 0);
    }
}

function getCustomColorScale(key) {
    const cExt = d3.extent(_data, d => d[key]);
    
    const baseInterpolator = t => d3.interpolateTurbo(0.1 + 0.85 * t);

    if (key === 'favorable_rate') {
        return d3.scaleSequential()
            .domain([cExt[1], cExt[0]]) 
            .interpolator(baseInterpolator);
    }
    
    if (key === 'strategy_class') {
        const colorMap = { "清仓甩卖": "#ef4444", "高冷节日": "#a855f7", "价值坚守": "#10b981", "刷脸曝光": "#3b82f6", "未知": "#ccc" };
        return (val) => colorMap[val] || "#ccc";
    }
    
    return d3.scaleSequential()
        .domain([cExt[0], cExt[1]])
        .interpolator(baseInterpolator);
}

function renderLegend(colorKey, title) {
    const container = d3.select("#scatter-legend-container");
    if (container.empty()) return;
    
    container.html(""); 

    const containerNode = container.node();
    const maxWidth = (containerNode && containerNode.clientWidth) ? containerNode.clientWidth : 220;
    
    const w = Math.max(160, Math.min(200, maxWidth - 10)); 
    const h = 56; 
    const svg = container.append("svg")
        .attr("width", w)
        .attr("height", h)
        .style("overflow", "visible")
        .style("margin-right", "10px");
        
    const cScale = getCustomColorScale(colorKey);
    
    if (colorKey === 'strategy_class') {
        // Strategy Legend (Simplified)
    } else {
        const defs = svg.append("defs");
        const gradientId = "legend-grad-" + Math.random().toString(36).substr(2, 5);
        const gradient = defs.append("linearGradient").attr("id", gradientId);
        
        const domain = cScale.domain(); 
        const minVal = Math.min(domain[0], domain[domain.length-1]);
        const maxVal = Math.max(domain[0], domain[domain.length-1]);
        
        for(let i=0; i<=10; i++) {
            const val = minVal + (maxVal - minVal) * (i/10);
            gradient.append("stop").attr("offset", `${i*10}%`).attr("stop-color", cScale(val));
        }
        
        let label = title || _nameMap[colorKey] || colorKey;
        svg.append("text")
            .attr("x", w/2).attr("y", 12)
            .attr("text-anchor", "middle")
            .text(label)
            .style("font-size", "12px").style("font-weight", "bold").style("fill", "#333");
        
        const barW = w - 24; 
        svg.append("rect")
            .attr("x", 12).attr("y", 20)
            .attr("width", barW).attr("height", 12)
            .style("fill", `url(#${gradientId})`);
        
        const fmt = (colorKey === 'year') ? d3.format("d") : d3.format(".2s");
        svg.append("text").attr("x", 12).attr("y", 46).text(fmt(minVal)).style("font-size", "10px").style("fill", "#666");
        svg.append("text").attr("x", 12 + barW).attr("y", 46).text(fmt(maxVal)).attr("text-anchor", "end").style("font-size", "10px").style("fill", "#666");
    }
}

function getScaleConfig(key, range, data) {
    const isLog = ['max_players', 'log_players'].includes(key);
    const isPercent = ['favorable_rate', 'avg_discount_rate'].includes(key) || (key.includes('rate') && !key.includes('strength'));
    const isPrice = ['original_price'].includes(key);
    
    const transform = isLog ? (d) => (d > 0 ? Math.log10(d) : 0) : (d) => d;
    const values = data.map(d => transform(d[key]));
    const extent = d3.extent(values);
    
    const scale = d3.scaleLinear();
    
    let pad = (extent[1] - extent[0]) * 0.02;
    if (pad === 0) pad = (extent[0] || 1) * 0.1;
    
    let min = extent[0] - pad;
    let max = extent[1] + pad;
    let format;
    
    if (isLog) {
        min = extent[0] - 0.2;
        max = extent[1] + 0.2;
        format = d3.format(".1f");
    } else if (isPercent) {
        const isDecimal = extent[1] <= 1.0;
        min = extent[0] - pad;
        format = d => {
             const val = isDecimal ? d * 100 : d;
             return val < -2 ? "" : val.toFixed(0) + "%";
        };
    } else if (key === 'year') {
         format = d3.format("d");
         min = extent[0] - 0.5;
         max = extent[1] + 0.5;
    } else {
         min = extent[0] - pad;
         format = d => d < 0 ? "" : d3.format(".2s")(d);
         if(isPrice || key === 'discount_strength') format = d => d < 0 ? "" : d3.format("d")(d);
    }
    
    scale.domain([min, max]).range(range);
    
    return { scale, format, transform };
}

export { ScatterPlot };