// modules/scatterPlot.js

let scatterState = {
  // 缓存 DOM 和 Context
  svg: null,
  canvas: null,
  ctx: null,
  xAxisG: null,
  yAxisG: null,
  xLabel: null,
  
  // 数据与状态
  particles: [], 
  timer: null,   
  lastXKey: null,
  lastYKey: null,
  
  // 交互缓存
  width: 0,
  height: 0,
  xScale: null,
  yScale: null,
  hovered: null
};

function drawScatterChart(data, nameMap, xKey, yKey, containerId, colorSelectId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // ★ 1. 样式回归：纯白背景，干净清爽
  container.style.backgroundColor = "#ffffff"; 
  container.style.borderRadius = "12px"; 
  container.style.overflow = "hidden";
  // 给一个极淡的阴影，让它像一张卡片
  container.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)";

  // --- 2. 布局计算 ---
  const w = container.clientWidth || 800;
  const h = container.clientHeight || 500;
  const m = { top: 20, right: 30, bottom: 40, left: 60 };
  const iW = w - m.left - m.right;
  const iH = h - m.top - m.bottom;
  
  scatterState.width = iW;
  scatterState.height = iH;

  // --- 3. 初始化容器 (Hybrid: Canvas + SVG) ---
  if (!scatterState.svg) {
    container.innerHTML = "";
    container.style.position = 'relative';

    // Canvas 层：粒子动画
    const canvas = d3.select(container).append("canvas")
      .attr("width", iW)
      .attr("height", iH)
      .style("position", "absolute")
      .style("top", `${m.top}px`)
      .style("left", `${m.left}px`)
      .style("pointer-events", "all")
      .style("z-index", 1);
      
    // SVG 层：坐标轴
    const svg = d3.select(container).append("svg")
      .attr("width", w)
      .attr("height", h)
      .attr("class", "shared-viz-svg")
      .style("position", "absolute")
      .style("top", 0)
      .style("left", 0)
      .style("pointer-events", "none")
      .style("z-index", 2)
      .style("background", "transparent");

    const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);
    
    scatterState.canvas = canvas.node();
    scatterState.ctx = canvas.node().getContext('2d');
    scatterState.svg = svg;
    scatterState.xAxisG = g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${iH})`);
    scatterState.yAxisG = g.append("g").attr("class", "y-axis");
    
    // 轴标题：深灰色
    scatterState.xLabel = g.append("text").attr("class", "x-axis-label")
      .attr("x", iW/2).attr("y", iH+35)
      .style("text-anchor","middle")
      .style("font-size","12px")
      .style("fill", "#64748b") 
      .style("font-weight", "bold");
      
    // 绑定交互
    d3.select(scatterState.canvas)
        .on("mousemove", (e) => handleMouseMove(e, container, nameMap, xKey, yKey))
        .on("mouseout", handleMouseOut);
        
  } else {
    d3.select(scatterState.canvas).attr("width", iW).attr("height", iH);
    scatterState.svg.attr("width", w).attr("height", h);
    scatterState.xAxisG.attr("transform", `translate(0,${iH})`);
    scatterState.xLabel.attr("x", iW/2).attr("y", iH+35);
  }

  // --- 4. 比例尺与坐标轴 ---
  const xExtent = d3.extent(data, d => d[xKey]);
  const xPad = (xExtent[1] - xExtent[0]) * 0.05 || 1; 
  const x = d3.scaleLinear().domain([xExtent[0] - xPad, xExtent[1] + xPad]).range([0, iW]);

  const yExtent = d3.extent(data, d => d[yKey]);
  const yPad = (yExtent[1] - yExtent[0]) * 0.05 || 1;
  const y = d3.scaleLinear().domain([yExtent[0] - yPad, yExtent[1] + yPad]).range([iH, 0]);
  
  scatterState.xScale = x;
  scatterState.yScale = y;

  // 颜色：Turbo 依然很好看，或者用 Viridis
  const cKeyElement = document.getElementById(colorSelectId);
  const cKey = cKeyElement ? cKeyElement.value : 'favorable_rate';
  const cExt = d3.extent(data, d => d[cKey]);
  let scaleDomain = cKey === 'favorable_rate' ? [cExt[0], cExt[1]] : [cExt[1], cExt[0]];
  if (!scaleDomain[0]) scaleDomain = [0, 1];
  const cScale = d3.scaleSequential().domain(scaleDomain).interpolator(t => d3.interpolateTurbo(t));

  // 坐标轴绘制 (标准灰色风格)
  const t = d3.transition().duration(800).ease(d3.easeCubicOut);
  
  // X轴
  let xAxisCall = d3.axisBottom(x).ticks(6).tickPadding(10);
  if (xKey === 'year') xAxisCall = xAxisCall.tickFormat(d3.format("d"));
  
  // Y轴
  const yAxisCall = d3.axisLeft(y).ticks(6).tickPadding(10);

  // 轴线样式：标准的灰色
  const axisColor = "#e2e8f0"; // 浅灰轴线
  const tickColor = "#94a3b8"; // 深灰文字

  scatterState.xAxisG.transition(t).call(xAxisCall)
    .call(g => {
        g.selectAll(".domain").attr("stroke", axisColor); 
        g.selectAll(".tick line").attr("stroke", axisColor); 
        g.selectAll(".tick text").attr("fill", tickColor); 
    });
    
  scatterState.yAxisG.transition(t).call(yAxisCall)
    .call(g => {
        g.selectAll(".domain").attr("stroke", axisColor);
        g.selectAll(".tick line").attr("stroke", axisColor);
        g.selectAll(".tick text").attr("fill", tickColor);
    });
    
  scatterState.xLabel.text(nameMap[xKey]);

  // --- 5. 粒子系统 (物理引擎) ---
  
  const particleMap = new Map();
  scatterState.particles.forEach(p => particleMap.set(p.data.name, p));
  
  const isAxisChange = scatterState.lastXKey !== xKey || scatterState.lastYKey !== yKey;

  const nextParticles = data.map(d => {
    const targetX = x(d[xKey]);
    const targetY = y(d[yKey]);
    const color = d3.color(cScale(d[cKey])).toString();
    
    let p = particleMap.get(d.name);
    
    if (p) {
        // [UPDATE]
        p.tx = targetX;
        p.ty = targetY;
        p.tColor = color;
        p.data = d;
        p.sx = p.x;
        p.sy = p.y;
        p.sr = p.r;
        
        // ★ 贝塞尔曲线控制点 (保持您喜欢的飞行逻辑)
        if (isAxisChange) {
            const midX = (p.sx + p.tx) / 2;
            const midY = (p.sy + p.ty) / 2;
            const offset = (Math.random() - 0.5) * 200; 
            p.cx = midX - (p.ty - p.sy) * 0.2 + offset;
            p.cy = midY + (p.tx - p.sx) * 0.2 + offset;
        } else {
            p.cx = (p.sx + p.tx) / 2;
            p.cy = (p.sy + p.ty) / 2;
        }
    } else {
        // [ENTER]
        const startX = targetX + (Math.random() - 0.5) * 100; 
        const startY = targetY + (Math.random() - 0.5) * 100;
        
        p = {
            data: d,
            x: startX, y: startY, r: 0,
            sx: startX, sy: startY, sr: 0,
            tx: targetX, ty: targetY, tr: 5, // 粒子稍大一点，显色
            cx: startX, cy: startY, 
            color: color, tColor: color,
            delay: Math.random() * 0.4, 
            isNew: true
        };
    }
    
    p.progress = 0;
    p.animDuration = isAxisChange ? 1500 : 800; 
    return p;
  });
  
  scatterState.particles = nextParticles;
  scatterState.lastXKey = xKey;
  scatterState.lastYKey = yKey;

  // --- 6. 渲染循环 ---
  if (scatterState.timer) scatterState.timer.stop();
  
  scatterState.timer = d3.timer((elapsed) => {
    const ctx = scatterState.ctx;
    const width = scatterState.width;
    const height = scatterState.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // ★ 混合模式：Multiply (正片叠底)
    // 白底神器。粒子重叠处颜色会变深，产生漂亮的通透感，像彩墨滴在纸上。
    ctx.globalCompositeOperation = 'multiply';
    
    for (let i = 0; i < scatterState.particles.length; i++) {
        const p = scatterState.particles[i];
        
        // 动画进度
        let t = (elapsed - p.delay * 1000) / p.animDuration;
        if (t < 0) t = 0;
        if (t > 1) t = 1;
        
        const ease = d3.easeCubicInOut(t);
        
        // 贝塞尔飞行
        if (p.isNew) {
            p.x = p.sx + (p.tx - p.sx) * d3.easeBackOut(t);
            p.y = p.sy + (p.ty - p.sy) * d3.easeBackOut(t);
            p.r = p.tr * d3.easeBackOut(t);
            if (t === 1) p.isNew = false;
        } else {
            const invT = 1 - ease;
            p.x = invT * invT * p.sx + 2 * invT * ease * p.cx + ease * ease * p.tx;
            p.y = invT * invT * p.sy + 2 * invT * ease * p.cy + ease * ease * p.ty;
            
            // 呼吸效果
            const breath = Math.sin(Math.PI * ease);
            const targetR = p === scatterState.hovered ? 9 : 5;
            p.r = targetR - breath * 1.5; 
        }
        
        // ★ 绘制粒子：清爽纯色球
        if (p.r > 0) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
            
            // 填充：半透明，重叠变深
            ctx.fillStyle = p.color;
            ctx.globalAlpha = 0.75; 
            ctx.fill();
            
            // 没有任何核心，没有任何描边，纯粹的色块
        }
    }
  });
}

// --- 7. 交互逻辑 ---
function handleMouseMove(event, container, nameMap, xKey, yKey) {
    const rect = scatterState.canvas.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    
    let minDist = 20; 
    let nearest = null;
    
    scatterState.particles.forEach(p => {
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < minDist) {
            minDist = dist;
            nearest = p;
        }
    });
    
    scatterState.hovered = nearest;
    
    if (nearest) {
        d3.select(scatterState.canvas).style("cursor", "pointer");
        
        const d = nearest.data;
        // Tooltip 样式建议：白底黑字，带阴影
        let tipContent = `<div class="tooltip-title" style="color:#333">${d.name}</div>`;
        if (xKey !== 'log_players') tipContent += `<div class="tooltip-row"><span style="color:#666">${nameMap[xKey]}:</span> <b style="color:#000">${xKey === 'year' ? d[xKey] : Number(d[xKey]).toFixed(2)}</b></div>`;
        if (yKey !== 'log_players') tipContent += `<div class="tooltip-row"><span style="color:#666">${nameMap[yKey]}:</span> <b style="color:#000">${xKey === 'year' ? d[yKey] : Number(d[yKey]).toFixed(2)}</b></div>`;
        tipContent += `
            <div class="tooltip-row"><span style="color:#666">👥 最大在线:</span> <b style="color:#000">${d.max_players.toLocaleString()}</b></div>
            <div class="tooltip-row"><span style="color:#666">👍 好评率:</span> <b style="color:#000">${d.favorable_rate}%</b></div>
        `;
        
        if (window.Utils && window.Utils.showTooltip) {
            window.Utils.showTooltip(event, tipContent);
        }
    } else {
        d3.select(scatterState.canvas).style("cursor", "default");
        if (window.Utils) d3.select("#shared-tooltip").style("opacity", 0);
    }
}

function handleMouseOut() {
    scatterState.hovered = null;
    if (window.Utils) d3.select("#shared-tooltip").style("opacity", 0);
}

const ScatterPlot = { draw: drawScatterChart };
window.ScatterPlot = ScatterPlot;