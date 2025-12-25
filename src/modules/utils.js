// modules/utils.js

function showTooltip(event, content) {
  // 1. 查找或创建 Tooltip 元素
  let tooltip = d3.select("#shared-tooltip");
  
  if (tooltip.empty()) {
    tooltip = d3.select("body").append("div")
      .attr("id", "shared-tooltip")
      .attr("class", "viz-tooltip")
      // 强制内联样式，确保不受其他 CSS 干扰，保证交互穿透
      .style("position", "absolute")
      .style("z-index", "9999")
      .style("pointer-events", "none") // 关键：让鼠标穿透 Tooltip，不要挡住下面的图表
      .style("opacity", 0)
      .style("transition", "opacity 0.1s");
  }
  
  // 2. 设置内容
  tooltip.html(content).style("opacity", 1);
  
  // 3. 智能定位 (防止超出屏幕边界)
  // 获取 Tooltip 尺寸
  const tipNode = tooltip.node();
  const w = tipNode.offsetWidth || 300; // 兜底宽度
  const h = tipNode.offsetHeight || 150; // 兜底高度
  
  // 获取鼠标在整个文档中的位置 (pageX/Y 比 clientX/Y 更稳，不怕滚动)
  let left = event.pageX + 15;
  let top = event.pageY + 15;
  
  // 右边界检测
  if (left + w > window.innerWidth + window.scrollX) {
    left = event.pageX - w - 15;
  }
  
  // 下边界检测
  if (top + h > window.innerHeight + window.scrollY) {
    top = event.pageY - h - 15;
  }
  
  // 应用位置
  tooltip.style("left", left + "px").style("top", top + "px");
}

// 导出
const Utils = {
  showTooltip
};

// 挂载到 window 确保全局可用
window.Utils = Utils;