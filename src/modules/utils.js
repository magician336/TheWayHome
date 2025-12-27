// modules/utils.js

function showTooltip(event, content) {
  // 1. 查找 Tooltip 元素
  let tooltip = d3.select("#parallel-chart-shared-tooltip");
  
  // 2. 如果不存在，则创建
  if (tooltip.empty()) {
    tooltip = d3.select("body").append("div")
      .attr("id", "parallel-chart-shared-tooltip")
      .attr("class", "parallel-chart-tooltip");
  }
  
  // 3. ★★★ 关键修复：无论它是新建的还是已存在的，都强制设置核心样式 ★★★
  // 这能防止 CSS 文件没加载或被覆盖时导致 Tooltip 失效
  tooltip
    .style("position", "absolute")
    .style("z-index", "99999")
    .style("pointer-events", "none"); 

  // 4. 设置内容并显示
  tooltip.html(content).style("opacity", 1);
  
  // 5. 智能定位
  const tipNode = tooltip.node();
  const w = tipNode.offsetWidth || 300; 
  const h = tipNode.offsetHeight || 150; 
  
  // 使用 pageX/Y (文档坐标) 
  let left = event.pageX + 15;
  let top = event.pageY + 15;
  
  // 边界检测
  if (left + w > document.documentElement.clientWidth) {
    left = event.pageX - w - 15;
  }
  if (top + h > document.documentElement.clientHeight + window.scrollY) {
    top = event.pageY - h - 15;
  }
  
  tooltip.style("left", left + "px").style("top", top + "px");
}

const Utils = {
  showTooltip
};

window.Utils = Utils;