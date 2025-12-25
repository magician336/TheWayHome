let scatterState = {
  svg: null,
  g: null,
  xScale: null,
  yScale: null,
  // 移除 manual circles tracking，改用实时的 selectAll
  xAxisG: null,
  yAxisG: null,
  xLabel: null
};

function drawScatterChart(data, nameMap, xKey, yKey, containerId, colorSelectId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // 确保有宽高，防止在隐藏Tab中渲染时报错
  const w = container.clientWidth || 800;
  const h = container.clientHeight || 500;
  const m = { top: 20, right: 30, bottom: 40, left: 60 };
  const iW = w - m.left - m.right;
  const iH = h - m.top - m.bottom;
  
  // --- 1. 初始化 SVG 结构 (只执行一次) ---
  const existingSvg = d3.select(`#${containerId} svg`);
  if (existingSvg.empty()) {
    container.innerHTML = "";
    const svg = d3.select(`#${containerId}`).append("svg")
      .attr("width", w)
      .attr("height", h)
      .attr("class", "shared-viz-svg");
    
    const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);
    
    scatterState.svg = svg;
    scatterState.g = g;
    scatterState.xAxisG = g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${iH})`);
    scatterState.yAxisG = g.append("g").attr("class", "y-axis");
    scatterState.xLabel = g.append("text").attr("class", "x-axis-label")
      .attr("x", iW/2)
      .attr("y", iH+35)
      .style("text-anchor","middle")
      .style("font-size","12px");
  } else {
    // 如果窗口大小改变，更新SVG尺寸
    scatterState.svg.attr("width", w).attr("height", h);
    scatterState.g.select(".x-axis").attr("transform", `translate(0,${iH})`);
    scatterState.xLabel.attr("x", iW/2).attr("y", iH+35);
  }

  // --- 2. 准备比例尺 ---
  // X轴
  const xExtent = d3.extent(data, d => d[xKey]);
  // 增加一点内边距，防止点贴在轴上
  const xPad = (xExtent[1] - xExtent[0]) * 0.05 || 1; 
  const x = d3.scaleLinear()
      .domain([xExtent[0] - xPad, xExtent[1] + xPad])
      .range([0, iW]);

  // Y轴
  const yExtent = d3.extent(data, d => d[yKey]);
  const yPad = (yExtent[1] - yExtent[0]) * 0.05 || 1;
  const y = d3.scaleLinear()
      .domain([yExtent[0] - yPad, yExtent[1] + yPad])
      .range([iH, 0]); // Y轴从下往上
  
  // 颜色比例尺
  const cKeyElement = document.getElementById(colorSelectId);
  const cKey = cKeyElement ? cKeyElement.value : 'favorable_rate'; // 增加安全回退
  const cExt = d3.extent(data, d => d[cKey]);
  // 好评率越高颜色越亮，其他可能相反，保持原逻辑
  let scaleDomain = cKey === 'favorable_rate' ? [cExt[0], cExt[1]] : [cExt[1], cExt[0]];
  // 防止 extent 为 undefined (如数据为空时)
  if (!scaleDomain[0]) scaleDomain = [0, 1]; 
  
  const cScale = d3.scaleSequential()
      .domain(scaleDomain)
      .interpolator(t => d3.interpolateTurbo(0.95 - 0.85 * t));

  // --- 3. 更新坐标轴 ---
  let xAxisCall = d3.axisBottom(x).ticks(5);
  if (xKey === 'year') {
      xAxisCall = xAxisCall.tickFormat(d3.format("d")); // 去除逗号
  }
  const yAxisCall = d3.axisLeft(y).ticks(5);

  scatterState.xAxisG.transition().duration(750).call(xAxisCall);
  scatterState.yAxisG.transition().duration(750).call(yAxisCall);
  scatterState.xLabel.text(nameMap[xKey]);

  // --- 4. 绘制散点 (使用 Join 语法修复 Bug) ---
  
  const mouseoverHandler = function(e, d) { 
    d3.select(this)
      .attr("r", 8)
      .style("stroke", "#fff")
      .style("stroke-width", 2)
      .raise(); 

    let tipContent = `<div class="tooltip-title">${d.name}</div>`;
    // 动态添加当前轴的信息
    if (xKey !== 'log_players') tipContent += `<div class="tooltip-row"><span>${nameMap[xKey]}:</span> <b>${xKey === 'year' ? d[xKey] : Number(d[xKey]).toFixed(2)}</b></div>`;
    if (yKey !== 'log_players') tipContent += `<div class="tooltip-row"><span>${nameMap[yKey]}:</span> <b>${yKey === 'year' ? d[yKey] : Number(d[yKey]).toFixed(2)}</b></div>`;
    
    tipContent += `
        <div class="tooltip-row"><span>👥 最大在线:</span> <b>${d.max_players.toLocaleString()}</b></div>
        <div class="tooltip-row"><span>👍 好评率:</span> <b>${d.favorable_rate}%</b></div>
    `;
    
    if (typeof Utils !== 'undefined' && Utils.showTooltip) {
      Utils.showTooltip(e, tipContent);
    }
  };
  
  const mouseoutHandler = function() { 
    d3.select(this)
      .attr("r", 5)
      .style("stroke", "#000")
      .style("stroke-width", 0.8); 
    
    if (typeof GlobalVizConfig !== 'undefined') {
        GlobalVizConfig.setupTooltip().style("opacity", 0); 
    } else {
        d3.select("#shared-tooltip").style("opacity", 0);
    }
  };

  // 关键修复：使用 .join() 自动处理 enter/update/exit
  scatterState.g.selectAll("circle")
    .data(data, d => d.name) // 必须使用 key (d.name) 以确保动画正确
    .join(
      enter => enter.append("circle")
        .attr("cx", d => x(d[xKey])) // 初始位置
        .attr("cy", d => y(d[yKey]))
        .attr("r", 0) // 初始半径0，产生弹出效果
        .style("fill", d => cScale(d[cKey]))
        .style("stroke", "#000")
        .style("stroke-width", 0.8)
        .call(enter => enter.transition().duration(800).ease(d3.easeBackOut).attr("r", 5)),
      
      update => update
        .call(update => update.transition().duration(800).ease(d3.easeCubicOut)
          .attr("cx", d => x(d[xKey]))
          .attr("cy", d => y(d[yKey]))
          .style("fill", d => cScale(d[cKey]))
          .attr("r", 5)) // 确保更新后半径正确
    )
    // 重新绑定事件，确保新旧元素都有交互
    .on("mouseover", mouseoverHandler)
    .on("mouseout", mouseoutHandler);

  // 保存状态供外部使用 (可选)
  scatterState.xScale = x;
  scatterState.yScale = y;
}

const ScatterPlot = {
  draw: drawScatterChart
};

window.ScatterPlot = ScatterPlot;