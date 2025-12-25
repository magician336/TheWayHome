function showTooltip(event, content) {
  let tooltip;
  if (typeof GlobalVizConfig !== 'undefined') {
      tooltip = GlobalVizConfig.setupTooltip();
  } else {
      tooltip = d3.select("#shared-tooltip");
      if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("id", "shared-tooltip").attr("class", "viz-tooltip");
  }
  
  tooltip.style("pointer-events", "none");
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

const Utils = {
  showTooltip
};

