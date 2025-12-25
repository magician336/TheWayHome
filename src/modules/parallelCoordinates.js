const MARGIN = { top: 100, right: 60, bottom: 60, left: 60 };
const ANIMATION_DURATION = 500;

let selectedAxisIndex = null;
let isFocusMode = false;
let matrixState = { x: 0, y: 0, isDragged: false };
let prevCorrelationR = 0;

function drawParallelPlot(data, parallelDimensions, nameMap, containerId, colorSelectId, searchNameId, selectYearId, exitFocusBtnId) {
  if (data.length === 0) return;
  
  const colorKey = document.getElementById(colorSelectId).value;
  const container = document.getElementById(containerId);
  const width = container.clientWidth - MARGIN.left - MARGIN.right;
  const height = container.clientHeight - MARGIN.top - MARGIN.bottom;

  const currentSearch = document.getElementById(searchNameId).value.toLowerCase();
  const currentYearFilter = document.getElementById(selectYearId).value;
  const isFiltered = currentSearch !== "" || currentYearFilter !== "";

  container.innerHTML = "";
  const svg = d3.select(`#${containerId}`).append("svg")
    .attr("width", container.clientWidth).attr("height", container.clientHeight)
    .attr("class", "shared-viz-svg")
    .append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

  const x = d3.scalePoint().range([0, width]).padding(0).domain(parallelDimensions);
  const y = {};
  
  parallelDimensions.forEach(key => {
    if (key === 'log_players') {
        y[key] = d3.scaleLinear().domain([2, 7]).range([height, 0]);
    } else if (key === 'favorable_rate') {
        y[key] = d3.scaleLinear().domain([30, 100]).range([height, 0]);
    } else {
        y[key] = d3.scaleLinear().domain(d3.extent(data, d => d[key])).nice().range([height, 0]);
    }
  });

  const cExtent = d3.extent(data, d => d[colorKey]);
  let scaleDomain = [cExtent[1], cExtent[0]]; 
  if (colorKey === 'favorable_rate') {
      scaleDomain = [cExtent[0], cExtent[1]]; 
  }
  
  const cScale = d3.scaleSequential()
    .domain(scaleDomain)
    .interpolator(t => d3.interpolateTurbo(0.95 - 0.85 * t));

  const lineGenerator = d3.line().defined(d => !isNaN(d[1])).x(d => x(d[0])).y(d => y[d[0]](d[1]));

  const pathGroup = svg.append("g");
  window.parallelPaths = pathGroup.selectAll("path.main-line")
    .data(data).enter().append("path")
    .attr("class", d => {
      const match = (!currentSearch || d.name.toLowerCase().includes(currentSearch)) && 
                    (!currentYearFilter || d.year == currentYearFilter);
      return match ? "line main-line" : "line main-line inactive";
    })
    .style("stroke", d => cScale(d[colorKey]))
    .style("stroke-opacity", d => {
      const match = (!currentSearch || d.name.toLowerCase().includes(currentSearch)) && 
                    (!currentYearFilter || d.year == currentYearFilter);
      if (isFocusMode) return match ? 0.1 : 0.02;
      return match ? (isFiltered ? 1 : 0.6) : 0.05;
    })
    .style("stroke-width", 1.5)
    .style("fill", "none")
    .each(function(d) {
      const path = d3.select(this);
      const pathData = parallelDimensions.map(p => [p, d[p]]);
      const fullPath = lineGenerator(pathData);
      
      if (!isFocusMode) {
        path.attr("d", fullPath);
        const pathLength = path.node().getTotalLength();
        path
          .attr("stroke-dasharray", pathLength + " " + pathLength)
          .attr("stroke-dashoffset", pathLength)
          .transition()
          .duration(1500)
          .ease(d3.easeLinear)
          .attr("stroke-dashoffset", 0);
      } else {
        path.attr("d", fullPath);
      }
    })
    .on("mouseover", function(event, d) {
      if (d3.select(this).classed("inactive")) return;
      
      d3.selectAll(".main-line.highlight").classed("highlight", false).style("stroke-width", 1.5);
      d3.select(this).classed("highlight", true).style("stroke-width", 3).style("stroke-opacity", 1).raise();
      
      const highlightDot = (selector) => {
        d3.select(selector).selectAll(".matrix-dot")
          .filter(p => p.name === d.name)
          .attr("r", 6).style("fill", "#fff").style("stroke", "#ff0000").style("stroke-width", 2).raise();
      };
      highlightDot("#strategy-matrix-group");
      highlightDot("#expanded-matrix-group");

      if (typeof Utils !== 'undefined' && Utils.showTooltip) {
        Utils.showTooltip(event, `
          <div class="tooltip-title">${d.name}</div>
          <div class="tooltip-row"><span>📉 折扣力度:</span> <b>${d.discount_strength.toFixed(2)}</b></div>
          <div class="tooltip-row"><span>📅 发售年份:</span> <b>${d.year}</b></div>
          <div class="tooltip-row"><span>👍 好评率:</span> <b>${d.favorable_rate}%</b></div>
          <div class="tooltip-row"><span>💰 售价:</span> <b>¥${d.original_price}</b></div>
          <div class="tooltip-row"><span>👥 在线:</span> <b>${d.max_players.toLocaleString()}</b></div>
        `);
      }
    })
    .on("mouseout", function(event, d) {
      GlobalVizConfig.setupTooltip().style("opacity", 0);
      d3.selectAll(".main-line").classed("highlight", false).style("stroke-width", 1.5);
      
      const s = document.getElementById(searchNameId).value.toLowerCase();
      const y_val = document.getElementById(selectYearId).value;
      const match = (!s || d.name.toLowerCase().includes(s)) && (!y_val || d.year == y_val);
      const isF = s !== "" || y_val !== "";
      
      d3.select(this).style("stroke-opacity", isFocusMode ? (match ? 0.1 : 0.02) : (match ? (isF ? 1 : 0.6) : 0.05));
      
      const restoreDot = (selector) => {
        d3.select(selector).selectAll(".matrix-dot")
          .filter(p => p.name === d.name)
          .attr("r", d3.select(selector).classed("expanded") ? 4 : 2)
          .style("fill", p => cScale(p[colorKey])).style("stroke", "none");
      };
      restoreDot("#strategy-matrix-group");
      restoreDot("#expanded-matrix-group");
    });

  const axisG = svg.selectAll("g.axis").data(parallelDimensions, d => d).enter()
    .append("g").attr("class", "axis").attr("transform", d => `translate(${x(d)})`);

  axisG.each(function(d) { 
      let axis = d3.axisLeft(y[d]);
      if (d === 'year') {
          const yearExtent = d3.extent(data, item => item.year);
          const years = d3.range(yearExtent[0], yearExtent[1] + 1);
          axis.tickValues(years).tickFormat(d3.format("d"));
      } else {
          axis.tickFormat(null); 
      }
      d3.select(this).call(axis); 
  });
  
  axisG.append("text").attr("class", "axis-title").style("text-anchor", "middle").attr("y", -15)
    .style("font-weight", "bold").style("fill", "var(--text-main)").style("font-size", "12px").text(d => nameMap[d]);
  
  svg.selectAll("g.axis").each(function(d, i) {
    const title = d3.select(this).select("text.axis-title");
    if (selectedAxisIndex !== null && i === selectedAxisIndex) {
      title.style("fill", "var(--accent-color)").style("font-size", "16px").style("font-weight", "bold").classed("axis-selected", true);
    } else {
      title.style("fill", "var(--text-main)").style("font-size", "12px").style("font-weight", "bold").classed("axis-selected", false);
    }
  });

  axisG.style("cursor", "pointer").on("click", function(event, d) {
    const clickedIdx = parallelDimensions.indexOf(d);
    if (clickedIdx === 0) return;
    
    if (selectedAxisIndex === null) {
      selectedAxisIndex = clickedIdx;
      
      svg.selectAll("g.axis").each(function(d, i) {
        const title = d3.select(this).select("text.axis-title");
        if (i === clickedIdx) {
          title.transition().duration(ANIMATION_DURATION)
               .style("fill", "var(--accent-color)").style("font-size", "16px")
               .on("end", function() { d3.select(this).classed("axis-selected", true); });
        } else {
          title.transition().duration(ANIMATION_DURATION)
               .style("fill", "var(--text-main)").style("font-size", "12px")
               .on("end", function() { d3.select(this).classed("axis-selected", false); });
        }
      });

      if (clickedIdx === 2 || clickedIdx === 3) { 
        isFocusMode = true; 
        document.getElementById(exitFocusBtnId).style.display = 'inline-block';
        if (window.redrawParallelChart) {
          window.redrawParallelChart();
        }
      }
    } else {
      const targetIdx = selectedAxisIndex;
      const temp = parallelDimensions[targetIdx];
      parallelDimensions[targetIdx] = parallelDimensions[clickedIdx];
      parallelDimensions[clickedIdx] = temp;
      selectedAxisIndex = null;
      x.domain(parallelDimensions);

      const duration = 500;
      
      svg.selectAll(".axis").transition().duration(duration)
         .attr("transform", d => `translate(${x(d)})`);
      
      window.parallelPaths.transition().duration(duration)
         .attr("d", d => lineGenerator(parallelDimensions.map(p => [p, d[p]])));

      svg.selectAll("text.axis-title").transition().duration(duration)
         .style("fill", "var(--text-main)").style("font-size", "12px")
         .on("end", function() { d3.select(this).classed("axis-selected", false); });

      if (isFocusMode) {
          setTimeout(() => {
            if (window.redrawParallelChart) {
              window.redrawParallelChart();
            }
          }, duration + 50);
      }
    }
  });

  if (isFocusMode && parallelDimensions.length >= 4) {
    const focusGroup = svg.append("g").attr("class", "focus-group");
    data.forEach(d => {
      const match = (!currentSearch || d.name.toLowerCase().includes(currentSearch)) && 
                    (!currentYearFilter || d.year == currentYearFilter);
      if (match) {
        focusGroup.append("path")
          .attr("class", "focus-segment")
          .attr("d", `M ${x(parallelDimensions[2])} ${y[parallelDimensions[2]](d[parallelDimensions[2]])} L ${x(parallelDimensions[3])} ${y[parallelDimensions[3]](d[parallelDimensions[3]])}`)
          .style("stroke", cScale(d[colorKey])).style("stroke-opacity", 0.8).style("stroke-width", 1.5).style("fill", "none").style("pointer-events", "none");
      }
    });

    if (parallelDimensions[2] === 'discount_strength' || parallelDimensions[3] === 'discount_strength') {
        drawDiscountStrategyMatrix(svg, width, height, cScale, colorKey, x, data, parallelDimensions);
    }
    
    drawCorrelationBar(svg, width, cScale, parallelDimensions, data);
  }

  window.updateParallelChart = function(s, y_val) {
    const sLower = s.toLowerCase();
    const isNowFiltered = s !== "" || y_val !== "";
    window.parallelPaths.each(function(d) {
      const m = (!s || d.name.toLowerCase().includes(sLower)) && (!y_val || d.year == y_val);
      d3.select(this).classed("inactive", !m)
        .style("stroke-opacity", isFocusMode ? (m ? 0.1 : 0.02) : (m ? (isNowFiltered ? 1 : 0.6) : 0.05));
    });
    if (isFocusMode) {
        const updateDots = (selector) => {
             d3.select(selector).selectAll(".matrix-dot")
              .style("opacity", d => {
                const m = (!s || d.name.toLowerCase().includes(sLower)) && (!y_val || d.year == y_val);
                return m ? 0.8 : 0.1;
              });
        };
        updateDots("#strategy-matrix-group");
        updateDots("#expanded-matrix-group");
    }
  };

  renderLegend(svg, width, height, cExtent, cScale, colorKey, nameMap);
}

function renderLegend(svg, width, height, ext, scale, key, nameMap) {
  const lW = 280, lH = 15, lX = 0, lY = -85;
  const g = svg.append("g").attr("transform", `translate(${lX},${lY})`);
  const gradId = "grad-main";
  const grad = svg.append("defs").append("linearGradient").attr("id", gradId).attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "0%");
  for (let i = 0; i <= 10; i++) {
    const val = ext[0] + (ext[1]-ext[0])*(i/10); 
    grad.append("stop").attr("offset", `${i*10}%`).attr("stop-color", scale(val));
  }
  g.append("rect").attr("width", lW).attr("height", lH).style("fill", `url(#${gradId})`);
  g.append("g").attr("transform", `translate(0,${lH + 5})`).call(d3.axisBottom(d3.scaleLinear().domain(ext).range([0, lW])).ticks(5));
  g.append("text").attr("x", lW / 2).attr("y", -5)
    .style("text-anchor", "middle").style("font-size", "11px").text(nameMap[key] || key);
}

function drawDiscountStrategyMatrix(svg, chartWidth, chartHeight, cScale, colorKey, xScale, data, parallelDimensions) {
  const baseW = 120, baseH = 70; 
  let hideTimer = null; 

  if (!matrixState.isDragged) {
      if (xScale && parallelDimensions.length >= 4) {
          const xPos2 = xScale(parallelDimensions[2]);
          const xPos3 = xScale(parallelDimensions[3]);
          const centerX = (xPos2 + xPos3) / 2 - (baseW / 2);
          matrixState.x = centerX;
          matrixState.y = -90; 
      }
  }

  const group = svg.append("g").attr("id", "strategy-matrix-group")
    .attr("transform", `translate(${matrixState.x}, ${matrixState.y})`);

  const drag = d3.drag()
    .on("start", function() { d3.select(this).style("cursor", "grabbing").raise(); })
    .on("drag", function(event) {
      matrixState.isDragged = true; 
      matrixState.x += event.dx;
      matrixState.y += event.dy;
      group.attr("transform", `translate(${matrixState.x}, ${matrixState.y})`);
    })
    .on("end", function() { d3.select(this).style("cursor", "grab"); });

  group.call(drag).style("cursor", "grab");

  group.append("rect").attr("width", baseW).attr("height", baseH)
    .attr("fill", "var(--card-bg)").attr("stroke", "var(--border-color)").attr("stroke-width", 1).attr("rx", 4);
  group.append("text").attr("x", 5).attr("y", 12).text("折扣策略 (拖拽/Hover展开)")
    .style("font-size", "9px").style("fill", "var(--text-main)").style("font-weight", "bold").style("pointer-events", "none");

  const clipId = "matrix-clip";
  group.append("clipPath").attr("id", clipId).append("rect").attr("x", 0).attr("y", 15).attr("width", baseW).attr("height", baseH - 15);
  const plotG = group.append("g").attr("clip-path", `url(#${clipId})`).style("pointer-events", "none");

  const matrixData = data.filter(d => d.strategy_class !== "未知" && d.original_price > 0);

  const maxFreq = d3.max(matrixData, d => d.discount_frequency) || 5;
  const x = d3.scaleLinear().domain([0, maxFreq]).range([5, baseW - 5]);
  const y = d3.scaleLinear().domain([0, 0.5]).range([baseH - 5, 20]); 

  plotG.selectAll("circle").data(matrixData).enter().append("circle")
    .attr("class", "matrix-dot")
    .attr("cx", d => x(d.discount_frequency))
    .attr("cy", d => y(Math.min(d.avg_discount_rate, 0.5)))
    .attr("r", 2).style("fill", d => cScale(d[colorKey])).style("opacity", 0.6);

  const showExpandedMatrix = () => {
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      if (!d3.select("#expanded-matrix-group").empty()) return; 

      const bigW = 500, bigH = 350;
      const bigX = (chartWidth - bigW) / 2; 
      const bigY = (chartHeight - bigH) / 2;

      const expandedG = svg.append("g").attr("id", "expanded-matrix-group")
        .attr("class", "expanded")
        .attr("transform", `translate(${bigX}, ${bigY})`)
        .style("opacity", 0);
      
      expandedG
        .on("mouseover", () => { if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; } })
        .on("mouseout", () => {
            hideTimer = setTimeout(() => {
                d3.select("#expanded-matrix-group").transition().duration(150).style("opacity", 0).remove();
            }, 300);
        });

      expandedG.append("rect").attr("width", bigW).attr("height", bigH)
        .attr("fill", "var(--card-bg)").attr("stroke", "var(--accent-color)").attr("stroke-width", 2).attr("rx", 8)
        .style("filter", "drop-shadow(0 10px 20px rgba(0,0,0,0.3))");

      const bx = d3.scaleLinear().domain([0, maxFreq]).range([50, bigW - 30]);
      const by = d3.scaleLinear().domain([0, 0.5]).range([bigH - 40, 40]);

      expandedG.append("g").attr("transform", `translate(0, ${bigH - 40})`)
        .call(d3.axisBottom(bx).ticks(10))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll("text").style("fill", "var(--text-main)"));
      
      expandedG.append("g").attr("transform", `translate(50, 0)`)
        .call(d3.axisLeft(by).ticks(5).tickFormat(d => (d*100)+"%"))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll("text").style("fill", "var(--text-main)"));

      expandedG.append("text").attr("x", bigW/2).attr("y", bigH - 5).text("年均打折频率 (次/年)").style("text-anchor", "middle").style("font-size", "12px").style("fill", "#666");
      expandedG.append("text").attr("transform", "rotate(-90)").attr("x", -bigH/2).attr("y", 15).text("平均折扣深度").style("text-anchor", "middle").style("font-size", "12px").style("fill", "#666");

      const midFreq = 3.0; 
      const midRate = 0.25; 
      expandedG.append("line").attr("x1", bx(midFreq)).attr("y1", 40).attr("x2", bx(midFreq)).attr("y2", bigH-40).style("stroke", "#ccc").style("stroke-dasharray", "4,4");
      expandedG.append("line").attr("x1", 50).attr("y1", by(midRate)).attr("x2", bigW-30).attr("y2", by(midRate)).style("stroke", "#ccc").style("stroke-dasharray", "4,4");

      expandedG.selectAll("circle").data(matrixData).enter().append("circle")
        .attr("class", "matrix-dot")
        .attr("cx", d => bx(d.discount_frequency))
        .attr("cy", d => by(Math.min(d.avg_discount_rate, 0.5)))
        .attr("r", 4)
        .style("fill", d => cScale(d[colorKey]))
        .style("opacity", 0.7)
        .style("stroke", "#fff").style("stroke-width", 0.5)
        .on("mouseover", function(event, d) {
             d3.select(this).attr("r", 7).style("stroke", "#ff0000").style("stroke-width", 2).raise();
             
             let eventsHtml = "";
             if (d.events_breakdown) {
                const events = Object.entries(d.events_breakdown)
                    .filter(([k, v]) => v > 0 && k !== "日常")
                    .sort((a, b) => b[1] - a[1]).slice(0, 3);
                if (events.length > 0) {
                    eventsHtml = `<div class="tooltip-row" style="margin-top:4px; color:#ff8800;"><span>🔥 热门节点:</span> <b>${events.map(e => e[0].split(' ')[0]).join(', ')}</b></div>`;
                }
             }
             
             if (typeof Utils !== 'undefined' && Utils.showTooltip) {
               Utils.showTooltip(event, `
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
             d3.select(this).attr("r", 4).style("stroke", "#fff").style("stroke-width", 0.5);
             GlobalVizConfig.setupTooltip().style("opacity", 0);
        });

      const labelStyle = "font-size:14px; font-weight:bold; fill:var(--text-main); opacity:0.8; pointer-events:none;";
      expandedG.append("text").attr("x", bigW - 40).attr("y", 60).attr("text-anchor", "end").attr("style", labelStyle).text("💸 清仓甩卖型");
      expandedG.append("text").attr("x", 60).attr("y", 60).attr("text-anchor", "start").attr("style", labelStyle).text("💎 高冷节日型");
      expandedG.append("text").attr("x", 60).attr("y", bigH - 50).attr("text-anchor", "start").attr("style", labelStyle).text("🛡️ 价值坚守型");
      expandedG.append("text").attr("x", bigW - 40).attr("y", bigH - 50).attr("text-anchor", "end").attr("style", labelStyle).text("📢 刷脸曝光型");

      expandedG.transition().duration(200).style("opacity", 1);
  };

  group.on("mouseover", showExpandedMatrix).on("mouseout", function() {
      hideTimer = setTimeout(() => {
        d3.select("#expanded-matrix-group").transition().duration(150).style("opacity", 0).remove();
      }, 300);
  });
}

function drawCorrelationBar(svg, chartWidth, cScale, parallelDimensions, data) {
  const dim = parallelDimensions;
  const xArr = data.map(d => d[dim[2]]), yArr = data.map(d => d[dim[3]]);
  const muX = d3.mean(xArr), muY = d3.mean(yArr);
  let num = 0, dX = 0, dY = 0;
  for(let i=0; i<xArr.length; i++) {
    const dx = xArr[i]-muX, dy = yArr[i]-muY;
    num += dx*dy; dX += dx**2; dY += dy**2;
  }
  const r = num / Math.sqrt(dX * dY) || 0;

  const barGroup = svg.append("g").attr("class", "correlation-viz")
    .attr("transform", `translate(${chartWidth - 220}, -85)`);

  const maxBarWidth = 100;
  const power = 0.5; 
  const centerX = 100; 
  
  const currentVisualLen = Math.pow(Math.abs(r), power) * maxBarWidth;
  const prevVisualLen = Math.pow(Math.abs(prevCorrelationR), power) * maxBarWidth;
  
  const startX = prevCorrelationR < 0 ? centerX - prevVisualLen : centerX;
  const startWidth = Math.max(2, prevVisualLen);
  const startColor = prevCorrelationR > 0 ? "#ff4d4d" : "#00d4ff";

  const endX = r < 0 ? centerX - currentVisualLen : centerX;
  const endWidth = Math.max(2, currentVisualLen);
  const endColor = r > 0 ? "#ff4d4d" : "#00d4ff";

  prevCorrelationR = r;

  barGroup.append("line").attr("x1", 0).attr("y1", 8).attr("x2", 200).attr("y2", 8).style("stroke", "#ddd").style("stroke-width", 1);
  barGroup.append("line").attr("x1", centerX).attr("y1", 5).attr("x2", centerX).attr("y2", 11).style("stroke", "#999").style("stroke-width", 1);

  barGroup.append("rect")
    .attr("y", 2).attr("height", 12).attr("rx", 2)
    .attr("x", startX).attr("width", startWidth).attr("fill", startColor)
    .style("cursor", "pointer")
    .on("mouseover", function(event) {
      if (typeof Utils !== 'undefined' && Utils.showTooltip) {
        Utils.showTooltip(event, `<div class="tooltip-title">关联度</div><div class="tooltip-row"><span>皮尔逊系数:</span> <b>${r.toFixed(4)}</b></div>`);
      }
    })
    .on("mouseout", function() { GlobalVizConfig.setupTooltip().style("opacity", 0); })
    .transition().duration(750).ease(d3.easeCubicOut)
    .attr("x", endX).attr("width", endWidth).attr("fill", endColor);
    
  barGroup.append("text").attr("x", 0).attr("y", -5).attr("text-anchor", "start")
    .style("font-size", "11px").style("fill", "var(--text-main)").text(`关联度: ${r.toFixed(3)}`);
}

function exitFocusMode(exitFocusBtnId) {
  isFocusMode = false; 
  selectedAxisIndex = null; 
  document.getElementById(exitFocusBtnId).style.display = 'none'; 
  const svg = d3.select("#main-chart-container svg.shared-viz-svg"); 
  
  if (!svg.empty()) {
      svg.selectAll("text.axis-title").transition().duration(ANIMATION_DURATION)
         .style("fill", "var(--text-main)").style("font-size", "12px")
         .on("end", function() { d3.select(this).classed("axis-selected", false); });
  }
  
  if (window.redrawParallelChart) {
    window.redrawParallelChart();
  }
}

const ParallelCoordinates = {
  draw: drawParallelPlot,
  exitFocusMode
};

window.ParallelCoordinates = ParallelCoordinates;

