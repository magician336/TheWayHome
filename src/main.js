let rawData = [];
let tagData = {};
let data = [];
const currentYear = 2025;
const nameMap = { "year": "年份", "original_price": "售价 (¥)", "discount_strength": "折扣力度", "favorable_rate": "好评率 (%)", "log_players": "在线人数 (10^x)", "retention_days": "留存天数 (Days)" };
let parallelDimensions = ["year", "original_price", "discount_strength", "favorable_rate", "log_players", "retention_days"];
let selectedAxisIndex = null;
let isFocusMode = false;

// 布局配置
const MARGIN = typeof GlobalVizConfig !== 'undefined' ? GlobalVizConfig.layout.margin : { top: 100, right: 60, bottom: 60, left: 60 };

async function loadData() {
  try {
    const [gamesResponse, tagsResponse] = await Promise.all([
      fetch('new_processed_games.json'),
      fetch('tag_heat_clusters_detailed.json')
    ]);
    rawData = await gamesResponse.json();
    tagData = await tagsResponse.json();
    
    if (rawData && rawData.length > 0) {
      data = rawData.map(d => ({
        ...d,
        log_players: Math.log10(d.max_players < 1 ? 1 : d.max_players),
        discount_strength: (d.discount_count * (d.avg_discount_rate * 100)) / Math.max(0.1, currentYear - d.year)
      }));
    }
    initYearSelect();
    init();
  } catch (error) {
    console.error('加载数据失败:', error);
  }
}

function initYearSelect() {
  const yearSelect = document.getElementById('selectYear');
  if (data.length > 0) {
    const years = [...new Set(data.map(d => d.year))].sort((a, b) => b - a);
    years.forEach(year => {
      const opt = document.createElement('option');
      opt.value = year;
      opt.innerText = year;
      yearSelect.appendChild(opt);
    });
  }
}

function showTooltip(event, content) {
  const tooltip = GlobalVizConfig.setupTooltip();
  tooltip.html(content).style("opacity", 1);
  const tipNode = tooltip.node();
  let left = event.clientX + 15;
  let top = event.clientY + 15;
  if (left + tipNode.offsetWidth > window.innerWidth) {
    left = event.clientX - tipNode.offsetWidth - 15;
  }
  if (top + tipNode.offsetHeight + 20 > window.innerHeight) {
    top = event.clientY - tipNode.offsetHeight - 15;
  }
  tooltip.style("left", left + "px").style("top", top + "px");
}

// ---------------- 主图：平行坐标系 ----------------
function drawParallelPlot() {
  if (data.length === 0) return;
  const colorKey = document.getElementById('colorSelect').value;
  const container = document.getElementById('main-chart-container');
  const width = container.clientWidth - MARGIN.left - MARGIN.right;
  const height = container.clientHeight - MARGIN.top - MARGIN.bottom;

  const currentSearch = document.getElementById('searchName').value.toLowerCase();
  const currentYearFilter = document.getElementById('selectYear').value;
  const isFiltered = currentSearch !== "" || currentYearFilter !== "";

  container.innerHTML = "";
  const svg = d3.select("#main-chart-container").append("svg")
    .attr("width", container.clientWidth).attr("height", container.clientHeight)
    .attr("class", "shared-viz-svg")
    .append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

  const x = d3.scalePoint().range([0, width]).padding(0).domain(parallelDimensions);
  const y = {};
  parallelDimensions.forEach(key => {
    if (key === 'log_players') y[key] = d3.scaleLinear().domain([2, 7]).range([height, 0]);
    else if (key === 'favorable_rate') y[key] = d3.scaleLinear().domain([30, 100]).range([height, 0]);
    else y[key] = d3.scaleLinear().domain(d3.extent(data, d => d[key])).nice().range([height, 0]);
  });

  const cExtent = d3.extent(data, d => d[colorKey]);
  
  // [关键修改] 统一使用 Turbo，仅翻转 domain
  // Turbo 插值器特性: t=0.95(红/深), t=0.1(蓝/浅)
  // 我们定义的 interpolator: t -> d3.interpolateTurbo(0.95 - 0.85 * t)
  // 当输入 0 -> Turbo(0.95) -> 红
  // 当输入 1 -> Turbo(0.10) -> 蓝
  
  let scaleDomain;
  if (colorKey === 'favorable_rate') {
    // 好评率：值越大越蓝。
    // 我们希望 Max -> 1 (蓝), Min -> 0 (红)
    // 所以 Domain 应该是 [Min, Max]
    scaleDomain = [cExtent[0], cExtent[1]];
  } else {
    // 其他：值越大越红。
    // 我们希望 Max -> 0 (红), Min -> 1 (蓝)
    // 所以 Domain 应该是 [Max, Min]
    scaleDomain = [cExtent[1], cExtent[0]];
  }

  const cScale = d3.scaleSequential()
    .domain(scaleDomain)
    .interpolator(t => d3.interpolateTurbo(0.95 - 0.85 * t)); // 保持完全一致的 Turbo 色系
  
  const lineGenerator = d3.line().defined(d => !isNaN(d[1])).x(d => x(d[0])).y(d => y[d[0]](d[1]));

  const pathGroup = svg.append("g");
  window.parallelPaths = pathGroup.selectAll("path.main-line")
    .data(data).enter().append("path")
    .attr("class", d => {
      const match = (!currentSearch || d.name.toLowerCase().includes(currentSearch)) && 
                    (!currentYearFilter || d.year == currentYearFilter);
      return match ? "line main-line" : "line main-line inactive";
    })
    .attr("d", d => lineGenerator(parallelDimensions.map(p => [p, d[p]])))
    .style("stroke", d => cScale(d[colorKey]))
    .style("stroke-opacity", d => {
      const match = (!currentSearch || d.name.toLowerCase().includes(currentSearch)) && 
                    (!currentYearFilter || d.year == currentYearFilter);
      if (isFocusMode) return match ? 0.1 : 0.02;
      return match ? (isFiltered ? 1 : 0.6) : 0.05;
    })
    .style("stroke-width", 1.5)
    .style("fill", "none")
    .on("mouseover", function(event, d) {
      if (d3.select(this).classed("inactive")) return;
      d3.select(this).classed("highlight", true).style("stroke-width", 3).style("stroke-opacity", 1).raise();
      showTooltip(event, `<div class="tooltip-title">${d.name}</div><div class="tooltip-row"><span>年份:</span> <b>${d.year}</b></div><div class="tooltip-row"><span>好评率:</span> <b>${d.favorable_rate}%</b></div><div class="tooltip-row"><span>售价:</span> <b>¥${d.original_price}</b></div><div class="tooltip-row"><span>在线人数:</span> <b>${Math.round(Math.pow(10, d.log_players))}</b></div><div class="tooltip-row"><span>折扣力度:</span> <b>${d.discount_strength.toFixed(2)}</b></div><div class="tooltip-row"><span>留存天数:</span> <b>${d.retention_days}</b></div>`);
    })
    .on("mouseout", function(event, d) {
      const el = d3.select(this);
      el.classed("highlight", false).style("stroke-width", 1.5);
      const match = (!currentSearch || d.name.toLowerCase().includes(currentSearch)) && 
                    (!currentYearFilter || d.year == currentYearFilter);
      if (isFocusMode) el.style("stroke-opacity", match ? 0.1 : 0.02);
      else el.style("stroke-opacity", match ? (isFiltered ? 1 : 0.6) : 0.05);
      GlobalVizConfig.setupTooltip().style("opacity", 0);
    });

  const axisG = svg.selectAll("g.axis").data(parallelDimensions, d => d).enter()
    .append("g").attr("class", "axis").attr("transform", d => `translate(${x(d)})`);

  axisG.each(function(d) { d3.select(this).call(d3.axisLeft(y[d]).tickFormat(d === 'year' ? d3.format("d") : null)); });
  axisG.append("text").attr("class", "axis-title").style("text-anchor", "middle").attr("y", -15)
    .style("font-weight", "bold").style("fill", "var(--text-main)").style("font-size", "12px").text(d => nameMap[d]);
  
  svg.selectAll("g.axis").each(function(d, i) {
    const title = d3.select(this).select("text.axis-title");
    if (selectedAxisIndex !== null && i === selectedAxisIndex) {
      title.style("fill", "var(--accent-color)").style("font-size", "16px").style("font-weight", "bold").classed("axis-selected", true);
    } else {
      title.style("fill", "var(--text-main)").style("font-size", "12px").style("font-weight", "bold").classed("axis-selected", false);
    }
  });

  axisG.style("cursor", "pointer").on("click", function(event, d) {
    const clickedIdx = parallelDimensions.indexOf(d);
    if (clickedIdx === 0) return;
    if (selectedAxisIndex === null) {
      selectedAxisIndex = clickedIdx;
      svg.selectAll("g.axis").each(function(axisDim, i) {
        const title = d3.select(this).select("text.axis-title");
        if (i === clickedIdx) {
          title.style("fill", "var(--accent-color)").style("font-size", "16px").style("font-weight", "bold").classed("axis-selected", true);
        } else {
          title.style("fill", "var(--text-main)").style("font-size", "12px").style("font-weight", "bold").classed("axis-selected", false);
        }
      });
      if (clickedIdx === 2 || clickedIdx === 3) { 
        isFocusMode = true; 
        document.getElementById('exitFocusBtn').style.display = 'inline-block';
        drawParallelPlot(); 
      }
    } else {
      const targetIdx = selectedAxisIndex;
      const temp = parallelDimensions[targetIdx];
      parallelDimensions[targetIdx] = parallelDimensions[clickedIdx];
      parallelDimensions[clickedIdx] = temp;
      selectedAxisIndex = null;
      svg.selectAll("text.axis-title").style("fill", "var(--text-main)").style("font-size", "12px").classed("axis-selected", false);
      x.domain(parallelDimensions);
      const duration = typeof GlobalVizConfig !== 'undefined' ? GlobalVizConfig.layout.transitionDuration : 700;
      svg.selectAll(".axis").transition().duration(duration).attr("transform", d => `translate(${x(d)})`);
      window.parallelPaths.transition().duration(duration).attr("d", d => lineGenerator(parallelDimensions.map(p => [p, d[p]])));
      if (isFocusMode) setTimeout(() => drawParallelPlot(), duration + 10);
    }
  });

  if (isFocusMode && parallelDimensions.length >= 4) {
    const focusGroup = svg.append("g").attr("class", "focus-group");
    data.forEach(d => {
      const match = (!currentSearch || d.name.toLowerCase().includes(currentSearch)) && 
                    (!currentYearFilter || d.year == currentYearFilter);
      if (match) {
        focusGroup.append("path")
          .attr("class", "focus-segment")
          .attr("d", `M ${x(parallelDimensions[2])} ${y[parallelDimensions[2]](d[parallelDimensions[2]])} L ${x(parallelDimensions[3])} ${y[parallelDimensions[3]](d[parallelDimensions[3]])}`)
          .style("stroke", cScale(d[colorKey])).style("stroke-opacity", 0.8).style("stroke-width", 1.5).style("fill", "none").style("pointer-events", "none");
      }
    });
    // 传入 width 以定位右上角
    drawCorrelationBar(svg, width);
  }

  window.updateParallelChart = function(s, y_val) {
    const sLower = s.toLowerCase();
    const isNowFiltered = s !== "" || y_val !== "";
    window.parallelPaths.each(function(d) {
      const m = (!s || d.name.toLowerCase().includes(sLower)) && (!y_val || d.year == y_val);
      d3.select(this).classed("inactive", !m)
        .style("stroke-opacity", isFocusMode ? (m ? 0.1 : 0.02) : (m ? (isNowFiltered ? 1 : 0.6) : 0.05));
    });
    if (isFocusMode) drawParallelPlot();
  };

  renderLegend(svg, width, height, cExtent, cScale, colorKey);
}

function renderLegend(svg, width, height, ext, scale, key) {
  // 图例位置：左上角 (y = -85)
  const lW = 280, lH = 15, lX = 0, lY = -85;
  const g = svg.append("g").attr("transform", `translate(${lX},${lY})`);
  const gradId = "grad-main";
  const grad = svg.append("defs").append("linearGradient").attr("id", gradId).attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "0%");
  
  // 生成渐变色 stops
  for (let i = 0; i <= 10; i++) {
    // 线性计算当前值，scale 会自动处理它是映射到红还是蓝
    const val = ext[0] + (ext[1]-ext[0])*(i/10); 
    grad.append("stop").attr("offset", `${i*10}%`).attr("stop-color", scale(val));
  }

  g.append("rect").attr("width", lW).attr("height", lH).style("fill", `url(#${gradId})`);
  g.append("g").attr("transform", `translate(0,${lH + 5})`).call(d3.axisBottom(d3.scaleLinear().domain(ext).range([0, lW])).ticks(5));
  
  g.append("text").attr("x", lW / 2).attr("y", -5)
    .style("text-anchor", "middle").style("font-size", "11px").text(nameMap[key] || key);
}

// ---------------- 关联度 Bar (右上角) ----------------
function drawCorrelationBar(svg, chartWidth) {
  const dim = parallelDimensions;
  const xArr = data.map(d => d[dim[2]]), yArr = data.map(d => d[dim[3]]);
  const muX = d3.mean(xArr), muY = d3.mean(yArr);
  let num = 0, dX = 0, dY = 0;
  for(let i=0; i<xArr.length; i++) {
    const dx = xArr[i]-muX, dy = yArr[i]-muY;
    num += dx*dy; dX += dx**2; dY += dy**2;
  }
  const r = num / Math.sqrt(dX * dY) || 0;

  // 位置：右上角
  // chartWidth 为绘图区宽度，左移 220px 以容纳 200px 宽的条
  const barGroup = svg.append("g").attr("class", "correlation-viz")
    .attr("transform", `translate(${chartWidth - 220}, -85)`);

  const maxBarWidth = 100;
  const power = 0.5;
  const visualLen = Math.pow(Math.abs(r), power) * maxBarWidth;

  const centerX = 100; 
  const actualBarX = r < 0 ? centerX - visualLen : centerX;
  
  // 背景轴线
  barGroup.append("line").attr("x1", 0).attr("y1", 8).attr("x2", 200).attr("y2", 8)
    .style("stroke", "#ddd").style("stroke-width", 1);
  
  // 中心刻度
  barGroup.append("line").attr("x1", centerX).attr("y1", 5).attr("x2", centerX).attr("y2", 11)
    .style("stroke", "#999").style("stroke-width", 1);

  // 柱状条
  barGroup.append("rect")
    .attr("x", actualBarX)
    .attr("y", 2)
    .attr("width", Math.max(2, visualLen))
    .attr("height", 12)
    .attr("fill", r > 0 ? "#ff4d4d" : "#00d4ff")
    .attr("rx", 2)
    .style("cursor", "pointer")
    .on("mouseover", function(event) {
      showTooltip(event, `<div class="tooltip-title">关联度 (观察模式)</div><div class="tooltip-row"><span>皮尔逊系数:</span> <b>${r.toFixed(4)}</b></div>`);
    })
    .on("mouseout", function() {
      GlobalVizConfig.setupTooltip().style("opacity", 0);
    });
    
  // 标题
  barGroup.append("text").attr("x", 0).attr("y", -5)
    .attr("text-anchor", "start").style("font-size", "11px").style("fill", "var(--text-main)")
    .text(`关联度: ${r.toFixed(3)}`);
}

function drawTagBubbleChart() {
  if (!tagData || !tagData.children) return;
  const container = document.getElementById('tag-viz');
  container.innerHTML = "";
  const width = container.clientWidth, height = container.clientHeight;
  const svg = d3.select("#tag-viz").append("svg")
    .attr("width", width).attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("class", "shared-viz-svg")
    .style("display", "block").style("margin", "0 auto");

  const root = d3.hierarchy(tagData).sum(d => Math.pow(d.value, 0.6)).sort((a, b) => b.value - a.value);
  const pack = d3.pack().size([width, height]).padding(3);
  pack(root);
  const color = d3.scaleSequential([0, root.children.length], d3.interpolateMagma);
  const nodes = svg.selectAll("g").data(root.leaves()).join("g")
    .attr("transform", d => `translate(${d.x},${d.y})`)
    .attr("class", "node-group");

  nodes.append("circle").attr("r", d => d.r).attr("class", "bubble")
    .style("fill", (d, i) => color(i)).style("fill-opacity", 0.8).style("stroke", "#000").style("stroke-width", 1);

  nodes.append("text").attr("class", "bubble-text main-label").attr("y", -2).text(d => d.data.name)
    .style("font-size", d => Math.max(8, Math.min(d.r / 2.2, 16)) + "px").style("opacity", d => d.r > 10 ? 1 : 0)
    .style("pointer-events", "none").style("text-anchor", "middle").style("font-weight", "bold");

  nodes.append("text").attr("class", "bubble-subtext sub-label").attr("y", d => d.r / 2.2 + 4).text(d => Math.round(d.data.value))
    .style("font-size", d => Math.max(7, Math.min(d.r / 3, 10)) + "px").style("opacity", d => d.r > 12 ? 0.8 : 0)
    .style("pointer-events", "none").style("text-anchor", "middle");

  nodes.on("mouseover", function(event, d) {
    const group = d3.select(this);
    group.raise();
    group.select("circle").transition().duration(200).attr("r", d.r * 1.3).style("stroke", "#fff").style("stroke-width", 2).style("fill-opacity", 1);
    group.selectAll("text").transition().duration(200).style("opacity", 1).style("font-size", function() { return d3.select(this).classed("main-label") ? "14px" : "10px"; });
    let tagsHtml = d.data.detail_tags ? d.data.detail_tags.map(t => `<span class="tag-pill">${t}</span>`).join("") : "";
    const content = `<div class="tooltip-title">${d.data.name}</div><div class="tooltip-row"><span>综合热度:</span> <b>${Math.round(d.data.value)}</b></div><div class="tooltip-row"><span>关联游戏数:</span> <b>${d.data.game_count}</b></div><div style="margin-top:8px; border-top:1px solid var(--border-color); padding-top:4px;"><div style="color:var(--text-main); opacity:0.7; font-size:10px;">包含 Tags:</div><div style="white-space:normal; max-width:200px;">${tagsHtml}</div></div>`;
    showTooltip(event, content);
  }).on("mouseout", function(event, d) {
    const group = d3.select(this);
    group.select("circle").transition().duration(200).attr("r", d.r).style("stroke", "#000").style("stroke-width", 1).style("fill-opacity", 0.8);
    group.select(".main-label").transition().duration(200).style("font-size", Math.max(8, Math.min(d.r / 2.2, 16)) + "px").style("opacity", d.r > 10 ? 1 : 0);
    group.select(".sub-label").transition().duration(200).style("font-size", Math.max(7, Math.min(d.r / 3, 10)) + "px").style("opacity", d.r > 12 ? 0.8 : 0);
    GlobalVizConfig.setupTooltip().style("opacity", 0);
  });
}

function drawScatterChart(xKey, yKey) {
  const container = document.getElementById('scatter-viz');
  container.innerHTML = "";
  const w = container.clientWidth, h = container.clientHeight;
  const m = { top: 20, right: 30, bottom: 40, left: 60 };
  const svg = d3.select("#scatter-viz").append("svg").attr("width", w).attr("height", h).attr("class", "shared-viz-svg").append("g").attr("transform", `translate(${m.left},${m.top})`);
  const iW = w - m.left - m.right, iH = h - m.top - m.bottom;
  const xExtent = d3.extent(data, d => d[xKey]), xSpan = xExtent[1] - xExtent[0];
  const x = d3.scaleLinear().domain([xExtent[0] - xSpan * 0.1, xExtent[1] + xSpan * 0.1]).range([0, iW]);
  const y = d3.scaleLinear().domain(d3.extent(data, d => d[yKey])).nice().range([iH, 0]);
  svg.append("g").attr("transform", `translate(0,${iH})`).call(d3.axisBottom(x).ticks(5).tickFormat(xKey==='year'?d3.format("d"):null));
  svg.append("g").call(d3.axisLeft(y).ticks(5));
  svg.append("text").attr("x", iW/2).attr("y", iH+35).style("text-anchor","middle").style("font-size","12px").text(nameMap[xKey]);
  const cKey = document.getElementById('colorSelect').value;
  const cExt = d3.extent(data, d => d[cKey]);
  
  // [关键修改] Scatter Chart 同步 Parallel Chart 的颜色逻辑
  let scaleDomain;
  if (cKey === 'favorable_rate') {
    scaleDomain = [cExt[0], cExt[1]]; // [Min, Max] -> Blue High
  } else {
    scaleDomain = [cExt[1], cExt[0]]; // [Max, Min] -> Red High
  }

  const cScale = d3.scaleSequential()
    .domain(scaleDomain)
    .interpolator(t => d3.interpolateTurbo(0.95 - 0.85 * t));

  svg.selectAll("circle").data(data).enter().append("circle").attr("cx", d => x(d[xKey])).attr("cy", d => y(d[yKey])).attr("r", 5).style("fill", d => cScale(d[cKey])).style("stroke", "#000").style("stroke-width", 0.8)
    .on("mouseover", function(e, d) { d3.select(this).attr("r", 8).style("stroke", "#fff").raise(); showTooltip(e, `<div class="tooltip-title">${d.name}</div><div class="tooltip-row"><span>${nameMap[xKey]}:</span> <b>${xKey === 'year' ? d[xKey] : d[xKey].toFixed(2)}</b></div><div class="tooltip-row"><span>${nameMap[yKey]}:</span> <b>${yKey === 'year' ? d[yKey] : yKey === 'log_players' ? Math.round(Math.pow(10, d[yKey])) : d[yKey].toFixed(2)}</b></div><div class="tooltip-row"><span>年份:</span> <b>${d.year}</b></div><div class="tooltip-row"><span>好评率:</span> <b>${d.favorable_rate}%</b></div>`); })
    .on("mouseout", function() { d3.select(this).attr("r", 5).style("stroke", "#000"); GlobalVizConfig.setupTooltip().style("opacity", 0); });
}

function init() { drawParallelPlot(); drawTagBubbleChart(); updateScatter(); }
function updateScatter() { drawScatterChart(document.getElementById('scatterX').value, document.getElementById('scatterY').value); }
window.exitFocusMode = () => { 
  isFocusMode = false; 
  selectedAxisIndex = null; 
  document.getElementById('exitFocusBtn').style.display = 'none'; 
  const svg = d3.select("#main-chart-container svg.shared-viz-svg"); 
  if (!svg.empty()) svg.selectAll("text.axis-title").style("fill", "var(--text-main)").style("font-size", "12px"); 
  drawParallelPlot(); 
};
window.resetFilters = () => { document.getElementById('searchName').value = ''; document.getElementById('selectYear').value = ''; window.updateParallelChart("", ""); };
document.getElementById('searchName').addEventListener('input', e => window.updateParallelChart(e.target.value, document.getElementById('selectYear').value));
document.getElementById('selectYear').addEventListener('change', e => window.updateParallelChart(document.getElementById('searchName').value, e.target.value));
document.getElementById('colorSelect').addEventListener('change', () => { drawParallelPlot(); updateScatter(); });
document.getElementById('scatterX').addEventListener('change', updateScatter);
document.getElementById('scatterY').addEventListener('change', updateScatter);
window.addEventListener('resize', () => init());
loadData();