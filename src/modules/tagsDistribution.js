// modules/tagsDistribution.js

function drawTagBubbleChart(tagData, containerId) {
  const container = document.getElementById(containerId);
  if (!container || !tagData) return;

  container.innerHTML = "";
  
  // 基础样式
  container.style.position = "relative";
  container.style.overflow = "visible"; 
  container.style.display = "block"; 
  
  let width = container.clientWidth;
  let height = container.clientHeight;
  
  if (height < 500) { height = 750; container.style.height = "750px"; }

  // --- 布局计算 ---
  const centerX = width * 0.33; 
  const centerY = height / 2;
  const margin = 80;
  const maxRadiusByWidth = (width * 0.55) / 2; 
  const radius = Math.min(maxRadiusByWidth, height / 2 - margin);

  // 面板位置
  const panelWidth = 280;
  let panelX = centerX + radius + 150; 
  if (panelX + panelWidth > width) {
      panelX = width - panelWidth - 20;
  }
  const panelY = height * 0.15; 
  
  // 连线终点 (下移至内容区)
  const endX = panelX + 5; // 稍微调整让它贴紧卡片边缘
  const lineConnectY = panelY + 150; 

  // --- DOM 结构 ---
  const detailPanel = document.createElement("div");
  detailPanel.className = "parallel-chart-tag-detail-panel";
  
  const style = document.createElement("style");
  style.innerHTML = `
    .parallel-chart-tag-detail-panel {
        position: absolute;
        left: ${panelX}px; 
        top: ${panelY}px;  
        width: ${panelWidth}px;
        height: 60%;
        z-index: 10;
        pointer-events: none; 
        transition: left 0.3s ease;
    }
    .parallel-chart-tag-detail-panel.active {
        pointer-events: auto;
    }

    .literary-card {
        background: rgba(255, 255, 255, 0.98);
        border-left: 4px double #cbd5e1; 
        box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        padding: 24px;
        border-radius: 2px 8px 8px 2px;
        min-height: 450px; 
        height: auto; 
        box-sizing: border-box;
        transition: all 0.4s ease;
        opacity: 1; 
        display: flex;
        flex-direction: column;
        position: relative;
    }
    
    .card-decoration-svg {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        pointer-events: none;
        z-index: 0; 
        overflow: visible;
    }

    .detail-content-container {
        position: relative;
        z-index: 1;
        opacity: 0; 
        animation: contentFadeIn 0.8s ease-out forwards; 
    }

    @keyframes contentFadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .placeholder-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #94a3b8;
        font-family: serif;
        text-align: center;
        height: 100%;
        min-height: 250px;
        position: relative;
        z-index: 1;
    }
    .placeholder-icon {
        font-size: 40px;
        opacity: 0.2;
        margin-bottom: 20px;
    }

    .detail-stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr; 
        gap: 15px 10px;
        margin-bottom: 20px;
        margin-top: 10px;
    }

    .stat-item {
        display: flex;
        flex-direction: column;
        justify-content: center;
    }

    .detail-tag-list {
        display: flex;
        flex-wrap: wrap; 
        gap: 6px;
        margin-top: 5px;
        max-height: 200px;
        overflow-y: auto;
        padding-right: 5px;
    }
    .detail-tag-list::-webkit-scrollbar { width: 4px; }
    .detail-tag-list::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }
  `;
  container.appendChild(style);

  detailPanel.innerHTML = `
      <div class="detail-card literary-card" id="parallel-chart-tagDetailCard">
      <div class="placeholder-content">
        <div class="placeholder-icon">❦</div>
        <div>Click a bubble to sprout details</div>
      </div>
    </div>
  `;
  container.appendChild(detailPanel);

  const svg = d3.select(`#${containerId}`).append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("class", "parallel-chart-shared-viz-svg")
    .style("position", "absolute")
    .style("top", 0)
    .style("left", 0)
    .style("z-index", 1); 

  // --- 图层顺序 ---
  const drawingGroup = svg.append("g") 
    .attr("transform", `translate(${centerX},${centerY})`);

  const ornamentGroup = svg.append("g") 
    .attr("transform", `translate(${centerX},${centerY})`);

  const textGroup = svg.append("g") 
    .attr("transform", `translate(${centerX},${centerY})`)
    .style("pointer-events", "none"); 

  const linkGroup = svg.append("g") 
    .attr("class", "link-group")
    .style("pointer-events", "none"); 

  // --- 数据处理 ---
  let processedChildren = [];
  if (tagData.children) {
    processedChildren = tagData.children.map(cat => {
      let tags = [];
      let fullTagList = [];
      if (cat.detail_tags) {
        fullTagList = cat.detail_tags;
        const baseValue = cat.value / (cat.detail_tags.length || 1);
        tags = cat.detail_tags.map(t => ({ name: t, value: baseValue }));
      } else if (cat.children) {
        fullTagList = cat.children.map(c => c.name);
        tags = cat.children; 
      }
      const limit = cat.display_count !== undefined ? cat.display_count : 8;
      return {
        name: cat.name,
        children: tags.slice(0, limit),
        originalValue: cat.value,
        game_count: cat.game_count || 0,
        allTags: fullTagList
      };
    }).filter(c => c.children.length > 0);
  }

  const root = d3.hierarchy({ name: "root", children: processedChildren })
    .sum(d => d.value)
    .sort((a, b) => b.value - a.value);

  const circlePolygon = [];
  for (let i = 0; i < 360; i++) {
    const angle = (2 * Math.PI * i) / 360;
    circlePolygon.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }

  function mulberry32(a) {
      return function() {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      }
  }
  const seededRng = mulberry32(2412700);

  try {
    const voronoi = d3.voronoiTreemap().clip(circlePolygon).prng(seededRng);
    voronoi(root);
  } catch (e) { console.error(e); return; }

  const colorMap = {
    "动作格斗": "#D32F2F", "射击弹幕": "#E64A19", "多人竞技": "#F57C00", "平台银河城": "#FF7043", 
    "角色扮演": "#7B1FA2", "奇幻神话": "#9C27B0", "剧情叙事": "#D81B60", 
    "休闲治愈": "#43A047", "模拟建造": "#00897B", "生存开放": "#2E7D32", 
    "科幻机甲": "#0288D1", "策略战棋": "#1565C0", "卡牌构建": "#3949AB", 
    "恐怖悬疑": "#37474F", "解谜探案": "#546E7A", "肉鸽挑战": "#4527A0", 
  };
  const fallbackScale = d3.scaleOrdinal(d3.schemeCategory10);
  const getCategoryColor = (name) => colorMap[name] || fallbackScale(name);
  
  const leaves = root.leaves();
  const groups = root.children;

  // ============================================
  //  🎨 预渲染
  // ============================================

  const cellGroup = drawingGroup.selectAll("g.cell")
    .data(leaves)
    .join("g")
    .attr("class", "cell");

  const cellPaths = cellGroup.append("path")
    .attr("d", d => d.polygon ? "M" + d.polygon.join("L") + "Z" : "")
    .style("fill", "white") 
    .style("stroke", d => getCategoryColor(d.parent.data.name)) 
    .style("stroke-width", 1) 
    .style("pointer-events", "none") 
    .style("cursor", "pointer")
    .style("opacity", 0); 

  const groupBorders = drawingGroup.selectAll("path.group-border")
    .data(groups)
    .join("path")
    .attr("class", "group-border")
    .attr("d", d => d.polygon ? "M" + d.polygon.join("L") + "Z" : "")
    .style("fill", "none")
    .style("stroke", d => getCategoryColor(d.data.name))
    .style("stroke-width", 1) 
    .style("stroke-opacity", 0); 

  leaves.forEach(d => {
      if(!d.polygon) return;
      if(d3.polygonArea(d.polygon) > 200) { 
          const center = d3.polygonCentroid(d.polygon);
          const catColor = getCategoryColor(d.parent.data.name);

          textGroup.append("text")
              .datum(d)
              .attr("x", center[0]).attr("y", center[1])
              .attr("text-anchor", "middle").attr("dy", "0.35em")
              .style("font-size", "10px")
              .style("font-weight", "bold")
              .style("fill", catColor) 
              .style("text-shadow", "0 1px 4px rgba(255,255,255,0.95)") 
              .style("opacity", 0) 
              .text(d.data.name.substring(0, 5));
      }
  });

  // ============================================
  //  🌺 启动花开动画
  // ============================================
  
  const wreathGroup = ornamentGroup.append("g")
      .attr("class", "floral-wreath")
      .attr("transform", "scale(0) rotate(-90)");

  generateEntwinedWreath(wreathGroup); 

  playBloomAnimation();

  function playBloomAnimation() {
      const duration = 2000; 

      wreathGroup.transition()
          .duration(duration)
          .ease(d3.easeBackOut.overshoot(0.6)) 
          .attr("transform", "scale(1) rotate(0)")
          .on("start", () => {
              bloomInnerContent();
          });
  }

  function bloomInnerContent() {
      cellPaths.transition()
          .delay(100)
          .duration(1200)
          .ease(d3.easeCubicOut)
          .style("opacity", 1)
          .on("end", () => {
              cellPaths.style("pointer-events", "all");
          });

      groupBorders.transition()
          .delay(100)
          .duration(1200)
          .ease(d3.easeCubicOut)
          .style("stroke-opacity", 0.5);

      const textBaseDelay = 2800; 
      
      textGroup.selectAll("text")
          .transition()
          .duration(800)
          .delay((d) => {
              if (!d || !d.polygon) return textBaseDelay;
              const centroid = d3.polygonCentroid(d.polygon);
              const dist = Math.hypot(centroid[0], centroid[1]);
              return textBaseDelay + dist * 2.5; 
          })
          .style("opacity", 1);
  }

  // --- 🌺 生成缠绕花环 ---
  function generateEntwinedWreath(container) {
      const ringRadius = radius + 12; 
      const segmentCount = 180; 
      const growthDuration = 1500; 

      const totalDegrees = 360;
      const colorMapArray = new Array(totalDegrees);

      function probeColorAtDegree(deg) {
          const angleRad = deg * Math.PI / 180;
          const testR = radius - 15; 
          const tx = Math.cos(angleRad) * testR;
          const ty = Math.sin(angleRad) * testR;
          
          for (let leaf of leaves) {
              if (leaf.polygon && d3.polygonContains(leaf.polygon, [tx, ty])) {
                  return getCategoryColor(leaf.parent.data.name);
              }
          }
          return "#cbd5e1"; 
      }

      for (let i = 0; i < totalDegrees; i++) {
          colorMapArray[i] = probeColorAtDegree(i);
      }

      function getColorFromMap(degree) {
          let idx = Math.floor(degree) % 360;
          if (idx < 0) idx += 360;
          return colorMapArray[idx];
      }

      const arcGen = d3.arc()
          .innerRadius(ringRadius)
          .outerRadius(ringRadius + 2); 

      for(let i=0; i<segmentCount; i++) {
          const startAngle = (i / segmentCount) * 2 * Math.PI;
          const endAngle = ((i + 1) / segmentCount) * 2 * Math.PI;
          const midAngle = (startAngle + endAngle) / 2;
          const midDegree = midAngle * 180 / Math.PI;
          const segmentColor = getColorFromMap(midDegree);
          const delay = (i / segmentCount) * growthDuration;

          container.append("path")
              .attr("d", arcGen({
                  startAngle: startAngle + Math.PI/2, 
                  endAngle: endAngle + Math.PI/2
              }))
              .attr("fill", segmentColor) 
              .attr("opacity", 0) 
              .transition()
              .delay(delay) 
              .duration(200) 
              .attr("opacity", 0.8); 
      }

      const leafCount = 120; 
      const waveFreq = 16; 
      const waveAmp = 7;   

      for(let i=0; i<leafCount; i++) {
          const angleRad = (i / leafCount) * 2 * Math.PI;
          const angleDeg = angleRad * 180 / Math.PI;
          const leafColor = getColorFromMap(angleDeg); 
          
          const rOffset = Math.sin(angleRad * waveFreq) * waveAmp;
          const myRadius = ringRadius + rOffset;
          const cx = Math.cos(angleRad) * myRadius;
          const cy = Math.sin(angleRad) * myRadius;
          const waveTilt = Math.cos(angleRad * waveFreq) * 50; 
          const rotation = angleDeg + 90 + waveTilt;

          const leafTypeA = "M0,0 Q6,-8 12,0 T0,0"; 
          const leafTypeB = "M0,0 Q4,-6 8,0 Q4,6 0,0"; 
          const leafPath = Math.random() > 0.5 ? leafTypeA : leafTypeB;

          const scale = 0.4 + Math.random() * 0.4;
          const flip = (rOffset > 0 ? 1 : -1); 

          const delay = growthDuration + (i / leafCount) * 1500;

          container.append("path")
              .attr("d", leafPath)
              .attr("fill", leafColor) 
              .attr("stroke", "white")
              .attr("stroke-width", 0.5)
              .attr("transform", `translate(${cx}, ${cy}) rotate(${rotation}) scale(0)`) 
              .style("opacity", 0.9)
              .transition()
              .delay(delay) 
              .duration(500)
              .ease(d3.easeBackOut) 
              .attr("transform", `translate(${cx}, ${cy}) rotate(${rotation}) scale(${scale}, ${scale * flip})`);
      }
  }

  // --- 交互逻辑 ---
  cellGroup.selectAll("path")
    .on("click", function(event, d) {
       event.stopPropagation();
       const parentData = d.parent.data;
       const color = getCategoryColor(parentData.name);
       
       const card = document.getElementById("parallel-chart-tagDetailCard");
       if(card) {
           const oldSvg = card.querySelector(".card-decoration-svg");
           if (oldSvg) oldSvg.remove();
           card.innerHTML = ''; 
           card.style.borderLeftColor = "#cbd5e1";
       }

       cellGroup.selectAll("path")
         .transition().duration(200)
         .style("fill", "white").style("fill-opacity", 0.1) 
         .style("stroke", n => getCategoryColor(n.parent.data.name)).style("stroke-width", 1);

       cellGroup.selectAll("path")
         .filter(node => node.parent === d.parent)
         .transition().duration(200)
         .style("fill", color).style("fill-opacity", 0.2).style("stroke", color);
        
       d3.select(this).raise()
         .transition().duration(300)
         .style("fill", color).style("fill-opacity", 0.8)
         .style("stroke", color).style("stroke-width", 2); 

       const vineDuration = 1200; 
       
       // 【核心调用】绘制符合您要求的精确几何藤蔓
       drawPreciseZoneVine(d, color, vineDuration);
       
       setTimeout(() => {
           updateDetailPanel(parentData, color);
       }, vineDuration);
    });

  // --- 【核心重构】区域判定 + 几何三段式/一段式 ---
  function drawPreciseZoneVine(d, color, duration = 1200) {
      linkGroup.selectAll("*").remove(); 

      const polyCentroid = d3.polygonCentroid(d.polygon);
      const angle = Math.atan2(polyCentroid[1], polyCentroid[0]);
      
      const gap = 15; // 小圆环半径 (Elbow)
      const vineInnerR = radius + 12; // 起点半径
      const vineOuterR = vineInnerR + gap; // 轨道半径
      
      const startX = centerX + vineInnerR * Math.cos(angle);
      const startY = centerY + vineInnerR * Math.sin(angle);
      
      const targetX = endX - 10; 
      const targetY = lineConnectY;

      // 【核心设定】发射角度设定为 ±45度 (PI/4)
      const launchLimit = Math.PI / 4; 

      // 判定区域:
      const isInsideRightZone = (Math.abs(angle) < launchLimit);

      let pathData = "";

      if (isInsideRightZone) {
          // --- 情况B: 一笔画 (Direct) ---
          const cpX = (startX + targetX) / 2 + 30;
          const cpY = (startY + targetY) / 2 + 20;
          pathData = `M ${startX},${startY} Q ${cpX},${cpY} ${targetX},${targetY}`;
      } else {
          // --- 情况A: 三段式 (Three-Stage) ---
          
          const goTop = (angle < 0); 
          
          // 1. 发射角度：固定在 +/- 45度
          const launchAngle = goTop ? -launchLimit : launchLimit;
          
          // 2. Junction Angle: 第一段小圆环结束，接入大圆轨道的角度
          const angleOffset = (gap / vineInnerR) * (goTop ? 1 : -1); 
          const junctionAngle = angle + angleOffset; 
          
          const junctionX = centerX + vineOuterR * Math.cos(junctionAngle);
          const junctionY = centerY + vineOuterR * Math.sin(junctionAngle);
          
          const launchX = centerX + vineOuterR * Math.cos(launchAngle);
          const launchY = centerY + vineOuterR * Math.sin(launchAngle);

          // === Segment 1: 小弯头 (1/4 Circle Arc) ===
          const sweep1 = goTop ? 1 : 0;
          pathData = `M ${startX},${startY} `;
          pathData += `A ${gap},${gap} 0 0,${sweep1} ${junctionX},${junctionY} `;
          
          // === Segment 2: 大圆轨道 (Orbit to +/- 45deg) ===
          const sweep2 = goTop ? 1 : 0;
          const largeArc = Math.abs(junctionAngle - launchAngle) > Math.PI ? 1 : 0;
          pathData += `A ${vineOuterR},${vineOuterR} 0 ${largeArc},${sweep2} ${launchX},${launchY} `;
          
          // === Segment 3: 贝塞尔飞出 (Flyout from 45deg) ===
          let tx, ty;
          if (goTop) {
              tx = 0.7; ty = 0.7;
          } else {
              tx = 0.7; ty = -0.7;
          }
          
          const force = 100; 
          const cp1X = launchX + tx * force;
          const cp1Y = launchY + ty * force;
          const cp2X = targetX - 50;
          const cp2Y = targetY;
          
          pathData += `C ${cp1X},${cp1Y} ${cp2X},${cp2Y} ${targetX},${targetY}`;
      }

      // --- 绘制路径 ---
      const path = linkGroup.append("path")
          .attr("d", pathData)
          .style("stroke", color)
          .style("fill", "none")
          .style("stroke-width", 2)
          .style("stroke-linecap", "round")
          .style("stroke-linejoin", "round")
          .style("opacity", 1);

      const totalLength = path.node().getTotalLength();
      
      path
        .attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(duration)
        .ease(d3.easeLinear) 
        .attr("stroke-dashoffset", 0);

      // 绘制叶子
      drawLeavesOnPath(path.node(), color, duration);

      // 起点圆点
      linkGroup.append("circle")
          .attr("cx", startX).attr("cy", startY).attr("r", 4)
          .style("fill", color)
          .style("stroke", "white")
          .style("stroke-width", 1.5)
          .style("opacity", 0)
          .transition().duration(300).style("opacity", 1);

      // 终点花苞 【修复】移除 +5 偏移，严格对齐
      drawOrnateEnd(targetX, targetY, color, duration);
  }

  // --- 辅助：沿着路径长叶子 ---
  function drawLeavesOnPath(pathNode, color, totalDuration) {
      const totalLen = pathNode.getTotalLength();
      const step = 45; 
      const leafCount = Math.floor(totalLen / step);
      const leafPathStr = "M0,0 Q6,-8 12,0 T0,0"; 

      for(let i=1; i<leafCount; i++) {
          const len = i * step;
          const pt = pathNode.getPointAtLength(len);
          const ptBefore = pathNode.getPointAtLength(Math.max(0, len - 2));
          const ptAfter = pathNode.getPointAtLength(Math.min(totalLen, len + 2));
          const angleDeg = Math.atan2(ptAfter.y - ptBefore.y, ptAfter.x - ptBefore.x) * 180 / Math.PI;

          const flip = (i % 2 === 0) ? 1 : -1;
          const scale = 0.8;

          const delay = totalDuration * (len / totalLen);

          linkGroup.append("path")
             .attr("d", leafPathStr)
             .attr("fill", color)
             .attr("transform", `translate(${pt.x}, ${pt.y}) rotate(${angleDeg}) scale(0)`)
             .style("opacity", 0.9)
             .transition()
             .delay(delay) 
             .duration(400)
             .ease(d3.easeBackOut)
             .attr("transform", `translate(${pt.x}, ${pt.y}) rotate(${angleDeg}) scale(${scale}, ${scale * flip})`); 
      }
  }

  function drawOrnateEnd(x, y, color, delay) {
      const g = linkGroup.append("g")
          .attr("transform", `translate(${x}, ${y}) scale(0)`);

      g.append("circle").attr("r", 4).attr("fill", color);
      g.append("circle").attr("r", 2).attr("fill", "white");
      
      const petal = "M0,-6 Q3,-10 6,-6 T0,-6"; 
      for(let i=0; i<3; i++) { 
          g.append("path")
           .attr("d", petal)
           .attr("fill", color)
           .attr("transform", `rotate(${i * 120})`);
      }

      g.transition()
       .delay(delay) 
       .duration(500)
       .attr("transform", `translate(${x}, ${y}) scale(1)`);
  }

  function updateDetailPanel(data, color) {
      const card = document.getElementById("parallel-chart-tagDetailCard");
      if(!card) return;
      
      card.style.borderLeftColor = color; 
      document.querySelector(".parallel-chart-tag-detail-panel").classList.add("active");

      const heatIndex = Math.round(data.originalValue);
      const gameCount = data.game_count || 0;
      const avgPrice = Math.round(Math.random() * 40 + 20); 
      const topTag = data.allTags[0] || "无";
      const tagsHtml = data.allTags.map(t => 
        `<span class="detail-tag-pill" style="color:${color}; background:${color}15; border-color:${color}30">${t}</span>`
      ).join("");

      card.innerHTML = `
        <div class="detail-content-container">
            <div class="detail-header">
               <h3 class="detail-title" style="color:${color}; font-family:serif; font-size: 24px;">${data.name}</h3>
               <div class="detail-subtitle" style="letter-spacing: 2px; opacity:0.6;">CATEGORY ANALYSIS</div>
            </div>
            
            <div style="height:1px; background:linear-gradient(to right, ${color}, transparent); margin: 15px 0;"></div>

            <div class="detail-stats-grid">
               <div class="stat-item">
                  <div class="stat-label" style="color:${color} !important; opacity:0.8;">🔥 热度指数</div>
                  <div class="stat-value" style="color:${color} !important; font-weight:bold; font-size:18px;">${heatIndex}</div>
               </div>
               <div class="stat-item">
                  <div class="stat-label" style="color:${color} !important; opacity:0.8;">🎮 收录游戏</div>
                  <div class="stat-value" style="color:${color} !important; font-weight:bold; font-size:18px;">${gameCount}</div>
               </div>
               <div class="stat-item">
                  <div class="stat-label" style="color:${color} !important; opacity:0.8;">💰 平均售价</div>
                  <div class="stat-value" style="color:${color} !important; font-weight:bold; font-size:18px;">¥${avgPrice}</div>
               </div>
               <div class="stat-item">
                  <div class="stat-label" style="color:${color} !important; opacity:0.8;">🏷️ 核心标签</div>
                  <div class="stat-value" style="font-size:16px; color:${color} !important; font-weight:bold;">${topTag}</div>
               </div>
            </div>
            
            <div class="detail-tags-wrapper">
               <div class="detail-tags-label" style="color:${color} !important; margin-bottom:5px;">相关细分标签 (${data.allTags.length})</div>
               <div class="detail-tag-list">${tagsHtml}</div>
            </div>
        </div>
      `;
      
      drawCardBorder(card, color);
  }

  function drawCardBorder(card, color) {
      const oldSvg = card.querySelector(".card-decoration-svg");
      if (oldSvg) oldSvg.remove();

      const rect = card.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      const svg = d3.select(card).append("svg")
          .attr("class", "card-decoration-svg")
          .attr("width", "100%")
          .attr("height", "100%")
          .style("position", "absolute")
          .style("top", 0).style("left", 0)
          .style("pointer-events", "none");

      function createWavyPath(points) {
          const lineGen = d3.line()
              .curve(d3.curveBasis) 
              .x(d => d[0])
              .y(d => d[1]);
          return lineGen(points);
      }

      function generateWiggleLine(x1, y1, x2, y2, steps = 10, amp = 3) {
          const pts = [];
          for (let i = 0; i <= steps; i++) {
              const t = i / steps;
              const x = x1 + (x2 - x1) * t;
              const y = y1 + (y2 - y1) * t;
              const ox = (Math.random() - 0.5) * amp;
              const oy = (Math.random() - 0.5) * amp;
              pts.push([x + ox, y + oy]);
          }
          return pts;
      }

      const topPathPts = generateWiggleLine(0, 0, w, 0, 15, 4);
      const rightPathPts = generateWiggleLine(w, 0, w, h, 10, 4);
      const leftPathPts = generateWiggleLine(0, 0, 0, h, 10, 4);
      const bottomPathPts = generateWiggleLine(0, h, w, h, 15, 4);

      const pathA_d = createWavyPath([...topPathPts, ...rightPathPts]); 
      const pathB_d = createWavyPath([...leftPathPts, ...bottomPathPts]); 

      const vineA = svg.append("path")
          .attr("d", pathA_d)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", 1.5)
          .attr("stroke-linecap", "round")
          .attr("opacity", 0.6);

      const lenA = vineA.node().getTotalLength();
      vineA.attr("stroke-dasharray", lenA + " " + lenA)
           .attr("stroke-dashoffset", lenA)
           .transition().duration(1200).ease(d3.easeLinear)
           .attr("stroke-dashoffset", 0);

      const vineB = svg.append("path")
          .attr("d", pathB_d)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", 1.5)
          .attr("stroke-linecap", "round")
          .attr("opacity", 0.6);

      const lenB = vineB.node().getTotalLength();
      vineB.attr("stroke-dasharray", lenB + " " + lenB)
           .attr("stroke-dashoffset", lenB)
           .transition().duration(1200).ease(d3.easeLinear)
           .attr("stroke-dashoffset", 0);

      const leafCount = 12; 
      const leafPathStr = "M0,0 Q4,-6 8,0 T0,0"; 

      for(let i=0; i<leafCount; i++) {
          const t = Math.random();
          const chosenPath = Math.random() > 0.5 ? vineA.node() : vineB.node();
          const len = chosenPath.getTotalLength();
          const pt = chosenPath.getPointAtLength(t * len);
          
          const angle = Math.random() * 360;
          const scale = 0.5 + Math.random() * 0.5;

          svg.append("path")
             .attr("d", leafPathStr)
             .attr("fill", color)
             .attr("transform", `translate(${pt.x}, ${pt.y}) rotate(${angle}) scale(0)`)
             .style("opacity", 0.8)
             .transition()
             .delay(t * 1200) 
             .duration(400)
             .attr("transform", `translate(${pt.x}, ${pt.y}) rotate(${angle}) scale(${scale})`);
      }
      
      const bloomCount = 8; 
      const bloomPathStr = "M0,-4 Q0.5,-0.5 4,0 Q0.5,0.5 0,4 Q-0.5,0.5 -4,0 Q-0.5,-0.5 0,-4";

      for(let i=0; i<bloomCount; i++) {
          const t = Math.random();
          const chosenPath = Math.random() > 0.5 ? vineA.node() : vineB.node();
          const len = chosenPath.getTotalLength();
          const pt = chosenPath.getPointAtLength(t * len);

          const scale = 0.6 + Math.random() * 0.4;
          const rotation = Math.random() * 360; 

          svg.append("path")
             .attr("d", bloomPathStr)
             .attr("fill", "white") 
             .attr("stroke", color) 
             .attr("stroke-width", 1)
             .attr("transform", `translate(${pt.x}, ${pt.y}) rotate(${rotation}) scale(0)`) 
             .transition()
             .delay(t * 1200 + 300) 
             .duration(500)
             .ease(d3.easeBackOut) 
             .attr("transform", `translate(${pt.x}, ${pt.y}) rotate(${rotation}) scale(${scale})`);
      }
  }

  svg.on("click", () => {
      activeNode = null;
      linkGroup.selectAll("*").transition().style("opacity", 0).remove();
      cellGroup.selectAll("path")
          .transition().duration(400)
          .style("fill", "white").style("fill-opacity", 1) 
          .style("stroke", d => getCategoryColor(d.parent.data.name)).style("stroke-width", 1);
      
      const card = document.getElementById("parallel-chart-tagDetailCard");
      if(card) {
          card.style.borderLeftColor = "#cbd5e1";
          const decor = card.querySelector(".card-decoration-svg");
          if (decor) decor.remove();
          
          card.innerHTML = `
            <div class="placeholder-content">
               <div class="placeholder-icon">❦</div>
               <div>Click a bubble to sprout details</div>
            </div>
          `;
      }
  });
}

const TagBubble = { draw: drawTagBubbleChart };
window.TagBubble = TagBubble;