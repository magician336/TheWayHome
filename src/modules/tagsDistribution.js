// modules/tagsDistribution.js

function drawTagBubbleChart(tagData, containerId) {
  const container = document.getElementById(containerId);
  if (!container || !tagData) return;

  container.innerHTML = "";
  const width = container.clientWidth;
  const height = container.clientHeight;
  
  const margin = 20; 
  const radius = Math.min(width, height) / 2 - margin;
  const centerX = width / 2;
  const centerY = height / 2;

  const svg = d3.select(`#${containerId}`).append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("class", "shared-viz-svg")
    .style("display", "block")
    .style("margin", "0 auto");

  const drawingGroup = svg.append("g")
    .attr("transform", `translate(${centerX},${centerY})`);

  // --- 数据处理 (保持不变) ---
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

  const polygonPoints = 360;
  const circlePolygon = [];
  for (let i = 0; i < polygonPoints; i++) {
    const angle = (2 * Math.PI * i) / polygonPoints;
    circlePolygon.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }

  // 固定种子随机数
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

  // 情绪化配色
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

  // ==========================
  //      开始绘制与动画
  // ==========================

  // 1. 背景白底 (静态)
  drawingGroup.append("circle")
    .attr("r", radius)
    .attr("fill", "#ffffff") 
    .attr("stroke", "none");

  // 2. 单元格 Cells (动画：水波扩散 Ripple Fade In)
  const cellGroup = drawingGroup.selectAll("g.cell")
    .data(leaves)
    .join("g")
    .attr("class", "cell");

  cellGroup.append("path")
    .attr("d", d => d.polygon ? "M" + d.polygon.join("L") + "Z" : "")
    .style("fill", "white") 
    .style("stroke", d => getCategoryColor(d.parent.data.name)) 
    .style("stroke-width", 1) 
    
    // 初始状态：完全透明
    .style("stroke-opacity", 0) 
    .style("fill-opacity", 0) 
    
    .style("cursor", "pointer")
    
    // --- 动画定义 ---
    .transition()
    .duration(800)
    // 延迟计算：距离圆心越远，延迟越高 (产生从中心向外扩散的效果)
    .delay(d => {
        const centroid = d3.polygonCentroid(d.polygon);
        const dist = Math.sqrt(centroid[0]**2 + centroid[1]**2);
        return dist * 2; // 调整系数控制扩散速度
    })
    .ease(d3.easeCubicOut) // 舒缓的缓动曲线
    // 最终状态
    .style("stroke-opacity", 0.35)
    .style("fill-opacity", 1); // 注意：这里fill实际上是white，fill-opacity只控制白色背景的显现

  // 绑定交互事件 (在动画链之外绑定，确保交互逻辑独立)
  cellGroup.selectAll("path")
    .on("mouseover", function(event, d) {
       event.stopPropagation();
       const parentData = d.parent.data;
       const color = getCategoryColor(parentData.name);

       d3.select(this)
         .style("fill", d3.color(color).copy({opacity: 0.15}))
         .style("stroke-opacity", 1); 

       // 联动加粗
       groupBorders
         .filter(g => g === d.parent)
         .style("stroke-width", 3)
         .style("stroke-opacity", 1)
         .style("stroke", color);

       if (window.Utils && window.Utils.showTooltip) {
         const allTags = parentData.allTags || [];
         const tagsDisplay = allTags.length > 0 
            ? allTags.map(t => `<span class="tag-pill" style="border-color:${color}44; background:${color}11; color:${color};">${t}</span>`).join("")
            : "暂无更多";

         window.Utils.showTooltip(event, `
           <div style="color:${color}; font-size:16px; font-weight:bold; margin-bottom:8px; border-bottom:2px solid ${color}; padding-bottom:4px;">
             ${parentData.name}
           </div>
           <div style="display:flex; justify-content:space-between; gap:15px; margin-bottom:10px;">
              <div>
                <div style="font-size:11px; color:#64748b;">🔥 热度指数</div>
                <div style="font-size:15px; font-weight:bold; color:#333;">${Math.round(parentData.originalValue)}</div>
              </div>
              <div>
                <div style="font-size:11px; color:#64748b;">🎮 包含游戏</div>
                <div style="font-size:15px; font-weight:bold; color:#333;">${parentData.game_count}</div>
              </div>
           </div>
           <div style="border-top:1px solid #e2e8f0; padding-top:8px;">
             <div style="font-size:11px; color:#64748b; margin-bottom:5px;">包含的所有标签 (${allTags.length}):</div>
             <div style="max-height:150px; overflow-y:auto; line-height:1.6; display:flex; flex-wrap:wrap; gap:4px;">${tagsDisplay}</div>
           </div>
         `);
       }
    })
    .on("mouseout", function(event, d) {
       d3.select(this)
         .style("fill", "white")
         .style("stroke-opacity", 0.35); 
       
       groupBorders
         .filter(g => g === d.parent)
         .style("stroke-width", 1.5)
         .style("stroke-opacity", 0.9)
         .style("stroke", getCategoryColor(d.parent.data.name));

       d3.select("#shared-tooltip").style("opacity", 0);
    });

  // 3. 大类边界 (动画：描边生长 Line Drawing)
  const groupBorders = drawingGroup.selectAll("path.group-border")
    .data(groups)
    .join("path")
    .attr("class", "group-border")
    .attr("d", d => d.polygon ? "M" + d.polygon.join("L") + "Z" : "")
    .style("fill", "none")
    .style("stroke", d => getCategoryColor(d.data.name))
    .style("stroke-width", 1.5) 
    .style("pointer-events", "none")
    // 初始状态：不可见
    .style("stroke-opacity", 0)
    .each(function() {
        // 获取路径总长度
        const totalLength = this.getTotalLength();
        d3.select(this)
          .attr("stroke-dasharray", totalLength + " " + totalLength)
          .attr("stroke-dashoffset", totalLength) // 全部缩回去
          .style("stroke-opacity", 0.9); // 设为可见，但因为dashoffset所以看不见
    })
    // 动画
    .transition()
    .duration(1200)
    .ease(d3.easeCubicInOut)
    .attr("stroke-dashoffset", 0); // 慢慢画出来

  // 4. 精密圆环边界 (动画：淡入 Fade In)
  const ringColor = "#94a3b8"; 
  const rings = [
      {r: radius, w: 0.8, op: 0.6},
      {r: radius+3, w: 1.2, op: 0.4},
      {r: radius+6, w: 0.5, op: 0.3}
  ];
  
  rings.forEach((ring, i) => {
      drawingGroup.append("circle")
        .attr("r", ring.r)
        .attr("fill", "none")
        .attr("stroke", ringColor)
        .attr("stroke-width", ring.w)
        .style("pointer-events", "none")
        .style("opacity", 0) // 初始
        .transition()
        .delay(i * 150) // 逐个出现
        .duration(800)
        .style("opacity", ring.op);
  });

  // --- 5. 文字标签 (动画：上浮渐入 Float Up) ---
  const labelData = leaves
    .map(d => {
      const polygon = d.polygon;
      if (!polygon) return null;
      const area = d3.polygonArea(polygon);
      const centroid = d3.polygonCentroid(polygon);
      const fontSize = Math.min(14, Math.max(9, Math.sqrt(area) / 6)); 
      const words = d.data.name.split(/\s+/);
      const isMultiLine = words.length > 1 && d.data.name.length > 6;
      const lines = isMultiLine ? words : [d.data.name];
      const maxLineLength = Math.max(...lines.map(l => l.length));
      const estWidth = maxLineLength * fontSize * 0.75; 
      const estHeight = lines.length * (fontSize * 0.9);
      const lineHeight = fontSize * 1.1;

      return {
        d, area, x: centroid[0], y: centroid[1],
        fontSize, lines, lineHeight,
        box: {
          left: centroid[0] - estWidth / 2,
          top: centroid[1] - estHeight / 2,
          right: centroid[0] + estWidth / 2,
          bottom: centroid[1] + estHeight / 2
        }
      };
    })
    .filter(item => item !== null)
    .sort((a, b) => b.area - a.area);

  const placedLabels = [];

  labelData.forEach(label => {
    const dist = (x, y) => Math.sqrt(x*x + y*y);
    const safeRadius = radius - 5; 
    if (dist(label.x, label.y) > safeRadius) return;

    const tolerance = 4;
    let overlap = false;
    for (const placed of placedLabels) {
      if (
        label.box.left < placed.box.right - tolerance &&
        label.box.right > placed.box.left + tolerance &&
        label.box.top < placed.box.bottom - tolerance &&
        label.box.bottom > placed.box.top + tolerance
      ) {
        overlap = true;
        break;
      }
    }
    if (overlap) return;
    placedLabels.push(label);
    
    // --- 文字组 ---
    const g = drawingGroup.append("g")
      .attr("transform", `translate(${label.x},${label.y + 15})`) // 初始位置：向下偏移 15px
      .style("pointer-events", "none")
      .style("opacity", 0); // 初始透明

    // 添加动画
    g.transition()
     .duration(800)
     .delay(600 + Math.random() * 400) // 稍晚于线条，且带有随机性，避免整齐划一的生硬感
     .ease(d3.easeBackOut.overshoot(1.0)) // 稍微有点弹性
     .attr("transform", `translate(${label.x},${label.y})`) // 归位
     .style("opacity", 1);

    const haloText = g.append("text")
      .attr("text-anchor", "middle")
      .style("font-size", label.fontSize + "px")
      .style("stroke", "white")
      .style("stroke-width", 3)
      .style("stroke-linejoin", "round")
      .style("opacity", 0.9);

    const mainText = g.append("text")
      .attr("text-anchor", "middle")
      .style("font-size", label.fontSize + "px")
      .style("font-weight", "800")
      .style("fill", getCategoryColor(label.d.parent.data.name));

    const yOffset = -((label.lines.length - 1) * label.lineHeight) / 2;

    label.lines.forEach((line, i) => {
      const dy = i === 0 ? 0 : label.lineHeight;
      haloText.append("tspan").text(line).attr("x", 0).attr("dy", dy);
      mainText.append("tspan").text(line).attr("x", 0).attr("dy", dy);
    });
    
    haloText.attr("y", yOffset);
    mainText.attr("y", yOffset);
  });
}

const TagBubble = { draw: drawTagBubbleChart };
window.TagBubble = TagBubble;