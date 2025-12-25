function drawTagBubbleChart(tagData, containerId) {
  // --- 1. 基础设置 ---
  const container = document.getElementById(containerId);
  if (!container || !tagData) return;

  container.innerHTML = "";
  const clientWidth = container.clientWidth || 800;
  const clientHeight = container.clientHeight || 600;
  
  const width = clientWidth;
  const height = clientHeight;
  
  const margin = 45; 
  const radius = Math.min(width, height) / 2 - margin;
  const centerX = width / 2;
  const centerY = height / 2;

  // 背景色 (浅白)
  const bgColor = "#f9f9f9"; 
  // 装饰圆环颜色
  const ringColor = "#333";

  // --- 2. 创建 SVG ---
  const svg = d3.select(`#${containerId}`).append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("class", "shared-viz-svg")
    .attr("shape-rendering", "geometricPrecision")
    .style("display", "block")
    .style("margin", "0 auto")
    .style("background", "transparent");

  const drawingGroup = svg.append("g")
    .attr("transform", `translate(${centerX},${centerY})`);

  // --- 3. 数据处理 ---
  let processedChildren = [];
  if (tagData.children) {
    processedChildren = tagData.children.map(cat => {
      let tags = [];
      let fullTagList = []; // 保存完整标签列表供Tooltip使用

      if (cat.detail_tags) {
        fullTagList = cat.detail_tags; // 保存原始完整列表
        const baseValue = cat.value / (cat.detail_tags.length || 1);
        tags = cat.detail_tags.map(t => ({ name: t, value: baseValue }));
      } else if (cat.children) {
        // 如果是另一种格式，尝试提取
        fullTagList = cat.children.map(c => c.name);
        tags = cat.children; 
      }

      // 仅选取前几个用于绘图
      const limit = cat.display_count !== undefined ? cat.display_count : 4;
      const topTags = tags.slice(0, limit);

      return {
        name: cat.name,
        children: topTags,
        originalValue: cat.value,
        game_count: cat.game_count || 0,
        allTags: fullTagList // ✨ 将完整列表挂载到父节点数据上
      };
    }).filter(c => c.children.length > 0);
  }

  const root = d3.hierarchy({ name: "root", children: processedChildren })
    .sum(d => d.value)
    .sort((a, b) => b.value - a.value);

  // --- 4. 维诺图计算 ---
  const polygonPoints = 360;
  const circlePolygon = [];
  for (let i = 0; i < polygonPoints; i++) {
    const angle = (2 * Math.PI * i) / polygonPoints;
    circlePolygon.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }

  try {
    const voronoi = d3.voronoiTreemap().clip(circlePolygon).prng(Math.random);
    voronoi(root);
  } catch (e) {
    console.error("Voronoi error", e);
    return;
  }

  // --- 5. 配色系统 (加深版，适合白底) ---
  const colorMap = {
    "角色扮演": "#C2185B", "动作格斗": "#E64A19", 
    "剧情叙事": "#F57F17", "生存开放": "#388E3C", 
    "休闲治愈": "#0097A7", "射击弹幕": "#1976D2", 
    "模拟建造": "#0288D1", "多人竞技": "#303F9F", 
    "奇幻神话": "#512DA8", "肉鸽挑战": "#7B1FA2", 
    "策略战棋": "#616161", "恐怖悬疑": "#455A64", 
    "平台银河城": "#C2185B", "解谜探案": "#E64A19", 
    "科幻机甲": "#0097A7", "卡牌构建": "#7B1FA2"
  };
  const fallbackScale = d3.scaleOrdinal(d3.schemeCategory10);
  const getCategoryColor = (name) => colorMap[name] || fallbackScale(name);

  const leaves = root.leaves();
  const groups = root.children;

  // --- 6. 绘制双层边界圆 ---
  const renderOuterRings = () => {
      const ringGroup = drawingGroup.append("g").attr("class", "outer-rings");
      
      // 内实线
      ringGroup.append("circle")
        .attr("r", radius + 3)
        .attr("fill", "none")
        .attr("stroke", ringColor)
        .attr("stroke-width", 1.5)
        .attr("stroke-opacity", 0.6);

      // 外装饰线
      ringGroup.append("circle")
        .attr("r", radius + 12)
        .attr("fill", "none")
        .attr("stroke", ringColor)
        .attr("stroke-width", 0.8)
        .attr("stroke-opacity", 0.3)
        .attr("stroke-dasharray", "3, 5"); // 虚线增加精致感
  };
  renderOuterRings();

  // --- 7. 绘制图形主体 ---

  // 7.1 背景底圆
  drawingGroup.append("circle")
    .attr("r", radius)
    .attr("fill", bgColor) 
    .attr("stroke", "none");

  // 7.2 大类交互区域 (透明填充，用于hover检测，放在底层)
  drawingGroup.selectAll("path.group-interactive")
    .data(groups)
    .join("path")
    .attr("d", d => d.polygon ? "M" + d.polygon.join("L") + "Z" : "")
    .style("fill", "transparent")
    .style("stroke", "none")
    .style("cursor", "pointer")
    .lower()
    .on("mouseover", function(event, d) {
      const color = getCategoryColor(d.data.name);
      const categoryData = d.data;
      const allTags = categoryData.allTags || [];
      const avgTagValue = allTags.length > 0 ? (categoryData.originalValue / allTags.length).toFixed(1) : 0;
      
      const tagsHtml = allTags.map(tag => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid #f0f0f0;">
          <span style="color: #555; font-size: 12px;">${tag}</span>
          <span style="color: ${color}; font-weight: bold; font-size: 11px;">${avgTagValue}</span>
        </div>
      `).join("");
      
      if (window.Utils && window.Utils.showTooltip) {
        window.Utils.showTooltip(event, `
          <div style="color: ${color}; font-size: 16px; font-weight: bold; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 2px solid ${color};">
            ${categoryData.name}
          </div>
          <div style="display: flex; gap: 20px; margin-bottom: 10px;">
            <div>
              <div style="font-size: 11px; color: #999; margin-bottom: 2px;">🔥 综合热度</div>
              <div style="font-size: 14px; font-weight: bold; color: ${color};">${Math.round(categoryData.originalValue)}</div>
            </div>
            <div>
              <div style="font-size: 11px; color: #999; margin-bottom: 2px;">🎮 关联游戏</div>
              <div style="font-size: 14px; font-weight: bold; color: ${color};">${categoryData.game_count}</div>
            </div>
          </div>
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
            <div style="font-size: 11px; color: #999; margin-bottom: 6px;">📋 包含标签 (${allTags.length}个):</div>
            <div style="max-height: 200px; overflow-y: auto; font-size: 12px;">
              ${tagsHtml || '<div style="color: #999;">暂无标签</div>'}
            </div>
          </div>
        `);
      }
      
      d3.selectAll("path.group-border")
        .filter(p => p === d)
        .style("stroke-width", 3.5)
        .style("stroke-opacity", 1);
    })
    .on("mouseout", function(event, d) {
      if (window.Utils) d3.select("#shared-tooltip").style("opacity", 0);
      d3.selectAll("path.group-border")
        .filter(p => p === d)
        .style("stroke-width", 2.5)
        .style("stroke-opacity", 0.9);
    });

  // 7.3 单元格 (Cells，在交互区域之上，hover优先)
  const cellGroup = drawingGroup.selectAll("g.cell")
    .data(leaves)
    .join("g")
    .attr("class", "cell");

  cellGroup.append("path")
    .attr("d", d => d.polygon ? "M" + d.polygon.join("L") + "Z" : "")
    .style("fill", bgColor)
    .style("stroke", d => getCategoryColor(d.parent.data.name)) 
    .style("stroke-width", 1)
    .style("stroke-opacity", 0.6)
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
       event.stopPropagation();
       const color = getCategoryColor(d.parent.data.name);
       d3.select(this)
         .style("fill", d3.color(color).copy({opacity: 0.1}))
         .style("stroke-opacity", 1)
         .style("stroke-width", 2);
       
       if (window.Utils && window.Utils.showTooltip) {
         const allTags = d.parent.data.allTags || [];
         const tagsDisplay = allTags.length > 0 
            ? allTags.map(t => `<span style="display:inline-block; background:rgba(0,0,0,0.05); padding:2px 6px; margin:2px; border-radius:4px; font-size:10px; color:#555;">${t}</span>`).join("")
            : "暂无更多";

         window.Utils.showTooltip(event, `
           <div style="color:${color}; font-size:14px; font-weight:bold; margin-bottom:5px;">${d.parent.data.name}</div>
           <div class="tooltip-title" style="color:#333; font-size:16px;">${d.data.name}</div>
           <div class="tooltip-row" style="color:#555; margin:5px 0;">🔥 热度: <b>${Math.round(d.value)}</b></div>
           <div style="margin-top:8px; padding-top:8px; border-top:1px solid #eee;">
             <div style="font-size:10px; color:#999; margin-bottom:4px;">该类别包含的所有标签:</div>
             <div style="line-height:1.4;">${tagsDisplay}</div>
           </div>
         `);
       }
    })
    .on("mouseout", function(event, d) {
       d3.select(this)
         .style("fill", bgColor)
         .style("stroke-opacity", 0.6)
         .style("stroke-width", 1);
       if (window.Utils) d3.select("#shared-tooltip").style("opacity", 0);
    });

  // 7.4 大类分割线 (更粗，同色)
  drawingGroup.selectAll("path.group-border")
    .data(groups)
    .join("path")
    .attr("d", d => d.polygon ? "M" + d.polygon.join("L") + "Z" : "")
    .style("fill", "none")
    .style("stroke", d => getCategoryColor(d.data.name))
    .style("stroke-width", 2.5)
    .style("stroke-opacity", 0.9)
    .style("pointer-events", "none");

  // --- 8. 文字绘制 ---

  const labels = drawingGroup.selectAll("g.label")
    .data(leaves)
    .join("g")
    .filter(d => d.polygon && d3.polygonArea(d.polygon) > 200)
    .attr("transform", d => `translate(${d3.polygonCentroid(d.polygon)})`)
    .style("pointer-events", "none");

  const getFontSize = (d) => {
     const area = d3.polygonArea(d.polygon);
     // 稍微调大一点字体，保证清晰
     return Math.min(16, Math.max(12, Math.sqrt(area) / 5));
  };

  // 8.1 文字 Halo (纯白描边，用于切断线条)
  labels.append("text")
    .text(d => d.data.name)
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .style("font-family", "system-ui, sans-serif")
    .style("font-size", d => getFontSize(d) + "px")
    .style("stroke", bgColor) // Halo = 背景色 (浅白)
    .style("stroke-width", 4) 
    .style("stroke-linejoin", "round")
    .style("stroke-linecap", "round")
    .style("fill", bgColor)
    .style("opacity", 1);

  // 8.2 文字本体 (颜色与区块边界一致)
  labels.append("text")
    .text(d => d.data.name)
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .style("font-family", "system-ui, sans-serif")
    .style("font-size", d => getFontSize(d) + "px")
    .style("font-weight", "700") // 加粗，增加可读性
    .style("fill", d => getCategoryColor(d.parent.data.name)) // ✨ 文字颜色 = 类别颜色
    .style("stroke", "none");

  // 9. 大类水印 (深灰色，沉底)
  drawingGroup.selectAll("text.group-watermark")
    .data(groups)
    .join("text")
    .filter(d => d.polygon && d3.polygonArea(d.polygon) > 1000)
    .attr("transform", d => `translate(${d3.polygonCentroid(d.polygon)})`)
    .text(d => d.data.name)
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .style("font-family", "system-ui, sans-serif")
    .style("font-size", d => Math.min(24, Math.sqrt(d3.polygonArea(d.polygon))/4) + "px")
    .style("font-weight", "800")
    .style("fill", "#000")
    .style("opacity", 0.05)
    .style("pointer-events", "none");
}

const TagBubble = { draw: drawTagBubbleChart };
window.TagBubble = TagBubble;