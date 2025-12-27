// modules/scatterPlot.js

let scatterState = {
  // 缓存 DOM 和 Context
  svg: null,
  canvas: null,
  ctx: null,
  xAxisG: null,
  yAxisG: null,
  xLabel: null,
  
  // 矩阵特有的 SVG 组 (用于放虚线和文字)
  matrixBgG: null, 

  // 数据与状态
  particles: [], 
  timer: null,   
  lastXKey: null,
  lastYKey: null,
  currentMode: 'scatter', // 'scatter' | 'matrix'
  
  // 交互缓存
  width: 0,
  height: 0,
  xScale: null,
  yScale: null,
  hovered: null
};

/**
 * 核心绘制函数
 * @param {Array} data 数据
 * @param {Object} nameMap 字段映射
 * @param {String} xKey 散点模式下的X字段
 * @param {String} yKey 散点模式下的Y字段
 * @param {String} containerId 容器ID
 * @param {String} colorSelectId 颜色选择器ID
 * @param {String} mode 'scatter' | 'matrix'
 */
function drawScatterChart(data, nameMap, xKey, yKey, containerId, colorSelectId, mode = 'scatter') {
  const container = document.getElementById(containerId);
  if (!container) return;

  scatterState.currentMode = mode;

  // 如果是矩阵模式，强制锁定 X 和 Y 轴字段
  let activeXKey = xKey;
  let activeYKey = yKey;
  
  if (mode === 'matrix') {
    activeXKey = 'discount_frequency';
    activeYKey = 'avg_discount_rate';
  }

  // --- 1. 样式与初始化 (只做一次) ---
  container.style.backgroundColor = "#ffffff"; 
  container.style.borderRadius = "12px"; 
  container.style.overflow = "hidden";
  container.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)";
  container.style.position = 'relative';

  const w = container.clientWidth || 800;
  const h = container.clientHeight || 500;
  const m = { top: 20, right: 40, bottom: 40, left: 60 };
  const iW = w - m.left - m.right;
  const iH = h - m.top - m.bottom;
  
  scatterState.width = iW;
  scatterState.height = iH;

  if (!scatterState.svg) {
    container.innerHTML = "";

    // Canvas 层：粒子动画
    const canvas = d3.select(container).append("canvas")
      .attr("width", iW)
      .attr("height", iH)
      .style("position", "absolute")
      .style("top", `${m.top}px`)
      .style("left", `${m.left}px`)
      .style("pointer-events", "all")
      .style("z-index", 1);
      
    // SVG 层：坐标轴 & 背景装饰
    const svg = d3.select(container).append("svg")
      .attr("width", w)
      .attr("height", h)
      .attr("class", "parallel-chart-shared-viz-svg")
      .style("position", "absolute")
      .style("top", 0)
      .style("left", 0)
      .style("pointer-events", "none")
      .style("z-index", 2)
      .style("background", "transparent");

    const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);
    
    // 背景层（用于矩阵的象限线）
    const matrixBgG = g.append("g").attr("class", "matrix-bg").style("opacity", 0);

    scatterState.canvas = canvas.node();
    scatterState.ctx = canvas.node().getContext('2d');
    scatterState.svg = svg;
    scatterState.matrixBgG = matrixBgG;
    scatterState.xAxisG = g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${iH})`);
    scatterState.yAxisG = g.append("g").attr("class", "y-axis");
    
    // 轴标题
    scatterState.xLabel = g.append("text").attr("class", "x-axis-label")
      .attr("x", iW/2).attr("y", iH+35)
      .style("text-anchor","middle")
      .style("font-size","12px")
      .style("fill", "#64748b") 
      .style("font-weight", "bold");
      
    // 交互绑定
    d3.select(scatterState.canvas)
        .on("mousemove", (e) => handleMouseMove(e, container, nameMap, activeXKey, activeYKey))
        .on("mouseout", handleMouseOut)
        .on("click", (e) => handleClick(e)); // 可选：点击锁定
        
  } else {
    // Resize 更新
    d3.select(scatterState.canvas).attr("width", iW).attr("height", iH);
    scatterState.svg.attr("width", w).attr("height", h);
    scatterState.xAxisG.attr("transform", `translate(0,${iH})`);
    scatterState.xLabel.attr("x", iW/2).attr("y", iH+35);
  }

  // --- 2. 比例尺计算 ---
  let x, y;

  if (mode === 'matrix') {
    // 矩阵模式：固定比例尺
    // 频率：0 ~ 5 (或最大值)
    const maxFreq = d3.max(data, d => d.discount_frequency) || 5;
    x = d3.scaleLinear().domain([0, Math.max(5, maxFreq)]).range([0, iW]);
    // 折扣率：0 ~ 50% (0.5)
    y = d3.scaleLinear().domain([0, 0.5]).range([iH, 0]);
  } else {
    // 散点模式：动态比例尺
    const xExtent = d3.extent(data, d => d[activeXKey]);
    const xPad = (xExtent[1] - xExtent[0]) * 0.05 || 1; 
    x = d3.scaleLinear().domain([xExtent[0] - xPad, xExtent[1] + xPad]).range([0, iW]);

    const yExtent = d3.extent(data, d => d[activeYKey]);
    const yPad = (yExtent[1] - yExtent[0]) * 0.05 || 1;
    y = d3.scaleLinear().domain([yExtent[0] - yPad, yExtent[1] + yPad]).range([iH, 0]);
  }
  
  scatterState.xScale = x;
  scatterState.yScale = y;

  // --- 3. 颜色比例尺（与平行坐标图保持一致）---
  const cKeyElement = document.getElementById(colorSelectId);
  const cKey = cKeyElement ? cKeyElement.value : 'favorable_rate';
  const cExt = d3.extent(data, d => d[cKey]);
  let scaleDomain = [cExt[1], cExt[0]];
  if (cKey === 'favorable_rate') {
    scaleDomain = [cExt[0], cExt[1]];
  }
  if (!scaleDomain[0] || scaleDomain[0] === scaleDomain[1]) scaleDomain = [0, 1];
  const cScale = d3.scaleSequential()
    .domain(scaleDomain)
    .interpolator(t => d3.interpolateTurbo(0.95 - 0.85 * t));

  // --- 4. 坐标轴更新 (动画) ---
  const t = d3.transition().duration(800).ease(d3.easeCubicOut);
  const axisColor = "#e2e8f0";
  const tickColor = "#94a3b8";

  // X轴配置
  let xAxisCall = d3.axisBottom(x).ticks(8).tickPadding(10);
  if (mode === 'scatter' && activeXKey === 'year') xAxisCall.tickFormat(d3.format("d"));
  
  // Y轴配置
  let yAxisCall = d3.axisLeft(y).ticks(6).tickPadding(10);
  if (mode === 'matrix' || activeYKey === 'avg_discount_rate' || activeYKey === 'favorable_rate') {
      yAxisCall.tickFormat(d => (mode === 'matrix' ? d*100 : d) + "%");
  }

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

  // 轴标签更新
  if (mode === 'matrix') {
      scatterState.xLabel.text("年均打折频率 (次/年)");
  } else {
      scatterState.xLabel.text(nameMap[activeXKey]);
  }

  // --- 5. 矩阵背景装饰 (Fade In/Out) ---
  updateMatrixBackground(mode, iW, iH, x, y);

  // --- 6. 粒子系统更新 ---
  const particleMap = new Map();
  scatterState.particles.forEach(p => particleMap.set(p.data.name, p));
  
  // 检测轴是否发生了实质变化
  const isAxisChange = scatterState.lastXKey !== activeXKey || scatterState.lastYKey !== activeYKey;

  const nextParticles = data.map(d => {
    // 计算目标位置
    let targetX = x(d[activeXKey]);
    let targetY = y(d[activeYKey]);
    
    // 矩阵模式下，对于溢出的数据做一下 Clamp (例如折扣率极高或极低)
    if (mode === 'matrix') {
        if (d.avg_discount_rate > 0.5) targetY = y(0.5); 
        // 过滤掉未打折的游离点，或者让它们堆积在原点附近
        if (d.discount_frequency === 0) targetX = x(0);
    }

    const color = d3.color(cScale(d[cKey])).toString();
    
    let p = particleMap.get(d.name);
    
    if (p) {
        // [UPDATE] 更新现有粒子
        p.tx = targetX;
        p.ty = targetY;
        p.color = color;
        p.tColor = color;
        p.data = d; // 更新数据引用
        p.sx = p.x; // 起点设为当前位置
        p.sy = p.y;
        
        // 贝塞尔曲线控制点生成 (飞行动画)
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
        // [ENTER] 新粒子
        const startX = targetX + (Math.random() - 0.5) * 100; 
        const startY = targetY + (Math.random() - 0.5) * 100;
        
        p = {
            data: d,
            x: startX, y: startY, r: 0,
            sx: startX, sy: startY, sr: 0,
            tx: targetX, ty: targetY, tr: 5,
            cx: startX, cy: startY, 
            color: color, tColor: color,
            delay: Math.random() * 0.4, 
            isNew: true
        };
    }
    
    p.progress = 0;
    p.animDuration = 1000; // 统一动画时间
    return p;
  });
  
  scatterState.particles = nextParticles;
  scatterState.lastXKey = activeXKey;
  scatterState.lastYKey = activeYKey;

  // 启动渲染循环
  if (scatterState.timer) scatterState.timer.stop();
  scatterState.timer = d3.timer((elapsed) => renderLoop(elapsed));
}

function updateMatrixBackground(mode, w, h, x, y) {
    const bg = scatterState.matrixBgG;
    
    // 如果不是矩阵模式，直接淡出并清空
    if (mode !== 'matrix') {
        bg.transition().duration(500).style("opacity", 0)
          .on("end", () => bg.selectAll("*").remove());
        return;
    }

    // 如果是矩阵模式，绘制背景元素
    // 先清空旧的（或者你可以做更复杂的 diff，但直接重绘也够快）
    bg.selectAll("*").remove();
    bg.style("opacity", 1); // 确保可见

    const midFreq = 3.0;
    const midRate = 0.25;

    // 虚线
    bg.append("line")
        .attr("x1", x(midFreq)).attr("y1", 0)
        .attr("x2", x(midFreq)).attr("y2", h)
        .style("stroke", "#cbd5e1").style("stroke-dasharray", "4,4").style("stroke-width", 1.5);

    bg.append("line")
        .attr("x1", 0).attr("y1", y(midRate))
        .attr("x2", w).attr("y2", y(midRate))
        .style("stroke", "#cbd5e1").style("stroke-dasharray", "4,4").style("stroke-width", 1.5);

    // 象限文字
    const labelStyle = "font-size:16px; font-weight:bold; fill:#64748b; opacity:0.6; pointer-events:none;";
    
    // 右上：清仓甩卖
    bg.append("text").attr("x", w - 10).attr("y", 20).attr("text-anchor", "end").attr("style", labelStyle).text("💸 清仓甩卖型")
       .style("opacity", 0).transition().delay(300).style("opacity", 0.6);
    // 左上：高冷节日
    bg.append("text").attr("x", 10).attr("y", 20).attr("text-anchor", "start").attr("style", labelStyle).text("💎 高冷节日型")
       .style("opacity", 0).transition().delay(400).style("opacity", 0.6);
    // 左下：价值坚守
    bg.append("text").attr("x", 10).attr("y", h - 10).attr("text-anchor", "start").attr("style", labelStyle).text("🛡️ 价值坚守型")
       .style("opacity", 0).transition().delay(500).style("opacity", 0.6);
    // 右下：刷脸曝光
    bg.append("text").attr("x", w - 10).attr("y", h - 10).attr("text-anchor", "end").attr("style", labelStyle).text("📢 刷脸曝光型")
       .style("opacity", 0).transition().delay(600).style("opacity", 0.6);
       
    // Y轴标题（矩阵特有，旋转文字）
    bg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -h/2).attr("y", -35)
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#64748b")
        .style("font-weight", "bold")
        .text("平均折扣深度");
}

function renderLoop(elapsed) {
    const ctx = scatterState.ctx;
    const width = scatterState.width;
    const height = scatterState.height;
    
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'multiply';
    
    for (let i = 0; i < scatterState.particles.length; i++) {
        const p = scatterState.particles[i];
        
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
            
            const breath = Math.sin(Math.PI * ease);
            const targetR = p === scatterState.hovered ? 9 : 5;
            p.r = targetR - breath * 1.5; 
        }
        
        if (p.r > 0) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = 0.75; 
            ctx.fill();
        }
    }
}

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
        
        let tipContent = `<div class="tooltip-title" style="color:#333">${d.name}</div>`;
        
        if (scatterState.currentMode === 'matrix') {
            // --- Matrix 模式的 Tooltip ---
            tipContent += `
              <div class="tooltip-row"><span style="color:#666">📊 策略类型:</span> <b style="color:#000">${d.strategy_class}</b></div>
              <div class="tooltip-row"><span style="color:#666">📉 年均折扣:</span> <b style="color:#000">${d.discount_frequency.toFixed(1)} 次</b></div>
              <div class="tooltip-row"><span style="color:#666">💸 平均折扣:</span> <b style="color:#000">${(d.avg_discount_rate*100).toFixed(0)}% (off)</b></div>
            `;
            // 添加 Events Breakdown
            if (d.events_breakdown) {
                const events = Object.entries(d.events_breakdown)
                  .filter(([k, v]) => v > 0 && k !== "日常")
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3);
                if (events.length > 0) {
                  tipContent += `<div class="tooltip-row" style="margin-top:4px; color:#ff8800; font-size:11px;"><span>🔥 热门:</span> <b>${events.map(e => e[0].split(' ')[0]).join(', ')}</b></div>`;
                }
            }
        } else {
            // --- 普通 Scatter 模式的 Tooltip ---
            if (xKey !== 'log_players') tipContent += `<div class="tooltip-row"><span style="color:#666">${nameMap[xKey]}:</span> <b style="color:#000">${xKey === 'year' ? d[xKey] : Number(d[xKey]).toFixed(2)}</b></div>`;
            if (yKey !== 'log_players') tipContent += `<div class="tooltip-row"><span style="color:#666">${nameMap[yKey]}:</span> <b style="color:#000">${xKey === 'year' ? d[yKey] : Number(d[yKey]).toFixed(2)}</b></div>`;
            tipContent += `
                <div class="tooltip-row"><span style="color:#666">👥 最大在线:</span> <b style="color:#000">${d.max_players.toLocaleString()}</b></div>
                <div class="tooltip-row"><span style="color:#666">👍 好评率:</span> <b style="color:#000">${d.favorable_rate}%</b></div>
            `;
        }
        
        if (window.Utils && window.Utils.showTooltip) {
            window.Utils.showTooltip(event, tipContent);
        }
    } else {
        d3.select(scatterState.canvas).style("cursor", "default");
        if (window.Utils) d3.select("#parallel-chart-shared-tooltip").style("opacity", 0);
    }
}

function handleMouseOut() {
    scatterState.hovered = null;
    if (window.Utils) d3.select("#parallel-chart-shared-tooltip").style("opacity", 0);
}

function handleClick(event) {
    // 可以在这里扩展点击交互
}

const ScatterPlot = { draw: drawScatterChart };
window.ScatterPlot = ScatterPlot;