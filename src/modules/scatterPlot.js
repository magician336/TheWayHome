// modules/scatterPlot.js

let scatterState = {
    svg: null, canvas: null, ctx: null, xAxisG: null, yAxisG: null, xLabel: null, yLabel: null, // 新增 yLabel
    matrixBgG: null, particles: [], timer: null,   
    lastXKey: null, lastYKey: null, currentMode: 'scatter', 
    width: 0, height: 0, xScale: null, yScale: null, hovered: null
  };
  
  function drawScatterChart(data, nameMap, xKey, yKey, containerId, colorSelectId, mode = 'scatter') {
    const container = document.getElementById(containerId);
    if (!container) return;
  
    // --- 1. 基础样式初始化 ---
    container.classList.remove("literary-organic-container", "literary-nature-container", "literary-complex-container");
    
    container.style.backgroundColor = "#ffffff"; 
    container.style.borderRadius = "12px"; 
    container.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)";
    container.style.position = 'relative';
    container.style.overflow = "hidden"; 
  
    scatterState.currentMode = mode;
    let activeXKey = xKey;
    let activeYKey = yKey;
    
    if (mode === 'matrix') {
      activeXKey = 'discount_frequency';
      activeYKey = 'avg_discount_rate';
    }
  
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 500;
    
    // 布局边距
    const m = { top: 30, right: 40, bottom: 50, left: 70 }; 
    const iW = w - m.left - m.right;
    const iH = h - m.top - m.bottom;
    
    scatterState.width = iW;
    scatterState.height = iH;
  
    if (!scatterState.svg) {
      container.innerHTML = ""; 
      
      const canvas = d3.select(container).append("canvas")
        .attr("width", iW).attr("height", iH)
        .style("position", "absolute")
        .style("top", `${m.top}px`).style("left", `${m.left}px`)
        .style("pointer-events", "all").style("z-index", 10);
        
      const svg = d3.select(container).append("svg")
        .attr("width", w).attr("height", h)
        .attr("class", "parallel-chart-shared-viz-svg")
        .style("position", "absolute")
        .style("top", 0).style("left", 0)
        .style("pointer-events", "none").style("z-index", 20)
        .style("background", "transparent");
  
      const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);
      const matrixBgG = g.append("g").attr("class", "matrix-bg").style("opacity", 0);
  
      scatterState.canvas = canvas.node();
      scatterState.ctx = canvas.node().getContext('2d');
      scatterState.svg = svg;
      scatterState.matrixBgG = matrixBgG;
      scatterState.xAxisG = g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${iH})`);
      scatterState.yAxisG = g.append("g").attr("class", "y-axis");
      
      // X 轴标题
      scatterState.xLabel = g.append("text").attr("class", "x-axis-label")
        .attr("x", iW/2).attr("y", iH+35)
        .style("text-anchor","middle").style("font-size","12px")
        .style("fill", "#666").style("font-weight", "bold"); 
  
      // 【新增】Y 轴标题
      scatterState.yLabel = g.append("text").attr("class", "y-axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -iH/2).attr("y", -50) // 位置向左偏移，避免和刻度重叠
        .style("text-anchor","middle").style("font-size","12px")
        .style("fill", "#666").style("font-weight", "bold");
        
      d3.select(scatterState.canvas)
          .on("mousemove", (e) => handleMouseMove(e, container, nameMap, activeXKey, activeYKey))
          .on("mouseout", handleMouseOut);
          
    } else {
      d3.select(scatterState.canvas).attr("width", iW).attr("height", iH);
      scatterState.svg.attr("width", w).attr("height", h);
      scatterState.xAxisG.attr("transform", `translate(0,${iH})`);
      scatterState.xLabel.attr("x", iW/2).attr("y", iH+35);
      // 【更新】更新 Y 轴标题位置
      scatterState.yLabel.attr("x", -iH/2).attr("y", -50);
    }
  
    // --- 2. 比例尺与数据逻辑 ---
    let x, y;
    if (mode === 'matrix') {
      const maxFreq = d3.max(data, d => d.discount_frequency) || 5;
      x = d3.scaleLinear().domain([-0.5, Math.max(5, maxFreq) + 1.5]).range([0, iW]);
      y = d3.scaleLinear().domain([-0.05, 0.55]).range([iH, 0]);
    } else {
      const xExtent = d3.extent(data, d => d[activeXKey]);
      const xPad = (xExtent[1] - xExtent[0]) * 0.1 || 1; 
      x = d3.scaleLinear().domain([xExtent[0] - xPad, xExtent[1] + xPad]).range([0, iW]);
      
      const yExtent = d3.extent(data, d => d[activeYKey]);
      const yPad = (yExtent[1] - yExtent[0]) * 0.1 || 1; 
      y = d3.scaleLinear().domain([yExtent[0] - yPad, yExtent[1] + yPad]).range([iH, 0]);
    }
    
    scatterState.xScale = x;
    scatterState.yScale = y;
  
    const cKeyElement = document.getElementById(colorSelectId);
    const cKey = cKeyElement ? cKeyElement.value : 'favorable_rate';
    const cExt = d3.extent(data, d => d[cKey]);
    let scaleDomain = [cExt[1], cExt[0]];
    if (cKey === 'favorable_rate') scaleDomain = [cExt[0], cExt[1]];
    if (!scaleDomain[0] || scaleDomain[0] === scaleDomain[1]) scaleDomain = [0, 1];
    
    const cScale = d3.scaleSequential()
      .domain(scaleDomain)
      .interpolator(t => d3.interpolateTurbo(0.95 - 0.85 * t));
  
    // --- 3. 轴样式 ---
    const t = d3.transition().duration(800).ease(d3.easeCubicOut);
    const axisColor = "#e2e8f0"; 
    const tickColor = "#94a3b8"; 
  
    let xAxisCall = d3.axisBottom(x).ticks(8).tickPadding(10);
    if (mode === 'scatter' && activeXKey === 'year') xAxisCall.tickFormat(d3.format("d"));
    
    let yAxisCall = d3.axisLeft(y).ticks(6).tickPadding(10);
    if (mode === 'matrix' || activeYKey === 'avg_discount_rate' || activeYKey === 'favorable_rate') {
        yAxisCall.tickFormat(d => (mode === 'matrix' ? d*100 : d) + "%");
    }
  
    scatterState.xAxisG.transition(t).call(xAxisCall)
      .call(g => {
          g.selectAll(".domain").attr("stroke", axisColor).attr("stroke-width", 1); 
          g.selectAll(".tick line").attr("stroke", axisColor); 
          g.selectAll(".tick text").attr("fill", tickColor).style("font-weight", "normal"); 
      });
      
    scatterState.yAxisG.transition(t).call(yAxisCall)
      .call(g => {
          g.selectAll(".domain").attr("stroke", axisColor).attr("stroke-width", 1);
          g.selectAll(".tick line").attr("stroke", axisColor);
          g.selectAll(".tick text").attr("fill", tickColor).style("font-weight", "normal");
      });
  
    //设置 X 和 Y 轴标题文字
    scatterState.xLabel.text(mode === 'matrix' ? "年均打折频率 (次/年)" : nameMap[activeXKey]);
    scatterState.yLabel.text(mode === 'matrix' ? "平均折扣深度" : nameMap[activeYKey]);
  
    updateMatrixBackground(mode, iW, iH, x, y);
  
    // --- 4. 粒子初始化 ---
    const particleMap = new Map();
    scatterState.particles.forEach(p => particleMap.set(p.data.name, p));
    const isAxisChange = scatterState.lastXKey !== activeXKey || scatterState.lastYKey !== activeYKey;
  
    const nextParticles = data.map(d => {
      let targetX = x(d[activeXKey]);
      let targetY = y(d[activeYKey]);
      if (mode === 'matrix') {
          let rawRate = d.avg_discount_rate;
          if (rawRate > 0.5) rawRate = 0.5;
          targetY = y(rawRate);
          if (d.discount_frequency === 0) targetX = x(0);
      }
      const color = d3.color(cScale(d[cKey])).toString();
      let p = particleMap.get(d.name);
      
      if (p) {
          p.tx = targetX; p.ty = targetY; p.color = color; p.data = d;
          p.sx = p.x; p.sy = p.y; p.px = p.x; p.py = p.y;
          if (isAxisChange) {
              const midX = (p.sx + p.tx) / 2;
              const midY = (p.sy + p.ty) / 2;
              const offset = (Math.random() - 0.5) * 200; 
              p.cx = midX - (p.ty - p.sy) * 0.2 + offset;
              p.cy = midY + (p.tx - p.sx) * 0.2 + offset;
          } else {
              p.cx = (p.sx + p.tx) / 2; p.cy = (p.sy + p.ty) / 2;
          }
      } else {
          const startX = targetX + (Math.random() - 0.5) * 100; 
          const startY = targetY + (Math.random() - 0.5) * 100;
          p = {
              data: d, x: startX, y: startY, r: 0,
              sx: startX, sy: startY, px: startX, py: startY,
              tx: targetX, ty: targetY, 
              tr: 3.5, 
              cx: startX, cy: startY, color: color, 
              delay: Math.random() * 0.4, isNew: true
          };
      }
      p.progress = 0; p.animDuration = 1000; 
      return p;
    });
    
    scatterState.particles = nextParticles;
    scatterState.lastXKey = activeXKey;
    scatterState.lastYKey = activeYKey;
  
    if (scatterState.timer) scatterState.timer.stop();
    scatterState.timer = d3.timer((elapsed) => renderLoop(elapsed));
  }
  
  function updateMatrixBackground(mode, w, h, x, y) {
      const bg = scatterState.matrixBgG;
      if (mode !== 'matrix') {
          bg.transition().duration(500).style("opacity", 0).on("end", () => bg.selectAll("*").remove());
          return;
      }
      bg.selectAll("*").remove();
      bg.style("opacity", 1); 
  
      const midFreq = 3.0; const midRate = 0.25;
      bg.append("line").attr("x1", x(midFreq)).attr("y1", 0).attr("x2", x(midFreq)).attr("y2", h)
          .style("stroke", "#cbd5e1").style("stroke-dasharray", "4,4").style("stroke-width", 1.5);
      bg.append("line").attr("x1", 0).attr("y1", y(midRate)).attr("x2", w).attr("y2", y(midRate))
          .style("stroke", "#cbd5e1").style("stroke-dasharray", "4,4").style("stroke-width", 1.5);
  
      const labelStyle = "font-size:16px; font-weight:bold; fill:#64748b; opacity:0.8; pointer-events:none;";
      bg.append("text").attr("x", w - 10).attr("y", 20).attr("text-anchor", "end").attr("style", labelStyle).text("💸 清仓甩卖型").style("opacity", 0).transition().delay(300).style("opacity", 0.8);
      bg.append("text").attr("x", 10).attr("y", 20).attr("text-anchor", "start").attr("style", labelStyle).text("💎 高冷节日型").style("opacity", 0).transition().delay(400).style("opacity", 0.8);
      bg.append("text").attr("x", 10).attr("y", h - 10).attr("text-anchor", "start").attr("style", labelStyle).text("🛡️ 价值坚守型").style("opacity", 0).transition().delay(500).style("opacity", 0.8);
      bg.append("text").attr("x", w - 10).attr("y", h - 10).attr("text-anchor", "end").attr("style", labelStyle).text("📢 刷脸曝光型").style("opacity", 0).transition().delay(600).style("opacity", 0.8);
  }
  
  // ============================================
  // 渲染循环：极简锐利粒子 + 拖尾
  // ============================================
  function renderLoop(elapsed) {
      const ctx = scatterState.ctx;
      const width = scatterState.width;
      const height = scatterState.height;
      
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';
      
      for (let i = 0; i < scatterState.particles.length; i++) {
          const p = scatterState.particles[i];
          
          p.px = p.x;
          p.py = p.y;
          
          let t = (elapsed - p.delay * 1000) / p.animDuration;
          if (t < 0) t = 0;
          if (t > 1) t = 1;
          
          const ease = d3.easeCubicInOut(t);
          
          if (p.isNew) {
              p.x = p.sx + (p.tx - p.sx) * d3.easeBackOut(t);
              p.y = p.sy + (p.ty - p.sy) * d3.easeBackOut(t);
              p.r = p.tr * d3.easeBackOut(t);
              if (t === 1) p.isNew = false;
          } else {
              const invT = 1 - ease;
              p.x = invT * invT * p.sx + 2 * invT * ease * p.cx + ease * ease * p.tx;
              p.y = invT * invT * p.sy + 2 * invT * ease * p.cy + ease * ease * p.ty;
              
              const breath = Math.sin(elapsed * 0.003 + p.x * 0.01); 
              const targetR = p === scatterState.hovered ? 7 : 3.5;
              p.r = targetR + breath * 0.3; 
          }
          
          if (p.r <= 0) continue;
  
          const dx = p.x - p.px;
          const dy = p.y - p.py;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          if (dist > 1.0) {
              ctx.lineWidth = p.r * 1.0; 
              ctx.lineCap = 'round';
              ctx.strokeStyle = p.color;
              ctx.globalAlpha = 0.5; 
              
              ctx.beginPath();
              ctx.moveTo(p.px, p.py);
              ctx.lineTo(p.x, p.y);
              ctx.stroke();
          }
  
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = 1.0; 
          ctx.fill();
          
          const strokeColor = d3.color(p.color).darker(0.5).toString();
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 0.5; 
          ctx.globalAlpha = 1.0;
          ctx.stroke();
          
          if (p === scatterState.hovered) {
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.r + 4, 0, 2 * Math.PI);
              ctx.strokeStyle = "#333";
              ctx.lineWidth = 1;
              ctx.globalAlpha = 0.5;
              ctx.stroke();
          }
      }
  }
  
  function handleMouseMove(event, container, nameMap, xKey, yKey) {
      const rect = scatterState.canvas.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      let minDist = 20; let nearest = null;
      scatterState.particles.forEach(p => {
          const dx = p.x - mx; const dy = p.y - my;
          if (Math.sqrt(dx*dx + dy*dy) < minDist) { minDist = Math.sqrt(dx*dx + dy*dy); nearest = p; }
      });
      scatterState.hovered = nearest;
      
      if (nearest) {
          d3.select(scatterState.canvas).style("cursor", "pointer");
          const d = nearest.data;
          let tipContent = `<div class="tooltip-title" style="color:#333">${d.name}</div>`;
          if (scatterState.currentMode === 'matrix') {
              tipContent += `
                <div class="tooltip-row"><span>📊 策略:</span> <b>${d.strategy_class}</b></div>
                <div class="tooltip-row"><span>📉 频率:</span> <b>${d.discount_frequency.toFixed(1)} 次</b></div>
                <div class="tooltip-row"><span>💸 折扣:</span> <b>${(d.avg_discount_rate*100).toFixed(0)}%</b></div>`;
              if (d.events_breakdown) {
                   const events = Object.entries(d.events_breakdown).filter(([k,v])=>v>0&&k!="日常").sort((a,b)=>b[1]-a[1]).slice(0,3);
                   if (events.length>0) tipContent += `<div class="tooltip-row" style="margin-top:4px; color:#e67e22;"><span>🔥 热门:</span> <b>${events.map(e=>e[0].split(' ')[0]).join(', ')}</b></div>`;
              }
          } else {
              if (xKey !== 'log_players') tipContent += `<div class="tooltip-row"><span>${nameMap[xKey]}:</span> <b>${xKey==='year'?d[xKey]:Number(d[xKey]).toFixed(2)}</b></div>`;
              if (yKey !== 'log_players') tipContent += `<div class="tooltip-row"><span>${nameMap[yKey]}:</span> <b>${xKey==='year'?d[yKey]:Number(d[yKey]).toFixed(2)}</b></div>`;
              tipContent += `<div class="tooltip-row"><span>👥 在线:</span> <b>${d.max_players.toLocaleString()}</b></div>`;
          }
          if (window.Utils && window.Utils.showTooltip) window.Utils.showTooltip(event, tipContent);
      } else {
          d3.select(scatterState.canvas).style("cursor", "default");
          if (window.Utils) d3.select("#parallel-chart-shared-tooltip").style("opacity", 0);
      }
  }
  function handleMouseOut() {
      scatterState.hovered = null;
      if (window.Utils) d3.select("#parallel-chart-shared-tooltip").style("opacity", 0);
  }
  const ScatterPlot = { draw: drawScatterChart };
  window.ScatterPlot = ScatterPlot;