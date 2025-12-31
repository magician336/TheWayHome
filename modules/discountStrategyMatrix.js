function drawDiscountStrategyMatrix(data, cScale, colorKey, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = "";
  
  const width = container.clientWidth || 800;
  const height = container.clientHeight || 450;
  const margin = { top: 50, right: 50, bottom: 60, left: 80 };
  const iW = width - margin.left - margin.right;
  const iH = height - margin.top - margin.bottom;
  
  const svg = d3.select(`#${containerId}`)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("class", "shared-viz-svg")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  
  const matrixData = data.filter(d => d.strategy_class !== "未知" && d.original_price > 0);
  const maxFreq = d3.max(matrixData, d => d.discount_frequency) || 5;
  
  const x = d3.scaleLinear().domain([0, maxFreq]).range([0, iW]);
  const y = d3.scaleLinear().domain([0, 0.5]).range([iH, 0]);
  
  svg.append("g")
    .attr("transform", `translate(0, ${iH})`)
    .call(d3.axisBottom(x).ticks(10))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll("text").style("fill", "var(--text-main)"));
  
  svg.append("g")
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => (d*100)+"%"))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll("text").style("fill", "var(--text-main)"));
  
  svg.append("text")
    .attr("x", iW/2)
    .attr("y", iH + 45)
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .style("fill", "var(--text-main)")
    .style("font-weight", "bold")
    .text("年均打折频率 (次/年)");
  
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -iH/2)
    .attr("y", -50)
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .style("fill", "var(--text-main)")
    .style("font-weight", "bold")
    .text("平均折扣深度");
  
  const midFreq = 3.0;
  const midRate = 0.25;
  
  svg.append("line")
    .attr("x1", x(midFreq))
    .attr("y1", 0)
    .attr("x2", x(midFreq))
    .attr("y2", iH)
    .style("stroke", "#ccc")
    .style("stroke-dasharray", "4,4")
    .style("stroke-width", 1.5);
  
  svg.append("line")
    .attr("x1", 0)
    .attr("y1", y(midRate))
    .attr("x2", iW)
    .attr("y2", y(midRate))
    .style("stroke", "#ccc")
    .style("stroke-dasharray", "4,4")
    .style("stroke-width", 1.5);
  
  const dots = svg.selectAll("circle")
    .data(matrixData)
    .join("circle")
    .attr("cx", d => x(d.discount_frequency))
    .attr("cy", d => y(Math.min(d.avg_discount_rate, 0.5)))
    .attr("r", 5)
    .style("fill", d => cScale(d[colorKey]))
    .style("opacity", 0.7)
    .style("stroke", "#fff")
    .style("stroke-width", 1)
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
      d3.select(this)
        .attr("r", 8)
        .style("stroke", "#ff0000")
        .style("stroke-width", 2)
        .raise();
      
      let eventsHtml = "";
      if (d.events_breakdown) {
        const events = Object.entries(d.events_breakdown)
          .filter(([k, v]) => v > 0 && k !== "日常")
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);
        if (events.length > 0) {
          eventsHtml = `<div class="tooltip-row" style="margin-top:4px; color:#ff8800;"><span>🔥 热门节点:</span> <b>${events.map(e => e[0].split(' ')[0]).join(', ')}</b></div>`;
        }
      }
      
      if (window.Utils && window.Utils.showTooltip) {
        window.Utils.showTooltip(event, `
          <div class="tooltip-title">${d.name}</div>
          <div class="tooltip-row"><span>📊 策略类型:</span> <b>${d.strategy_class}</b></div>
          <div class="tooltip-row"><span>📉 年均折扣:</span> <b>${d.discount_frequency.toFixed(1)} 次</b></div>
          <div class="tooltip-row"><span>💸 平均折扣:</span> <b>${(d.avg_discount_rate*100).toFixed(0)}% (off)</b></div>
          <div class="tooltip-row"><span>🎉 节假日占比:</span> <b>${(d.seasonal_ratio*100).toFixed(0)}%</b></div>
          ${eventsHtml}
        `);
      }
    })
    .on("mouseout", function() {
      d3.select(this)
        .attr("r", 5)
        .style("stroke", "#fff")
        .style("stroke-width", 1);
      if (window.Utils) {
        d3.select("#parallel-chart-shared-tooltip").style("opacity", 0);
      }
    });
  
  const labelStyle = "font-size:16px; font-weight:bold; fill:var(--text-main); opacity:0.8; pointer-events:none;";
  svg.append("text").attr("x", iW - 20).attr("y", 30).attr("text-anchor", "end").attr("style", labelStyle).text("💸 清仓甩卖型");
  svg.append("text").attr("x", 20).attr("y", 30).attr("text-anchor", "start").attr("style", labelStyle).text("💎 高冷节日型");
  svg.append("text").attr("x", 20).attr("y", iH - 10).attr("text-anchor", "start").attr("style", labelStyle).text("🛡️ 价值坚守型");
  svg.append("text").attr("x", iW - 20).attr("y", iH - 10).attr("text-anchor", "end").attr("style", labelStyle).text("📢 刷脸曝光型");
}

const DiscountStrategyMatrix = {
  draw: drawDiscountStrategyMatrix
};

window.DiscountStrategyMatrix = DiscountStrategyMatrix;

