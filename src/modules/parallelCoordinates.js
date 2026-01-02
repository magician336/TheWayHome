// modules/parallelCoordinates.js

const MARGIN = { top: 100, right: 60, bottom: 60, left: 60 };
const ANIMATION_DURATION = 500;

let _svg = null;
let _baseGroup = null;
let _focusGroup = null;
let _axisGroup = null;

// 数据与配置
let _data = [];
let _dimensions = []; 
let _nameMap = {};
let _ids = {}; 

let _xScale = null;
let _yScales = {};
let _cScale = null;
let _lineGenerator = null;

// 关键状态变量
let _colorKey = "year"; 
let _isFreeMode = false;
let _selectedAxisIndex = null;
let _isFocusMode = false;
let _hasAnimated = false; 

const ParallelCoordinates = {
  init: initChart,
  renderScene: renderScene,
  toggleObserverMode: toggleObserverMode,
  resetObserverMode: () => { _isFocusMode = false; _selectedAxisIndex = null; }
};

function initChart(data, dimensions, nameMap, containerId, ids) {
    console.log("%c[ParallelChart] Init Called", "background: #222; color: #bada55");
    
    // 1. 强制状态归零
    _colorKey = "year"; 
    _isFocusMode = false;
    _selectedAxisIndex = null;
    _isFreeMode = false;
    _hasAnimated = false; 
    
    _data = data;
    _dimensions = [...dimensions];
    _nameMap = nameMap;
    _ids = ids;

    // 2. 强制同步外部 DOM 状态
    const colorSelect = document.getElementById(_ids.colorSelectId);
    if (colorSelect) {
        colorSelect.value = "year";
    }

    const container = document.getElementById(containerId);
    if(!container) return;
    container.innerHTML = "";
    
    _svg = d3.select(`#${containerId}`).append("svg")
        .attr("width", container.clientWidth)
        .attr("height", container.clientHeight)
        .attr("class", "parallel-chart-svg")
        .on("click", (e) => {
            if(e.target.tagName === 'svg' || e.target.tagName === 'g') {
                 deselectAxis();
            }
        })
        .append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    // 分层：底层(Base) -> 聚焦层(Focus) -> 轴层(Axis)
    _baseGroup = _svg.append("g").attr("class", "base-layer");
    _focusGroup = _svg.append("g").attr("class", "focus-layer");
    _axisGroup = _svg.append("g").attr("class", "axis-layer");

    const width = container.clientWidth - MARGIN.left - MARGIN.right;
    const height = container.clientHeight - MARGIN.top - MARGIN.bottom;

    _xScale = d3.scalePoint().range([0, width]).padding(0).domain(_dimensions);
    _yScales = {};
    
    _dimensions.forEach(key => {
        if (key === 'log_players') {
            _yScales[key] = d3.scaleLinear().domain([2, 7]).range([height, 0]);
        } else if (key === 'favorable_rate') {
            _yScales[key] = d3.scaleLinear().domain([30, 100]).range([height, 0]);
        } else {
            _yScales[key] = d3.scaleLinear().domain(d3.extent(data, d => d[key])).nice().range([height, 0]);
        }
    });

    updateColorScale();

    _lineGenerator = d3.line()
        .defined(d => !isNaN(d[1]))
        .x(d => _xScale(d[0]))
        .y(d => _yScales[d[0]](d[1]));

    renderAxes();
    renderLegend();
    
    // 3. 初始绘制 (传入 true 请求播放开场动画)
    renderLines(true); 
}

function renderScene(config) {
    const { dimensions, focusAxes, colorBy, mode } = config;
    
    // 只有当维度真实改变时才重绘轴位置
    if (dimensions && JSON.stringify(dimensions) !== JSON.stringify(_dimensions)) {
        _dimensions = [...dimensions];
        _xScale.domain(_dimensions);
        _axisGroup.selectAll(".axis")
            .transition().duration(ANIMATION_DURATION)
            .attr("transform", d => `translate(${_xScale(d)})`);
    }

    // 更新颜色配置
    if (colorBy && colorBy !== _colorKey) {
        _colorKey = colorBy;
        
        // 同步 UI
        const colorSelect = document.getElementById(_ids.colorSelectId);
        if (colorSelect && colorSelect.value !== colorBy) {
             colorSelect.value = colorBy;
        }
        
        updateColorScale();
        renderLegend();
    }

    _isFreeMode = (mode === 'free');
    
    // 更新 Focus 状态
    if (focusAxes !== undefined) {
        _isFocusMode = (focusAxes !== null);
    }

    // 普通重绘
    renderLines(false);
    updateUIButtons();
}

/**
 * 核心绘制函数
 * @param {boolean} isInitialDraw - 是否为初始化调用
 */
function renderLines(isInitialDraw = false) {
    const lines = _baseGroup.selectAll("path.base-line").data(_data, d => d.name);
    
    const linesEnter = lines.enter().append("path")
        .attr("class", "base-line")
        .style("fill", "none");

    const linesUpdate = linesEnter.merge(lines);

    // 1. 更新路径数据
    linesUpdate.attr("d", d => _lineGenerator(_dimensions.map(p => [p, d[p]])));

    // 2. 更新样式 (底层线条)
    // 【关键】Focus 模式下，底层背景线淡化至 0.05，正常模式下 0.6
    linesUpdate
        .style("stroke", d => _cScale(d[_colorKey]))
        .style("stroke-width", 1.5)
        .style("stroke-opacity", d => _isFocusMode ? 0.05 : 0.6) 
        .style("opacity", 1)
        .classed("inactive", false);

    // 3. 动画逻辑
    if (isInitialDraw && !_hasAnimated) {
        console.log("[ParallelChart] Starting Growth Animation...");
        _hasAnimated = true; 

        linesUpdate.each(function() {
            const path = d3.select(this);
            const totalLength = this.getTotalLength();
            if (!totalLength || isNaN(totalLength)) return;

            path.attr("stroke-dasharray", totalLength + " " + totalLength)
                .attr("stroke-dashoffset", totalLength) 
                .transition()
                .duration(1500)
                .ease(d3.easeCubicOut)
                .attr("stroke-dashoffset", 0)
                .on("end", () => {
                    d3.select(this).style("stroke-dasharray", "none");
                });
        });
    } else {
        // 防止打断动画：只有在非 Focus 模式且动画已完成时清理
        if (!_isFocusMode && !d3.select(".base-line").node().__transition) {
             linesUpdate.style("stroke-dasharray", "none");
        }
    }

    linesUpdate
        .on("mouseover", handleMouseOver)
        .on("mouseout", handleMouseOut);

    lines.exit().remove();

    // 渲染高亮层 (中间两轴)
    renderFocusLayer();
}

function handleMouseOver(event, d) {
    d3.selectAll(".base-line.highlight")
      .classed("highlight", false)
      .style("stroke-width", 1.5);
    
    d3.select(this)
      .classed("highlight", true)
      .style("stroke-width", 3)
      .style("stroke-opacity", 1)
      .raise();

    if (typeof Utils !== 'undefined' && Utils.showTooltip) {
        Utils.showTooltip(event, `
          <div class="tooltip-title">${d.name}</div>
          <div class="tooltip-row"><span>📉 折扣力度:</span> <b>${d.discount_strength.toFixed(2)}</b></div>
          <div class="tooltip-row"><span>📅 发售年份:</span> <b>${d.year}</b></div>
          <div class="tooltip-row"><span>👍 好评率:</span> <b>${d.favorable_rate}%</b></div>
          <div class="tooltip-row"><span>💰 售价:</span> <b>¥${d.original_price}</b></div>
          <div class="tooltip-row"><span>👥 在线:</span> <b>${parseInt(d.max_players).toLocaleString()}</b></div>
        `);
    }
}

function handleMouseOut(event, d) {
    if (window.Utils) d3.select("#parallel-chart-shared-tooltip").style("opacity", 0);
    
    d3.selectAll(".base-line").classed("highlight", false).style("stroke-width", 1.5);
    d3.select(this).style("stroke-opacity", _isFocusMode ? 0.05 : 0.6);
}

function renderAxes() {
    _axisGroup.selectAll(".axis").remove();
    const axisG = _axisGroup.selectAll("g.axis").data(_dimensions, d=>d).enter()
        .append("g").attr("class", "axis").attr("transform", d => `translate(${_xScale(d)})`);
        
    axisG.each(function(d) { 
        let axis = d3.axisLeft(_yScales[d]);
        if (d === 'year') {
            const yearExtent = d3.extent(_data, item => item.year);
            const years = d3.range(yearExtent[0], yearExtent[1] + 1);
            axis.tickValues(years).tickFormat(d3.format("d"));
        } else {
            axis.tickFormat(null); 
        }
        d3.select(this).call(axis);
    });
    
    axisG.append("text").attr("class", "axis-title")
        .text(d => _nameMap[d])
        .attr("y", -15)
        .style("text-anchor", "middle")
        .style("cursor", "pointer")
        .style("fill", "var(--text-main)")
        .style("font-weight", "bold")
        .on("click", handleAxisClick);
        
    updateAxisStyles();
}

function handleAxisClick(event, d) {
    if (!_isFreeMode) return;
    event.stopPropagation();

    const clickedIdx = _dimensions.indexOf(d);

    if (_selectedAxisIndex === null) {
        _selectedAxisIndex = clickedIdx;
        updateAxisStyles();
        
        if (clickedIdx === 2 || clickedIdx === 3) { 
            if (!_isFocusMode) {
                _isFocusMode = true; 
                renderLines(false); 
                updateUIButtons();
                return;
            }
        }
    } else {
        const targetIdx = _selectedAxisIndex;
        if (targetIdx === clickedIdx) {
            deselectAxis();
            return;
        }

        const focusIndices = [2, 3];
        const isTouchingFocus = focusIndices.includes(targetIdx) || focusIndices.includes(clickedIdx);

        const temp = _dimensions[targetIdx];
        _dimensions[targetIdx] = _dimensions[clickedIdx];
        _dimensions[clickedIdx] = temp;
        _selectedAxisIndex = null;
        
        _xScale.domain(_dimensions);

        // 如果影响了 Focus 窗口，先淡出旧层
        if (_isFocusMode && isTouchingFocus) {
            _svg.selectAll(".focus-group").transition().duration(400).style("opacity", 0).remove();
            _svg.selectAll(".correlation-viz").transition().duration(400).style("opacity", 0).remove();
        }

        _svg.selectAll(".axis").transition().duration(ANIMATION_DURATION)
            .attr("transform", d => `translate(${_xScale(d)})`);
            
        _baseGroup.selectAll(".base-line").transition().duration(ANIMATION_DURATION)
            .attr("d", d => _lineGenerator(_dimensions.map(p => [p, d[p]])));

        updateAxisStyles();

        if (_isFocusMode && isTouchingFocus) {
            setTimeout(() => { renderFocusLayer(); }, ANIMATION_DURATION + 50);
        }
    }
}

// 【关键实现】聚焦层渲染
// 严格还原要求：中间两轴的线条使用“正常”的 Step4 样式 (1.5px, 1.0 opacity)
function renderFocusLayer() {
    _focusGroup.selectAll("*").remove(); 
    _svg.selectAll(".correlation-viz").remove();

    if (!_isFocusMode || _dimensions.length < 4) return;

    const dimIndex1 = 2; 
    const dimIndex2 = 3;
    const dim1 = _dimensions[dimIndex1];
    const dim2 = _dimensions[dimIndex2];

    const segments = _focusGroup.selectAll("path.focus-segment").data(_data, d => d.name);
    
    const segmentsEnter = segments.enter().append("path")
        .attr("class", "focus-segment")
        .style("fill", "none")
        .style("pointer-events", "none") 
        .style("stroke-opacity", 0);

    segmentsEnter.merge(segments)
        .attr("d", d => {
            const x1 = _xScale(dim1), y1 = _yScales[dim1](d[dim1]);
            const x2 = _xScale(dim2), y2 = _yScales[dim2](d[dim2]);
            return `M ${x1} ${y1} L ${x2} ${y2}`;
        })
        .style("stroke", d => _cScale(d[_colorKey]))
        .style("stroke-width", 1.5) // 【重点】保持 1.5px，绝不加粗
        .transition().duration(600).ease(d3.easeCubicOut)
        .style("stroke-opacity", 1); // 【重点】不透明度设为 1，与淡化的背景形成对比
        
    segments.exit().remove();
        
    drawCorrelationBar(dim1, dim2);
}

function drawCorrelationBar(dim1, dim2) {
    const width = _xScale.range()[1];
    
    const xArr = _data.map(d => d[dim1]);
    const yArr = _data.map(d => d[dim2]);
    const muX = d3.mean(xArr), muY = d3.mean(yArr);
    let num = 0, dX = 0, dY = 0;
    for(let i=0; i<xArr.length; i++) {
        const dx = xArr[i]-muX, dy = yArr[i]-muY;
        num += dx*dy; dX += dx**2; dY += dy**2;
    }
    const r = num / Math.sqrt(dX * dY) || 0;

    // 1. 创建 Group - y 坐标从 -85 调整到 -65，实现下移
    const barGroup = _svg.append("g")
        .attr("class", "correlation-viz")
        .attr("transform", `translate(${width - 220}, -65)`); 
        
    barGroup.style("opacity", 0).transition().duration(600).style("opacity", 1);

    const maxBarWidth = 100;
    const centerX = 100; 
    const currentVisualLen = Math.pow(Math.abs(r), 0.5) * maxBarWidth;
    const endX = r < 0 ? centerX - currentVisualLen : centerX;
    const endColor = r > 0 ? "#ff4d4d" : "#00d4ff";

    // 2. 绘制轴线和矩形
    barGroup.append("line").attr("x1", 0).attr("y1", 20).attr("x2", 200).attr("y2", 20).style("stroke", "rgba(255,255,255,0.2)");
    barGroup.append("line").attr("x1", centerX).attr("y1", 15).attr("x2", centerX).attr("y2", 25).style("stroke", "#fff");
    
    barGroup.append("rect")
        .attr("y", 14).attr("height", 12).attr("rx", 2)
        .attr("x", centerX).attr("width", 0).attr("fill", endColor)
        .transition().duration(750)
        .attr("x", endX).attr("width", Math.max(2, currentVisualLen));
        
    // 3. 文字优化：居中、加大、颜色高亮
    barGroup.append("text")
        .attr("x", 100) // 200px 宽度的一半
        .attr("y", 5)   // 向上微调，拉开与 Bar 的距离
        .attr("text-anchor", "middle") // 居中对齐
        .style("font-size", "14px")    // 字体加大 (原 11px)
        .style("font-weight", "bold")
        .style("fill", "var(--accent-color)") // 使用亮蓝色
        .text(`关联度: ${r.toFixed(3)}`);
}

function deselectAxis() {
    _selectedAxisIndex = null;
    updateAxisStyles();
}

function updateAxisStyles() {
    _svg.selectAll(".axis-title")
        .transition().duration(200)
        .style("fill", (d, i) => {
            if (!_isFreeMode) return "var(--text-main)";
            return (_dimensions.indexOf(d) === _selectedAxisIndex) ? "var(--accent-color)" : "var(--text-main)";
        })
        .style("font-size", (d, i) => (_dimensions.indexOf(d) === _selectedAxisIndex) ? "16px" : "12px");
}

function updateColorScale() {
    const cExtent = d3.extent(_data, d => d[_colorKey]);
    // 【关键】还原源码中的 Domain 逻辑
    let domain = [cExtent[1], cExtent[0]]; // 默认：高值 -> 蓝，低值 -> 红 (Turbo 0->Red)
    if (_colorKey === 'favorable_rate') {
        domain = [cExtent[0], cExtent[1]]; // 好评率：低值 -> 红，高值 -> 蓝
    }
    _cScale = d3.scaleSequential().domain(domain).interpolator(t => d3.interpolateTurbo(0.95 - 0.85 * t));
}

function renderLegend() {
    _svg.select(".legend-group").remove();
    const lW = 280, lH = 15;
    const g = _svg.append("g").attr("class", "legend-group").attr("transform", `translate(0, -85)`);
    
    const gradId = "grad-main";
    _svg.select(`#${gradId}`).remove();
    const grad = _svg.append("defs").append("linearGradient")
      .attr("id", gradId).attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "0%");
    
    const scaleForLegend = _cScale.copy().domain([0, 1]); 
    for (let i = 0; i <= 10; i++) {
        grad.append("stop").attr("offset", `${i*10}%`).attr("stop-color", scaleForLegend(i/10));
    }

    g.append("rect").attr("width", lW).attr("height", lH).style("fill", `url(#${gradId})`);
    
    const cExtent = d3.extent(_data, d => d[_colorKey]);
    g.append("g").attr("transform", `translate(0,${lH + 5})`)
     .call(d3.axisBottom(d3.scaleLinear().domain(cExtent).range([0, lW])).ticks(5));

    g.append("text").attr("x", lW / 2).attr("y", -5).style("text-anchor", "middle").style("font-size", "11px").style("fill", "#666").text(_nameMap[_colorKey] || _colorKey);
}

function updateUIButtons() {
    const btn = document.getElementById(_ids.exitFocusBtnId);
    if (btn) {
        btn.innerText = _isFocusMode ? "退出观察者模式" : "进入观察者模式";
        if (_isFocusMode) btn.classList.add("active");
        else btn.classList.remove("active");
    }
}

function toggleObserverMode() {
    if (!_isFreeMode) return;
    _isFocusMode = !_isFocusMode;
    renderLines(false);
    updateUIButtons();
}

export { ParallelCoordinates };