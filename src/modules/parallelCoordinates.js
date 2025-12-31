// modules/parallelCoordinates.js

const MARGIN = { top: 100, right: 60, bottom: 60, left: 60 };
const AXIS_ANIMATION_DURATION = 800; 

let _svg = null;
let _baseGroup = null;  // 底层（灰色背景线）
let _storyGroup = null; // 顶层（高亮线/相关性条）
let _xScale = null;
let _yScales = {};
let _data = [];
let _dimensions = []; 
let _cScale = null;
let _lineGenerator = null;
let _colorKey = "year";
let _nameMap = {};
let _ids = {}; 

let isFreeMode = false;
let isObserverMode = false; 
let selectedAxisIndex = null; 
let _sceneTimer = null; 

// 【新增】用于缓存上一次的配置，防止重复渲染打断动画
let _lastConfigStr = "";

const ParallelCoordinates = {
  init: initChart,
  renderScene: renderScene,
  toggleObserverMode: toggleObserverMode,
  resetObserverMode: () => { isObserverMode = false; }
};

function initChart(data, dimensions, nameMap, containerId, ids) {
    _data = data;
    _dimensions = [...dimensions];
    _nameMap = nameMap;
    _ids = ids;
    
    const container = document.getElementById(containerId);
    if(!container) return;
    container.innerHTML = "";
    
    _svg = d3.select(`#${containerId}`).append("svg")
        .attr("width", container.clientWidth)
        .attr("height", container.clientHeight)
        .attr("class", "parallel-chart-svg")
        .append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    _baseGroup = _svg.append("g").attr("class", "base-layer");
    _storyGroup = _svg.append("g").attr("class", "story-layer");

    const width = container.clientWidth - MARGIN.left - MARGIN.right;
    const height = container.clientHeight - MARGIN.top - MARGIN.bottom;

    _xScale = d3.scalePoint().range([0, width]).padding(0).domain(_dimensions);
    _yScales = {};
    _dimensions.forEach(key => {
        if (key === 'log_players') _yScales[key] = d3.scaleLinear().domain([2, 7]).range([height, 0]);
        else if (key === 'favorable_rate') _yScales[key] = d3.scaleLinear().domain([30, 100]).range([height, 0]);
        else _yScales[key] = d3.scaleLinear().domain(d3.extent(data, d => d[key])).nice().range([height, 0]);
    });

    updateColorScale();

    _lineGenerator = d3.line()
        .defined(d => !isNaN(d[1]))
        .x(d => _xScale(d[0]))
        .y(d => _yScales[d[0]](d[1]));

    const lines = _baseGroup.selectAll("path.base-line").data(_data);
    lines.enter().append("path")
        .attr("class", "base-line")
        .merge(lines)
        .attr("d", d => _lineGenerator(_dimensions.map(p => [p, d[p]])))
        .style("fill", "none")
        .style("stroke", "#ccc")
        .style("stroke-width", 1.5)
        .style("stroke-opacity", 0.15);

    renderAxes();
    renderLegend();
}

// --- 2. 场景渲染器 ---
function renderScene(config) {
    if (!_svg) return;

    // 【核心修复 1：宽松的打断判断】
    // 只有当配置真正改变时，才执行渲染和打断。
    // 这解决了“稍微一动滚轮就直接打断动画”的问题。
    const currentConfigStr = JSON.stringify(config);
    if (currentConfigStr === _lastConfigStr) {
        return; // 配置没变，什么都不做，让之前的动画继续飞
    }
    _lastConfigStr = currentConfigStr;

    if (window.Utils) {
        d3.select("#parallel-chart-shared-tooltip").style("opacity", 0);
    }
    
    const { dimensions, focusAxes, colorBy, mode } = config;

    // 只有配置确实变了，才打断旧动画
    _svg.selectAll("*").interrupt();
    _baseGroup.selectAll("*").interrupt();
    _storyGroup.selectAll("*").interrupt();
    if (_sceneTimer) clearTimeout(_sceneTimer);

    // 清空上一层
    _storyGroup.selectAll("*").remove();

    let layoutChanged = false;
    if (dimensions) {
        _dimensions = [...dimensions];
        _xScale.domain(_dimensions);
        layoutChanged = true;
    }
    
    if (colorBy && colorBy !== _colorKey) {
        _colorKey = colorBy;
        updateColorScale();
        renderLegend();
    }

    if (mode === 'free') {
        isFreeMode = true;
        renderFreeModeState(layoutChanged);
        return; 
    }
    
    isFreeMode = false;
    isObserverMode = false; 

    // 轴位置瞬移，避免错位
    _baseGroup.selectAll(".axis")
        .attr("transform", d => `translate(${_xScale(d)})`);

    // 【核心修复 2：第三步保持正常】
    // 之前写死了 true (强制变暗)，现在改为 !!focusAxes。
    // 如果第三步配置没有 focusAxes（即概览模式），dimBackground 就是 false，线条保持正常（不加粗、不变暗）。
    updateBaseLayer(layoutChanged, !!focusAxes);

    const delayTime = layoutChanged ? 50 : 0; 
    
    _sceneTimer = setTimeout(() => {
        // 如果有 focusAxes 才绘制高亮层
        drawStoryLayer(focusAxes);
    }, delayTime);
}

function renderFreeModeState(layoutChanged) {
    _baseGroup.selectAll(".axis").style("pointer-events", "auto");
    
    _baseGroup.selectAll(".axis")
        .interrupt()
        .attr("transform", d => `translate(${_xScale(d)})`);

    if (isObserverMode) {
        updateBaseLayer(layoutChanged, true); 
        
        const filteredData = getFilteredData();
        _storyGroup.selectAll("*").interrupt().remove();
        drawStoryLayer([2, 3], filteredData); 

    } else {
        updateBaseLayer(layoutChanged, false); 
        _storyGroup.selectAll("*").interrupt().remove();
        
        _baseGroup.selectAll(".base-line")
            .on("mouseover", function(event, d) { handleLineMouseOver(event, d, this); })
            .on("mouseout", function(event, d) { handleLineMouseOut(event, d, this); });
    }
}

function toggleObserverMode() {
    if (!isFreeMode) return;
    isObserverMode = !isObserverMode;
    
    const btn = document.getElementById(_ids.exitFocusBtnId);
    if (btn) {
        btn.innerText = isObserverMode ? "退出观察者模式" : "进入观察者模式";
        if (isObserverMode) btn.classList.add("active");
        else btn.classList.remove("active");
    }
    renderFreeModeState(false);
}

// 【修复逻辑】：dimBackground 控制是否进入“剧情模式”
function updateBaseLayer(layoutChanged, dimBackground) {
    const targetOpacity = dimBackground ? 0.1 : 0.6; // 正常模式 0.6，剧情模式 0.1
    const targetColor = dimBackground ? "#999" : (d => _cScale(d[_colorKey]));
    const targetWidth = 1.5;

    const lines = _baseGroup.selectAll(".base-line");
    lines.interrupt();

    if (layoutChanged) {
        lines.attr("d", d => _lineGenerator(_dimensions.map(p => [p, d[p]])));
    }

    lines.style("stroke", targetColor)
         .style("stroke-width", targetWidth)
         .style("pointer-events", dimBackground ? "none" : "stroke") 
         .style("opacity", 1) 
         .style("stroke-opacity", targetOpacity);
}

function drawStoryLayer(focusAxes, customData = null) {
    if (!_svg) return;
    const renderData = customData || _data;

    if (focusAxes) {
        const dim1 = _dimensions[focusAxes[0]];
        const dim2 = _dimensions[focusAxes[1]];
        
        _storyGroup.selectAll("path.story-segment")
            .data(renderData).enter().append("path")
            .attr("class", "story-segment")
            .attr("d", d => {
                const x1 = _xScale(dim1), y1 = _yScales[dim1](d[dim1]);
                const x2 = _xScale(dim2), y2 = _yScales[dim2](d[dim2]);
                return `M ${x1} ${y1} L ${x2} ${y2}`;
            })
            .style("stroke", d => _cScale(d[_colorKey]))
            .style("stroke-width", 1.5) // 这里是 1.5，保持“正常”粗细
            .style("fill", "none")
            .style("opacity", 0) 
            .style("pointer-events", "stroke") 
            .on("mouseover", function(event, d) { handleLineMouseOver(event, d, this); })
            .on("mouseout", function(event, d) { handleLineMouseOut(event, d, this); })
            .transition().duration(400)
            .style("opacity", 1); 
            
        drawCorrelationBar(dim1, dim2);
    } else {
        _storyGroup.selectAll("path.story-line")
            .data(renderData).enter().append("path")
            .attr("class", "story-line")
            .attr("d", d => _lineGenerator(_dimensions.map(p => [p, d[p]])))
            .style("stroke", d => _cScale(d[_colorKey]))
            .style("stroke-width", 1.5)
            .style("fill", "none")
            .style("opacity", 0)
            .style("pointer-events", "stroke")
            .on("mouseover", function(event, d) { handleLineMouseOver(event, d, this); })
            .on("mouseout", function(event, d) { handleLineMouseOut(event, d, this); })
            .transition().duration(400)
            .style("opacity", 1);
    }
}

function handleLineMouseOver(event, d, element) {
    d3.select(element)
        .raise()
        .transition().duration(100)
        .style("stroke-width", 3)
        .style("stroke-opacity", 1);

    if(window.Utils && window.Utils.showTooltip) {
         window.Utils.showTooltip(event, `
          <div class="tooltip-title">${d.name}</div>
          <div class="tooltip-row"><span>📉 折扣力度:</span> <b>${d.discount_strength ? d.discount_strength.toFixed(2) : 'N/A'}</b></div>
          <div class="tooltip-row"><span>📅 发售年份:</span> <b>${d.year}</b></div>
          <div class="tooltip-row"><span>👍 好评率:</span> <b>${d.favorable_rate}%</b></div>
          <div class="tooltip-row"><span>💰 售价:</span> <b>¥${d.original_price}</b></div>
          <div class="tooltip-row"><span>👥 在线:</span> <b>${d.max_players ? d.max_players.toLocaleString() : 0}</b></div>
        `);
    }
}

function handleLineMouseOut(event, d, element) {
    if(window.Utils) d3.select("#parallel-chart-shared-tooltip").style("opacity", 0);
    d3.select(element)
        .transition().duration(200)
        .style("stroke-width", 1.5)
        .style("stroke-opacity", d3.select(element).classed("story-segment") ? 1 : 0.6);
}

function getFilteredData() {
    const searchInput = document.getElementById(_ids.searchNameId);
    const yearSelect = document.getElementById(_ids.selectYearId);
    
    const searchVal = searchInput ? searchInput.value.toLowerCase() : "";
    const yearVal = yearSelect ? yearSelect.value : "";
    
    if (!searchVal && !yearVal) return _data; 
    
    return _data.filter(d => {
        const matchName = !searchVal || d.name.toLowerCase().includes(searchVal);
        const matchYear = !yearVal || d.year == yearVal;
        return matchName && matchYear;
    });
}

function updateColorScale() {
    const cExtent = d3.extent(_data, d => d[_colorKey]);
    let domain = [cExtent[1], cExtent[0]];
    if (_colorKey === 'favorable_rate') domain = [cExtent[0], cExtent[1]];
    _cScale = d3.scaleSequential().domain(domain).interpolator(t => d3.interpolateTurbo(0.95 - 0.85 * t));
}

function renderAxes() {
    _baseGroup.selectAll(".axis").remove();
    const axisG = _baseGroup.selectAll("g.axis").data(_dimensions, d=>d).enter()
        .append("g").attr("class", "axis").attr("transform", d => `translate(${_xScale(d)})`);
        
    axisG.each(function(d) { 
        let axis = d3.axisLeft(_yScales[d]);
        if (d === 'year') {
            const domain = _yScales[d].domain();
            const start = Math.ceil(Math.min(domain[0], domain[1]));
            const end = Math.floor(Math.max(domain[0], domain[1]));
            const ticks = [];
            for (let i = start; i <= end; i++) ticks.push(i);
            axis.tickValues(ticks).tickFormat(d3.format("d"));
        }
        d3.select(this).call(axis);
    });
    
    axisG.append("text").attr("class", "axis-title")
        .text(d => _nameMap[d]).attr("y", -15)
        .style("text-anchor", "middle").style("fill", "#333").style("font-weight", "bold");

    axisG.style("cursor", "pointer").on("click", handleAxisClick);
}

function handleAxisClick(event, d) {
    if (!isFreeMode) return;
    
    const clickedIdx = _dimensions.indexOf(d);

    if (selectedAxisIndex === null) {
        selectedAxisIndex = clickedIdx;
        highlightAxisTitle(d);
    } else {
        const targetIdx = selectedAxisIndex;
        if (targetIdx === clickedIdx) {
            selectedAxisIndex = null;
            resetAxisTitles();
            return;
        }

        const newOrder = [..._dimensions];
        [newOrder[targetIdx], newOrder[clickedIdx]] = [newOrder[clickedIdx], newOrder[targetIdx]];
        
        _dimensions = [...newOrder];
        _xScale.domain(_dimensions);
        selectedAxisIndex = null;
        resetAxisTitles();

        renderFreeModeState(true); 
    }
}

function highlightAxisTitle(axisName) {
    _baseGroup.selectAll(".axis").each(function(d) {
        const title = d3.select(this).select("text.axis-title");
        title.transition().style("fill", d === axisName ? "var(--accent-color)" : "#333")
             .style("font-size", d === axisName ? "16px" : "12px");
    });
}
function resetAxisTitles() {
    _baseGroup.selectAll(".axis text.axis-title")
        .transition().duration(300)
        .style("fill", "#333").style("font-size", "12px");
}

function drawCorrelationBar(dim1, dim2) {
    const xArr = _data.map(d => d[dim1]);
    const yArr = _data.map(d => d[dim2]);
    const muX = d3.mean(xArr), muY = d3.mean(yArr);
    let num = 0, dX = 0, dY = 0;
    for(let i=0; i<xArr.length; i++) {
        const dx = xArr[i]-muX, dy = yArr[i]-muY;
        num += dx*dy; dX += dx**2; dY += dy**2;
    }
    const r = num / Math.sqrt(dX * dY) || 0;

    const width = _xScale.range()[1];
    const barGroup = _storyGroup.append("g").attr("class", "correlation-viz")
        .attr("transform", `translate(${width - 220}, -60)`); 

    const centerX = 100; const maxBarWidth = 100;
    const currentVisualLen = Math.abs(r) * maxBarWidth;
    const endX = r < 0 ? centerX - currentVisualLen : centerX;
    const endWidth = Math.max(2, currentVisualLen);
    const endColor = r > 0 ? "#ff4d4d" : "#00d4ff";

    barGroup.append("line").attr("x1", 0).attr("y1", 8).attr("x2", 200).attr("y2", 8).style("stroke", "#ddd");
    barGroup.append("line").attr("x1", centerX).attr("y1", 5).attr("x2", centerX).attr("y2", 11).style("stroke", "#999");
    
    barGroup.append("rect")
        .attr("y", 2).attr("height", 12)
        .attr("x", centerX).attr("width", 0).attr("fill", endColor)
        .transition().duration(800).ease(d3.easeCubicOut)
        .attr("x", endX).attr("width", endWidth);
        
    barGroup.append("text").attr("x", 0).attr("y", -5)
        .style("font-size", "11px").style("fill", "#666").text(`关联度: ${r.toFixed(3)}`);
}

function renderLegend() {
  if (!_svg) return;
  _svg.select(".legend-group").remove();
  const cExtent = d3.extent(_data, d => d[_colorKey]);
  
  const lW = 280, lH = 15;
  const g = _svg.append("g").attr("class", "legend-group").attr("transform", `translate(0, -85)`);
  
  const gradId = "grad-main";
  _svg.select(`#${gradId}`).remove();
  
  const grad = _svg.append("defs").append("linearGradient")
    .attr("id", gradId).attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "0%");
    
  const scale = _cScale.copy().domain([0, 1]); 
  for (let i = 0; i <= 10; i++) {
     grad.append("stop").attr("offset", `${i*10}%`).attr("stop-color", _cScale(cExtent[0] + (cExtent[1]-cExtent[0])*(i/10)));
  }
  
  g.append("rect").attr("width", lW).attr("height", lH).style("fill", `url(#${gradId})`);
  g.append("g").attr("transform", `translate(0,${lH + 5})`)
    .call(d3.axisBottom(d3.scaleLinear().domain(cExtent).range([0, lW])).ticks(5));
    
  g.append("text").attr("x", lW / 2).attr("y", -5).style("text-anchor", "middle")
    .style("font-size", "11px").style("fill", "#666")
    .text(_nameMap[_colorKey] || _colorKey);
}

export { ParallelCoordinates };