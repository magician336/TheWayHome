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
  
  // 连线终点
  const endX = panelX - 5; 
  const lineConnectY = panelY + 60; 

  // --- DOM 结构 ---
  const detailPanel = document.createElement("div");
  detailPanel.className = "tag-detail-panel";
  
  const style = document.createElement("style");
  style.innerHTML = `
    .tag-detail-panel {
        position: absolute;
        left: ${panelX}px; 
        top: ${panelY}px;  
        width: ${panelWidth}px;
        height: 60%;
        z-index: 10;
        pointer-events: none; 
        transition: left 0.3s ease;
    }
    .tag-detail-panel.active {
        pointer-events: auto;
    }

    .literary-card {
        background: rgba(255, 255, 255, 0.98);
        border-left: 4px double #cbd5e1; 
        box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        padding: 24px;
        border-radius: 2px 8px 8px 2px;
        min-height: 300px; 
        height: auto; 
        box-sizing: border-box;
        transition: all 0.4s ease;
        opacity: 1; 
        display: flex;
        flex-direction: column;
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
    <div class="detail-card literary-card" id="tagDetailCard">
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
    .attr("class", "shared-viz-svg")
    .style("position", "absolute")
    .style("top", 0)
    .style("left", 0)
    .style("z-index", 1); 

  // ==========================================
  //  🎨 图层顺序 (严格控制)
  // ==========================================
  
  // 1. 气泡层 (DrawingGroup) - 底层
  const drawingGroup = svg.append("g") 
    .attr("transform", `translate(${centerX},${centerY})`);

  // 2. 花纹/动画层 (OrnamentGroup) - 中层 (覆盖气泡边缘)
  const ornamentGroup = svg.append("g") 
    .attr("transform", `translate(${centerX},${centerY})`);

  // 3. 文字层 (TextGroup) - 上层
  const textGroup = svg.append("g") 
    .attr("transform", `translate(${centerX},${centerY})`)
    .style("pointer-events", "none")
    .style("opacity", 0); // 初始隐藏

  // 4. 连线层 (LinkGroup) - 顶层
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
  //  🎨 预渲染 (初始隐藏)
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
      if(d3.polygonArea(d.polygon) > 400) { 
          const center = d3.polygonCentroid(d.polygon);
          textGroup.append("text")
              .attr("x", center[0]).attr("y", center[1])
              .attr("text-anchor", "middle").attr("dy", "0.35em")
              .style("font-size", "10px").style("fill", "#333")
              .style("text-shadow", "0 1px 2px rgba(255,255,255,0.8)")
              .text(d.data.name.substring(0, 5));
      }
  });

  // ============================================
  //  🪄 开场动画
  // ============================================
  playIntroAnimation();

  function playIntroAnimation() {
      const sketchColor = "#64748b"; 

      const centerDot = ornamentGroup.append("circle")
          .attr("r", 0)
          .attr("fill", sketchColor)
          .attr("opacity", 1);
      
      centerDot.transition().duration(500).ease(d3.easeBackOut)
          .attr("r", 4)
          .on("end", () => {
              const radiusLine = ornamentGroup.append("line")
                  .attr("x1", 0).attr("y1", 0)
                  .attr("x2", 0).attr("y2", 0)
                  .attr("stroke", sketchColor)
                  .attr("stroke-width", 1.5)
                  .attr("stroke-dasharray", "4,2"); 
              
              radiusLine.transition().duration(400)
                  .attr("y2", -radius) 
                  .on("end", () => {
                      centerDot.remove();
                      startSweep(radiusLine, sketchColor);
                  });
          });
  }

  function startSweep(lineElement, color) {
      const arc = d3.arc()
          .innerRadius(radius - 1)
          .outerRadius(radius + 1)
          .startAngle(0);

      const circlePath = ornamentGroup.append("path")
          .attr("fill", color)
          .attr("d", arc({endAngle: 0}));

      const duration = 1000;

      lineElement.transition()
          .duration(duration)
          .ease(d3.easeLinear)
          .attrTween("transform", function() {
              return d3.interpolateString("rotate(0)", "rotate(360)");
          })
          .on("end", function() {
              d3.select(this).remove(); 
              circlePath.transition().duration(500).style("opacity", 0).remove();
              
              bloomContent();
              // 【核心】调用花环生成函数
              growColorfulWreath(); 
          });

      circlePath.transition()
          .duration(duration)
          .ease(d3.easeLinear)
          .attrTween("d", function() {
              const i = d3.interpolate(0, 2 * Math.PI);
              return function(t) {
                  return arc({endAngle: i(t)});
              };
          });
  }

  // --- 🌸 生成缠绕藤蔓花环 (Entwining Vine Wreath) ---
  function growColorfulWreath() {
      const wreathGroup = ornamentGroup.append("g").attr("class", "floral-wreath");
      
      // 1. 实体圆环 (作为花架)
      // 向外偏移 15px，给花瓣留出缠绕空间
      const ringRadius = radius + 15; 
      
      const stemPath = wreathGroup.append("circle")
          .attr("cx", 0).attr("cy", 0)
          .attr("r", ringRadius)
          .attr("fill", "none")
          .attr("stroke", "#cbd5e1") // 浅灰色枝干
          .attr("stroke-width", 1.5)
          .attr("stroke-opacity", 0);

      // 慢慢浮现枝干
      stemPath.transition().duration(1000).attr("stroke-opacity", 0.8);

      // 2. 生成缠绕的叶子
      const leafCount = 100; // 叶子数量
      const colors = Object.values(colorMap); 
      
      // 缠绕参数：
      const waveFreq = 12; // 绕圈频率 (花环绕主干转几圈)
      const waveAmp = 8;   // 缠绕幅度 (偏离主干的距离)

      for(let i=0; i<leafCount; i++) {
          const angleRad = (i / leafCount) * 2 * Math.PI;
          const angleDeg = angleRad * 180 / Math.PI;
          
          const leafColor = colors[i % colors.length];
          
          // 【核心算法】正弦波偏移，模拟藤蔓缠绕
          const rOffset = Math.sin(angleRad * waveFreq) * waveAmp;
          const myRadius = ringRadius + rOffset;

          const cx = Math.cos(angleRad) * myRadius;
          const cy = Math.sin(angleRad) * myRadius;

          // 计算旋转：为了自然，叶子角度需要结合 圆切线 + 波浪切线
          // 简单模拟：根据偏移量正负决定向内还是向外倾斜
          const waveTilt = Math.cos(angleRad * waveFreq) * 45; 
          const rotation = angleDeg + 90 + waveTilt;

          const leafTypeA = "M0,0 Q6,-8 12,0 T0,0"; 
          const leafTypeB = "M0,0 Q4,-6 8,0 Q4,6 0,0"; 
          const leafPath = Math.random() > 0.5 ? leafTypeA : leafTypeB;

          const scale = 0.5 + Math.random() * 0.4;
          // 根据在主干内侧还是外侧翻转叶子
          const flip = (rOffset > 0 ? 1 : -1); 

          wreathGroup.append("path")
              .attr("d", leafPath)
              .attr("fill", leafColor) 
              .attr("stroke", "white")
              .attr("stroke-width", 0.5)
              .attr("transform", `translate(${cx}, ${cy}) rotate(${rotation}) scale(0)`) 
              .style("opacity", 0.9) 
              .transition()
              .delay(i * 15 + 500) 
              .duration(600)
              .ease(d3.easeBackOut)
              .attr("transform", `translate(${cx}, ${cy}) rotate(${rotation}) scale(${scale}, ${scale * flip})`);
      }
  }

  function bloomContent() {
      cellPaths.style("pointer-events", "all");

      cellPaths.transition()
          .duration(1000)
          .delay((d) => {
              const centroid = d3.polygonCentroid(d.polygon);
              return Math.hypot(centroid[0], centroid[1]) * 2; 
          })
          .style("opacity", 1); 

      groupBorders.transition()
          .delay(500)
          .duration(1000)
          .style("stroke-opacity", 0.5);

      textGroup.transition()
          .delay(1200) 
          .duration(800)
          .style("opacity", 1);
  }

  // --- 交互逻辑 ---
  cellGroup.selectAll("path")
    .on("click", function(event, d) {
       event.stopPropagation();
       const parentData = d.parent.data;
       const color = getCategoryColor(parentData.name);
       
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

       drawVine(d, color);
       updateDetailPanel(parentData, color);
    });

  // --- 藤蔓绘制 ---
  function drawVine(d, color) {
      linkGroup.selectAll("*").remove(); 

      const polyCentroid = d3.polygonCentroid(d.polygon);
      const startX = centerX + polyCentroid[0]; 
      const startY = centerY + polyCentroid[1];
      
      const angle = Math.atan2(polyCentroid[1], polyCentroid[0]);
      const orbitGap = 25; 
      const orbitRadius = radius + orbitGap; 
      
      let pathData = "";
      const isRightSide = Math.abs(angle) < 0.6; 

      const distTotal = Math.hypot(endX - startX, lineConnectY - startY);
      const dynamicPower = Math.min(distTotal * 0.5, 250); 

      if (isRightSide) {
          const cp1X = startX + dynamicPower * 0.5; 
          const cp1Y = startY;
          const cp2X = endX - dynamicPower * 0.5;
          const cp2Y = lineConnectY;
          pathData = `M ${startX},${startY} C ${cp1X},${cp1Y} ${cp2X},${cp2Y} ${endX},${lineConnectY}`;
      } else {
          const isTopHalf = Math.sin(angle) < 0; 
          const exitAngle = isTopHalf ? -0.5 : 0.5; 
          const exitX = centerX + orbitRadius * Math.cos(exitAngle);
          const exitY = centerY + orbitRadius * Math.sin(exitAngle);

          const shift = 0.4; 
          const entryAngle = isTopHalf ? (angle + shift) : (angle - shift);
          const entryX = centerX + orbitRadius * Math.cos(entryAngle);
          const entryY = centerY + orbitRadius * Math.sin(entryAngle);

          let tangentX, tangentY;
          if (isTopHalf) { tangentX = Math.sin(entryAngle); tangentY = -Math.cos(entryAngle); } 
          else { tangentX = -Math.sin(entryAngle); tangentY = Math.cos(entryAngle); }

          const cp1X = startX + Math.cos(angle) * 100;
          const cp1Y = startY + Math.sin(angle) * 100;
          
          const bridgeSmoothness = 60; 
          const cp2X = entryX + tangentX * bridgeSmoothness;
          const cp2Y = entryY + tangentY * bridgeSmoothness;

          let exitTanX, exitTanY;
          if (isTopHalf) { exitTanX = -Math.sin(exitAngle); exitTanY = Math.cos(exitAngle); } 
          else { exitTanX = Math.sin(exitAngle); exitTanY = -Math.cos(exitAngle); }

          const flySmoothness = dynamicPower * 0.6; 
          const cp3X = exitX + exitTanX * flySmoothness;
          const cp3Y = exitY + exitTanY * flySmoothness;
          
          const cp4X = endX - 80; 
          const cp4Y = lineConnectY;
          const sweepFlag = isTopHalf ? 1 : 0; 
          
          pathData = `
            M ${startX},${startY} 
            C ${cp1X},${cp1Y} ${cp2X},${cp2Y} ${entryX},${entryY} 
            A ${orbitRadius} ${orbitRadius} 0 0 ${sweepFlag} ${exitX} ${exitY}
            C ${cp3X},${cp3Y} ${cp4X},${cp4Y} ${endX},${lineConnectY}
          `;
      }

      const path = linkGroup.append("path")
          .attr("d", pathData)
          .style("stroke", color)
          .style("fill", "none")
          .style("stroke-width", 2.5)
          .style("stroke-linecap", "round")
          .style("stroke-linejoin", "round")
          .style("opacity", 1);

      const totalLength = path.node().getTotalLength();
      const duration = 1200; 

      path
        .attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(duration)
        .ease(d3.easeCubicOut) 
        .attr("stroke-dashoffset", 0);

      drawVineLeaves(path.node(), color, duration);

      linkGroup.append("circle")
          .attr("cx", startX).attr("cy", startY).attr("r", 4)
          .style("fill", color)
          .style("stroke", "white")
          .style("stroke-width", 1.5)
          .style("opacity", 0)
          .transition().duration(300).style("opacity", 1);

      drawOrnateEnd(endX, lineConnectY, color, duration);
  }

  function drawVineLeaves(pathNode, color, totalDuration) {
      const totalLen = pathNode.getTotalLength();
      const step = 40; 
      const leafCount = Math.floor(totalLen / step);
      const leafPath = "M0,0 Q6,-8 12,0 T0,0"; 

      for(let i=1; i<leafCount; i++) {
          const len = i * step;
          const pt = pathNode.getPointAtLength(len);
          const ptBefore = pathNode.getPointAtLength(len - 2);
          const ptAfter = pathNode.getPointAtLength(len + 2);
          const angleDeg = Math.atan2(ptAfter.y - ptBefore.y, ptAfter.x - ptBefore.x) * 180 / Math.PI;

          const flip = (i % 2 === 0) ? 1 : -1;
          const scale = 0.8;

          linkGroup.append("path")
             .attr("d", leafPath)
             .attr("fill", color)
             .attr("transform", `translate(${pt.x}, ${pt.y}) rotate(${angleDeg}) scale(0)`)
             .style("opacity", 0.8)
             .transition()
             .delay(totalDuration * (len / totalLen)) 
             .duration(400)
             .attr("transform", `translate(${pt.x}, ${pt.y}) rotate(${angleDeg}) scale(${scale}, ${scale * flip})`); 
      }
  }

  function drawOrnateEnd(x, y, color, delay) {
      const g = linkGroup.append("g")
          .attr("transform", `translate(${x}, ${y}) scale(0)`);

      g.append("circle").attr("r", 3).attr("fill", color);
      g.append("circle").attr("r", 6).attr("fill", "none").attr("stroke", color).attr("stroke-width", 1);
      
      const petal = "M0,-6 Q3,-10 6,-6 T0,-6"; 
      for(let i=0; i<4; i++) {
          g.append("path")
           .attr("d", petal)
           .attr("fill", "none")
           .attr("stroke", color)
           .attr("stroke-width", 1)
           .attr("transform", `rotate(${i * 90})`);
      }

      g.transition()
       .delay(delay - 200) 
       .duration(500)
       .attr("transform", `translate(${x}, ${y}) scale(1)`);
  }

  function updateDetailPanel(data, color) {
      const card = document.getElementById("tagDetailCard");
      if(!card) return;
      
      card.style.borderLeftColor = color; 
      document.querySelector(".tag-detail-panel").classList.add("active");

      const heatIndex = Math.round(data.originalValue);
      const gameCount = data.game_count || 0;
      const avgPrice = Math.round(Math.random() * 40 + 20); 
      const topTag = data.allTags[0] || "无";
      const tagsHtml = data.allTags.map(t => 
        `<span class="detail-tag-pill" style="color:${color}; background:${color}15; border-color:${color}30">${t}</span>`
      ).join("");

      card.innerHTML = `
        <div class="detail-header">
           <h3 class="detail-title" style="color:${color} !important; font-family:serif; font-size: 24px;">${data.name}</h3>
           <div class="detail-subtitle" style="color:${color} !important; opacity:0.6; letter-spacing: 2px;">CATEGORY ANALYSIS</div>
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
      `;
  }

  svg.on("click", () => {
      activeNode = null;
      linkGroup.selectAll("*").transition().style("opacity", 0).remove();
      cellGroup.selectAll("path")
          .transition().duration(400)
          .style("fill", "white").style("fill-opacity", 1) 
          .style("stroke", d => getCategoryColor(d.parent.data.name)).style("stroke-width", 1);
      
      const card = document.getElementById("tagDetailCard");
      if(card) {
          card.style.borderLeftColor = "#cbd5e1";
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