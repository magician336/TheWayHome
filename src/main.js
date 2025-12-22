/**
 * =============================================================================
 * 国产独立游戏数据可视化分析 - 主逻辑脚本
 * =============================================================================
 * * 包含核心功能：
 * 1. 数据加载与预处理 (Data Loading & Preprocessing)
 * 2. 平行坐标系主图绘制 (Parallel Coordinates Plot)
 * 3. 游戏Tag气泡图绘制 (Tag Bubble Chart)
 * 4. 变量关系散点图绘制 (Scatter Plot)
 * 5. 交互逻辑：观察模式 (Focus Mode)、筛选联动、高亮显示
 * 6. 高级分析模块：折扣策略矩阵 (Discount Strategy Matrix)
 * * @author Gemini & User
 * @version 1.0.0
 */

// --- 全局变量定义 ---
let rawData = []; // 原始游戏数据
let tagData = {}; // 原始Tag聚类数据
let data = [];    // 经过前端二次计算后的核心渲染数据

// 基础配置
const currentYear = 2025;
const nameMap = { 
  "year": "年份", 
  "original_price": "售价 (¥)", 
  "discount_strength": "折扣力度", 
  "favorable_rate": "好评率 (%)", 
  "log_players": "在线人数 (10^x)", 
  "retention_days": "留存天数 (Days)" 
};

// 平行坐标系的维度定义
let parallelDimensions = ["year", "original_price", "discount_strength", "favorable_rate", "log_players", "retention_days"];
let selectedAxisIndex = null; // 当前选中的坐标轴索引
let isFocusMode = false;      // 是否处于"观察模式"

// 布局边距配置 (从全局配置读取或使用默认值)
const MARGIN = typeof GlobalVizConfig !== 'undefined' ? GlobalVizConfig.layout.margin : { top: 100, right: 60, bottom: 60, left: 60 };

/**
 * 初始化并加载数据
 * 读取三个核心数据源并进行合并处理
 */
async function loadData() {
  try {
    const [gamesResponse, tagsResponse, strategiesResponse] = await Promise.all([
      fetch('new_processed_games.json'),
      fetch('tag_heat_clusters_detailed.json'),
      fetch('discount_strategies.json').catch(() => ({ ok: false, json: async () => [] })) // 容错处理
    ]);
    
    rawData = await gamesResponse.json();
    tagData = await tagsResponse.json();
    const sDataRaw = await strategiesResponse.json();
    
    // 建立哈希映射，加速策略数据查找
    const strategyMap = {};
    if (Array.isArray(sDataRaw)) {
        sDataRaw.forEach(item => { strategyMap[item.name] = item; });
    }
    
    if (rawData && rawData.length > 0) {
      // 数据清洗与合并
      data = rawData.map(d => {
        const strat = strategyMap[d.name] || {};
        return {
          ...d,
          // 衍生指标计算
          log_players: Math.log10(d.max_players < 1 ? 1 : d.max_players),
          
          // 核心折扣指标 (强度 = 次数 * 力度 / 时间)
          discount_strength: (d.discount_count * (d.avg_discount_rate * 100)) / Math.max(0.1, currentYear - d.year),
          
          // 策略矩阵所需指标 (X轴: 频率, Y轴: 深度)
          discount_frequency: d.discount_frequency || (d.discount_count / Math.max(0.1, currentYear - d.year)),
          avg_discount_rate: d.avg_discount_rate || 0,
          
          // Tooltip 展示指标 (兜底处理)
          max_players: d.max_players || 0,
          total_comments: d.total_comments || 0,
          discount_count: d.discount_count || 0,
          
          // 策略分析结果注入
          events_breakdown: strat.events_breakdown || {},
          strategy_class: strat.strategy_class || "未知", 
          seasonal_ratio: strat.seasonal_ratio || 0
        };
      });
    }
    
    // 初始化UI组件
    initYearSelect();
    init();
  } catch (error) {
    console.error('加载数据失败:', error);
  }
}

/**
 * 初始化年份筛选下拉框
 */
function initYearSelect() {
  const yearSelect = document.getElementById('selectYear');
  if (data.length > 0) {
    const years = [...new Set(data.map(d => d.year))].sort((a, b) => b - a);
    years.forEach(year => {
      const opt = document.createElement('option');
      opt.value = year;
      opt.innerText = year;
      yearSelect.appendChild(opt);
    });
  }
}

/**
 * 显示自定义 Tooltip
 * @param {Event} event - 鼠标事件对象，用于定位
 * @param {string} content - Tooltip HTML 内容
 */
function showTooltip(event, content) {
  const tooltip = GlobalVizConfig.setupTooltip();
  tooltip.style("pointer-events", "none"); // 关键：防止遮挡鼠标事件
  tooltip.html(content).style("opacity", 1);
  
  // 智能防溢出定位逻辑
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

/**
 * =============================================================================
 * 核心模块：平行坐标系绘制 (Parallel Coordinates)
 * =============================================================================
 * 负责绘制主图线条、坐标轴、交互逻辑以及与策略矩阵的联动
 */
function drawParallelPlot() {
  if (data.length === 0) return;
  
  // --- 1. 画布与容器设置 ---
  const colorKey = document.getElementById('colorSelect').value;
  const container = document.getElementById('main-chart-container');
  const width = container.clientWidth - MARGIN.left - MARGIN.right;
  const height = container.clientHeight - MARGIN.top - MARGIN.bottom;

  // 获取当前筛选状态
  const currentSearch = document.getElementById('searchName').value.toLowerCase();
  const currentYearFilter = document.getElementById('selectYear').value;
  const isFiltered = currentSearch !== "" || currentYearFilter !== "";

  container.innerHTML = ""; // 清空重绘
  const svg = d3.select("#main-chart-container").append("svg")
    .attr("width", container.clientWidth).attr("height", container.clientHeight)
    .attr("class", "shared-viz-svg")
    .append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

  // --- 2. 比例尺定义 ---
  const x = d3.scalePoint().range([0, width]).padding(0).domain(parallelDimensions);
  const y = {};
  
  // 为每个维度独立定义 Y 轴比例尺
  parallelDimensions.forEach(key => {
    if (key === 'log_players') {
        y[key] = d3.scaleLinear().domain([2, 7]).range([height, 0]); // 对数级人数
    } else if (key === 'favorable_rate') {
        y[key] = d3.scaleLinear().domain([30, 100]).range([height, 0]); // 好评率截断展示
    } else {
        y[key] = d3.scaleLinear().domain(d3.extent(data, d => d[key])).nice().range([height, 0]);
    }
  });

  // --- 3. 颜色映射逻辑 (Turbo 色系) ---
  const cExtent = d3.extent(data, d => d[colorKey]);
  // 好评率: 值越大越蓝(好)；其他: 值越大越红(强/多)
  let scaleDomain = colorKey === 'favorable_rate' ? [cExtent[0], cExtent[1]] : [cExtent[1], cExtent[0]];
  const cScale = d3.scaleSequential().domain(scaleDomain).interpolator(t => d3.interpolateTurbo(0.95 - 0.85 * t));
  
  // 线条生成器
  const lineGenerator = d3.line().defined(d => !isNaN(d[1])).x(d => x(d[0])).y(d => y[d[0]](d[1]));

  // --- 4. 绘制线条 ---
  const pathGroup = svg.append("g");
  window.parallelPaths = pathGroup.selectAll("path.main-line")
    .data(data).enter().append("path")
    .attr("class", d => {
      // 初始筛选判断
      const match = (!currentSearch || d.name.toLowerCase().includes(currentSearch)) && 
                    (!currentYearFilter || d.year == currentYearFilter);
      return match ? "line main-line" : "line main-line inactive";
    })
    .attr("d", d => lineGenerator(parallelDimensions.map(p => [p, d[p]])))
    .style("stroke", d => cScale(d[colorKey]))
    .style("stroke-opacity", d => {
      const match = (!currentSearch || d.name.toLowerCase().includes(currentSearch)) && 
                    (!currentYearFilter || d.year == currentYearFilter);
      // 观察模式下大幅降低非关注线条透明度
      if (isFocusMode) return match ? 0.1 : 0.02;
      return match ? (isFiltered ? 1 : 0.6) : 0.05;
    })
    .style("stroke-width", 1.5)
    .style("fill", "none")
    // --- 交互事件 ---
    .on("mouseover", function(event, d) {
      if (d3.select(this).classed("inactive")) return;
      
      // 清除其他高亮，防止残留
      d3.selectAll(".main-line.highlight").classed("highlight", false).style("stroke-width", 1.5);
      // 高亮当前
      d3.select(this).classed("highlight", true).style("stroke-width", 3).style("stroke-opacity", 1).raise();
      
      // 联动：高亮策略矩阵中的对应点
      const highlightDot = (selector) => {
        d3.select(selector).selectAll(".matrix-dot")
          .filter(p => p.name === d.name)
          .attr("r", 6).style("fill", "#fff").style("stroke", "#ff0000").style("stroke-width", 2).raise();
      };
      highlightDot("#strategy-matrix-group");
      highlightDot("#expanded-matrix-group");

      // Tooltip 展示关键维度数据
      showTooltip(event, `
        <div class="tooltip-title">${d.name}</div>
        <div class="tooltip-row"><span>📉 折扣力度:</span> <b>${d.discount_strength.toFixed(2)}</b></div>
        <div class="tooltip-row"><span>📅 发售年份:</span> <b>${d.year}</b></div>
        <div class="tooltip-row"><span>👍 好评率:</span> <b>${d.favorable_rate}%</b></div>
        <div class="tooltip-row"><span>💰 售价:</span> <b>¥${d.original_price}</b></div>
        <div class="tooltip-row"><span>👥 在线:</span> <b>${d.max_players.toLocaleString()}</b></div>
      `);
    })
    .on("mouseout", function(event, d) {
      GlobalVizConfig.setupTooltip().style("opacity", 0);
      
      // 强制清除高亮状态
      d3.selectAll(".main-line").classed("highlight", false).style("stroke-width", 1.5);
      
      // 恢复线条透明度 (需重新计算当前模式下的正确透明度)
      const s = document.getElementById('searchName').value.toLowerCase();
      const y_val = document.getElementById('selectYear').value;
      const match = (!s || d.name.toLowerCase().includes(s)) && (!y_val || d.year == y_val);
      const isF = s !== "" || y_val !== "";
      
      d3.select(this).style("stroke-opacity", isFocusMode ? (match ? 0.1 : 0.02) : (match ? (isF ? 1 : 0.6) : 0.05));
      
      // 恢复策略矩阵点样式
      const restoreDot = (selector) => {
        d3.select(selector).selectAll(".matrix-dot")
          .filter(p => p.name === d.name)
          .attr("r", d3.select(selector).classed("expanded") ? 4 : 2)
          .style("fill", p => cScale(p[colorKey])).style("stroke", "none");
      };
      restoreDot("#strategy-matrix-group");
      restoreDot("#expanded-matrix-group");
    });

  // --- 5. 绘制坐标轴 ---
  const axisG = svg.selectAll("g.axis").data(parallelDimensions, d => d).enter()
    .append("g").attr("class", "axis").attr("transform", d => `translate(${x(d)})`);

  axisG.each(function(d) { 
      d3.select(this).call(d3.axisLeft(y[d]).tickFormat(d === 'year' ? d3.format("d") : null)); 
  });
  
  // 轴标题
  axisG.append("text").attr("class", "axis-title").style("text-anchor", "middle").attr("y", -15)
    .style("font-weight", "bold").style("fill", "var(--text-main)").style("font-size", "12px").text(d => nameMap[d]);
  
  // 轴高亮逻辑
  svg.selectAll("g.axis").each(function(d, i) {
    const title = d3.select(this).select("text.axis-title");
    if (selectedAxisIndex !== null && i === selectedAxisIndex) {
      title.style("fill", "var(--accent-color)").style("font-size", "16px").style("font-weight", "bold").classed("axis-selected", true);
    } else {
      title.style("fill", "var(--text-main)").style("font-size", "12px").style("font-weight", "bold").classed("axis-selected", false);
    }
  });

  // --- 6. 轴交互：点击选中与交换顺序 ---
  axisG.style("cursor", "pointer").on("click", function(event, d) {
    const clickedIdx = parallelDimensions.indexOf(d);
    if (clickedIdx === 0) return; // 第一轴通常固定
    
    if (selectedAxisIndex === null) {
      // 选中逻辑
      selectedAxisIndex = clickedIdx;
      
      // 触发观察模式条件：选中第3或第4轴
      if (clickedIdx === 2 || clickedIdx === 3) { 
        isFocusMode = true; 
        document.getElementById('exitFocusBtn').style.display = 'inline-block';
        drawParallelPlot(); 
      }
    } else {
      // 交换逻辑
      const targetIdx = selectedAxisIndex;
      const temp = parallelDimensions[targetIdx];
      parallelDimensions[targetIdx] = parallelDimensions[clickedIdx];
      parallelDimensions[clickedIdx] = temp;
      selectedAxisIndex = null;
      x.domain(parallelDimensions); // 更新域
      drawParallelPlot(); // 重绘
    }
  });

  // --- 7. 观察模式专属组件 ---
  if (isFocusMode && parallelDimensions.length >= 4) {
    // 背景聚焦线段绘制
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

    // 绘制关联度条 (Pearson Correlation)
    drawCorrelationBar(svg, width);

    // 绘制折扣策略矩阵 (仅当涉及折扣力度轴时)
    if (parallelDimensions[2] === 'discount_strength' || parallelDimensions[3] === 'discount_strength') {
      drawDiscountStrategyMatrix(svg, width, height, cScale, colorKey);
    }
  }

  // --- 8. 全局筛选更新函数绑定 ---
  window.updateParallelChart = function(s, y_val) {
    const sLower = s.toLowerCase();
    const isNowFiltered = s !== "" || y_val !== "";
    window.parallelPaths.each(function(d) {
      const m = (!s || d.name.toLowerCase().includes(sLower)) && (!y_val || d.year == y_val);
      d3.select(this).classed("inactive", !m)
        .style("stroke-opacity", isFocusMode ? (m ? 0.1 : 0.02) : (m ? (isNowFiltered ? 1 : 0.6) : 0.05));
    });
    // 同步更新策略矩阵中的点透明度
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

  // 绘制图例
  renderLegend(svg, width, height, cExtent, cScale, colorKey);
}

/**
 * 绘制主图顶部的颜色图例
 */
function renderLegend(svg, width, height, ext, scale, key) {
  const lW = 280, lH = 15, lX = 0, lY = -85;
  const g = svg.append("g").attr("transform", `translate(${lX},${lY})`);
  const gradId = "grad-main";
  
  // 渐变定义
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

/**
 * =============================================================================
 * 高级模块：折扣策略矩阵 (Discount Strategy Matrix)
 * =============================================================================
 * 包含小图(可拖拽)与大图(Hover展示)两套逻辑
 * 展示四象限策略分布：频率 vs 力度
 */
function drawDiscountStrategyMatrix(svg, chartWidth, chartHeight, cScale, colorKey) {
  const baseW = 140, baseH = 80;
  let matrixState = { x: chartWidth - 380, y: -95 }; // 初始位置
  let hideTimer = null; // 防抖定时器

  // 创建小图容器
  const group = svg.append("g").attr("id", "strategy-matrix-group")
    .attr("transform", `translate(${matrixState.x}, ${matrixState.y})`);

  // --- 小图拖拽逻辑 ---
  const drag = d3.drag()
    .on("start", function() { d3.select(this).style("cursor", "grabbing").raise(); })
    .on("drag", function(event) {
      matrixState.x += event.dx;
      matrixState.y += event.dy;
      group.attr("transform", `translate(${matrixState.x}, ${matrixState.y})`);
    })
    .on("end", function() { d3.select(this).style("cursor", "grab"); });

  group.call(drag).style("cursor", "grab");

  // 绘制小图背景与标题
  group.append("rect").attr("width", baseW).attr("height", baseH)
    .attr("fill", "var(--card-bg)").attr("stroke", "var(--border-color)").attr("stroke-width", 1).attr("rx", 4);
  group.append("text").attr("x", 5).attr("y", 12).text("折扣策略 (拖拽/Hover展开)")
    .style("font-size", "9px").style("fill", "var(--text-main)").style("font-weight", "bold").style("pointer-events", "none");

  // 裁剪区域
  const clipId = "matrix-clip";
  group.append("clipPath").attr("id", clipId).append("rect").attr("x", 0).attr("y", 15).attr("width", baseW).attr("height", baseH - 15);
  const plotG = group.append("g").attr("clip-path", `url(#${clipId})`).style("pointer-events", "none");

  // 数据过滤：剔除免费游戏和无策略数据
  const matrixData = data.filter(d => d.strategy_class !== "未知" && d.original_price > 0);

  // 比例尺 (小图)
  const maxFreq = d3.max(matrixData, d => d.discount_frequency) || 5;
  const x = d3.scaleLinear().domain([0, maxFreq]).range([5, baseW - 5]);
  const y = d3.scaleLinear().domain([0, 0.5]).range([baseH - 5, 20]); // Y轴范围 0~50% off

  // 绘制小图数据点
  plotG.selectAll("circle").data(matrixData).enter().append("circle")
    .attr("class", "matrix-dot")
    .attr("cx", d => x(d.discount_frequency))
    .attr("cy", d => y(Math.min(d.avg_discount_rate, 0.5)))
    .attr("r", 2).style("fill", d => cScale(d[colorKey])).style("opacity", 0.6);

  // --- 高清大图绘制逻辑 (内部闭包) ---
  const showExpandedMatrix = () => {
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      if (!d3.select("#expanded-matrix-group").empty()) return; // 已存在则不重绘

      const bigW = 500, bigH = 350;
      const bigX = (chartWidth - bigW) / 2; // 居中
      const bigY = (chartHeight - bigH) / 2;

      const expandedG = svg.append("g").attr("id", "expanded-matrix-group")
        .attr("class", "expanded")
        .attr("transform", `translate(${bigX}, ${bigY})`)
        .style("opacity", 0);
      
      // 大图交互维持逻辑
      expandedG
        .on("mouseover", () => { if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; } })
        .on("mouseout", () => {
            hideTimer = setTimeout(() => {
                d3.select("#expanded-matrix-group").transition().duration(150).style("opacity", 0).remove();
            }, 300);
        });

      // 大图背景
      expandedG.append("rect").attr("width", bigW).attr("height", bigH)
        .attr("fill", "var(--card-bg)").attr("stroke", "var(--accent-color)").attr("stroke-width", 2).attr("rx", 8)
        .style("filter", "drop-shadow(0 10px 20px rgba(0,0,0,0.3))");

      // 大图比例尺
      const bx = d3.scaleLinear().domain([0, maxFreq]).range([50, bigW - 30]);
      const by = d3.scaleLinear().domain([0, 0.5]).range([bigH - 40, 40]);

      // 绘制详细坐标轴
      expandedG.append("g").attr("transform", `translate(0, ${bigH - 40})`)
        .call(d3.axisBottom(bx).ticks(10))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll("text").style("fill", "var(--text-main)"));
      
      expandedG.append("g").attr("transform", `translate(50, 0)`)
        .call(d3.axisLeft(by).ticks(5).tickFormat(d => (d*100)+"%"))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll("text").style("fill", "var(--text-main)"));

      // 坐标轴标题
      expandedG.append("text").attr("x", bigW/2).attr("y", bigH - 5).text("年均打折频率 (次/年)").style("text-anchor", "middle").style("font-size", "12px").style("fill", "#666");
      expandedG.append("text").attr("transform", "rotate(-90)").attr("x", -bigH/2).attr("y", 15).text("平均折扣深度").style("text-anchor", "middle").style("font-size", "12px").style("fill", "#666");

      // 四象限辅助线 (Y=0.25 即 75折 分界)
      const midFreq = 3.0; 
      const midRate = 0.25; 
      expandedG.append("line").attr("x1", bx(midFreq)).attr("y1", 40).attr("x2", bx(midFreq)).attr("y2", bigH-40).style("stroke", "#ccc").style("stroke-dasharray", "4,4");
      expandedG.append("line").attr("x1", 50).attr("y1", by(midRate)).attr("x2", bigW-30).attr("y2", by(midRate)).style("stroke", "#ccc").style("stroke-dasharray", "4,4");

      // 绘制大图数据点
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
             
             // 解析节假日数据
             let eventsHtml = "";
             if (d.events_breakdown) {
                const events = Object.entries(d.events_breakdown)
                    .filter(([k, v]) => v > 0 && k !== "日常")
                    .sort((a, b) => b[1] - a[1]).slice(0, 3);
                if (events.length > 0) {
                    eventsHtml = `<div class="tooltip-row" style="margin-top:4px; color:#ff8800;"><span>🔥 热门节点:</span> <b>${events.map(e => e[0].split(' ')[0]).join(', ')}</b></div>`;
                }
             }
             
             // 大图 Tooltip 展示详细策略信息
             showTooltip(event, `
                <div class="tooltip-title">${d.name}</div>
                <div class="tooltip-row"><span>📊 策略类型:</span> <b>${d.strategy_class}</b></div>
                <div class="tooltip-row"><span>📉 年均折扣:</span> <b>${d.discount_frequency.toFixed(1)} 次</b></div>
                <div class="tooltip-row"><span>💸 平均折扣:</span> <b>${(d.avg_discount_rate*100).toFixed(0)}% (off)</b></div>
                <div class="tooltip-row"><span>🎉 节假日占比:</span> <b>${(d.seasonal_ratio*100).toFixed(0)}%</b></div>
                ${eventsHtml}
             `);
        })
        .on("mouseout", function() {
             d3.select(this).attr("r", 4).style("stroke", "#fff").style("stroke-width", 0.5);
             GlobalVizConfig.setupTooltip().style("opacity", 0);
        });

      // 绘制四角策略标签
      const labelStyle = "font-size:14px; font-weight:bold; fill:var(--text-main); opacity:0.8; pointer-events:none;";
      expandedG.append("text").attr("x", bigW - 40).attr("y", 60).attr("text-anchor", "end").attr("style", labelStyle).text("💸 清仓甩卖型");
      expandedG.append("text").attr("x", 60).attr("y", 60).attr("text-anchor", "start").attr("style", labelStyle).text("💎 高冷节日型");
      expandedG.append("text").attr("x", 60).attr("y", bigH - 50).attr("text-anchor", "start").attr("style", labelStyle).text("🛡️ 价值坚守型");
      expandedG.append("text").attr("x", bigW - 40).attr("y", bigH - 50).attr("text-anchor", "end").attr("style", labelStyle).text("📢 刷脸曝光型");

      expandedG.transition().duration(200).style("opacity", 1);
  };

  // 小图事件绑定
  group.on("mouseover", showExpandedMatrix).on("mouseout", function() {
      hideTimer = setTimeout(() => {
        d3.select("#expanded-matrix-group").transition().duration(150).style("opacity", 0).remove();
      }, 300);
  });
}

/**
 * 绘制皮尔逊关联度条 (Pearson Correlation Bar)
 * 位于右上角，展示当前两轴的统计学相关性
 */
function drawCorrelationBar(svg, chartWidth) {
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
  const power = 0.5; // 非线性缩放因子，增强小值的可见度
  const visualLen = Math.pow(Math.abs(r), power) * maxBarWidth;
  const centerX = 100; 
  const actualBarX = r < 0 ? centerX - visualLen : centerX;
  
  barGroup.append("line").attr("x1", 0).attr("y1", 8).attr("x2", 200).attr("y2", 8).style("stroke", "#ddd").style("stroke-width", 1);
  barGroup.append("line").attr("x1", centerX).attr("y1", 5).attr("x2", centerX).attr("y2", 11).style("stroke", "#999").style("stroke-width", 1);

  barGroup.append("rect")
    .attr("x", actualBarX).attr("y", 2).attr("width", Math.max(2, visualLen)).attr("height", 12)
    .attr("fill", r > 0 ? "#ff4d4d" : "#00d4ff").attr("rx", 2).style("cursor", "pointer")
    .on("mouseover", function(event) {
      showTooltip(event, `<div class="tooltip-title">关联度</div><div class="tooltip-row"><span>皮尔逊系数:</span> <b>${r.toFixed(4)}</b></div>`);
    })
    .on("mouseout", function() { GlobalVizConfig.setupTooltip().style("opacity", 0); });
    
  barGroup.append("text").attr("x", 0).attr("y", -5).attr("text-anchor", "start")
    .style("font-size", "11px").style("fill", "var(--text-main)").text(`关联度: ${r.toFixed(3)}`);
}

/**
 * 绘制 Tag 气泡图 (Bubble Chart)
 * 展示游戏标签的热度与分布
 */
function drawTagBubbleChart() {
  if (!tagData || !tagData.children) return;
  const container = document.getElementById('tag-viz');
  container.innerHTML = "";
  const width = container.clientWidth, height = container.clientHeight;
  const svg = d3.select("#tag-viz").append("svg")
    .attr("width", width).attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("class", "shared-viz-svg")
    .style("display", "block").style("margin", "0 auto");

  const root = d3.hierarchy(tagData).sum(d => Math.pow(d.value, 0.6)).sort((a, b) => b.value - a.value);
  const pack = d3.pack().size([width, height]).padding(3);
  pack(root);
  const color = d3.scaleSequential([0, root.children.length], d3.interpolateMagma);
  const nodes = svg.selectAll("g").data(root.leaves()).join("g").attr("transform", d => `translate(${d.x},${d.y})`).attr("class", "node-group");
  
  nodes.append("circle").attr("r", d => d.r).attr("class", "bubble").style("fill", (d, i) => color(i)).style("fill-opacity", 0.8).style("stroke", "#000").style("stroke-width", 1);
  nodes.append("text").attr("class", "bubble-text main-label").attr("y", -2).text(d => d.data.name).style("font-size", d => Math.max(8, Math.min(d.r / 2.2, 16)) + "px").style("opacity", d => d.r > 10 ? 1 : 0).style("pointer-events", "none").style("text-anchor", "middle").style("font-weight", "bold");
  nodes.append("text").attr("class", "bubble-subtext sub-label").attr("y", d => d.r / 2.2 + 4).text(d => Math.round(d.data.value)).style("font-size", d => Math.max(7, Math.min(d.r / 3, 10)) + "px").style("opacity", d => d.r > 12 ? 0.8 : 0).style("pointer-events", "none").style("text-anchor", "middle");
  
  nodes.on("mouseover", function(event, d) {
    d3.select(this).raise().select("circle").transition().duration(200).attr("r", d.r * 1.3).style("stroke", "#fff").style("stroke-width", 2).style("fill-opacity", 1);
    d3.select(this).selectAll("text").transition().duration(200).style("opacity", 1);
    let tagsHtml = d.data.detail_tags ? d.data.detail_tags.map(t => `<span class="tag-pill">${t}</span>`).join("") : "";
    
    showTooltip(event, `
        <div class="tooltip-title">${d.data.name}</div>
        <div class="tooltip-row"><span>🔥 综合热度:</span> <b>${Math.round(d.data.value)}</b></div>
        <div class="tooltip-row"><span>🎮 关联游戏数:</span> <b>${d.data.game_count}</b></div>
        <div style="margin-top:8px; border-top:1px solid var(--border-color); padding-top:4px;">
            <div style="white-space:normal; max-width:200px;">${tagsHtml}</div>
        </div>
    `);
  }).on("mouseout", function(event, d) {
    d3.select(this).select("circle").transition().duration(200).attr("r", d.r).style("stroke", "#000").style("stroke-width", 1).style("fill-opacity", 0.8);
    d3.select(this).select(".main-label").transition().duration(200).style("opacity", d.r > 10 ? 1 : 0);
    d3.select(this).select(".sub-label").transition().duration(200).style("opacity", d.r > 12 ? 0.8 : 0);
    GlobalVizConfig.setupTooltip().style("opacity", 0);
  });
}

/**
 * 绘制散点图 (Scatter Chart)
 * 展示两两变量之间的关系分布
 */
function drawScatterChart(xKey, yKey) {
  const container = document.getElementById('scatter-viz');
  container.innerHTML = "";
  const w = container.clientWidth, h = container.clientHeight;
  const m = { top: 20, right: 30, bottom: 40, left: 60 };
  const svg = d3.select("#scatter-viz").append("svg").attr("width", w).attr("height", h).attr("class", "shared-viz-svg").append("g").attr("transform", `translate(${m.left},${m.top})`);
  const iW = w - m.left - m.right, iH = h - m.top - m.bottom;
  
  const x = d3.scaleLinear().domain(d3.extent(data, d => d[xKey])).nice().range([0, iW]);
  const y = d3.scaleLinear().domain(d3.extent(data, d => d[yKey])).nice().range([iH, 0]);
  
  svg.append("g").attr("transform", `translate(0,${iH})`).call(d3.axisBottom(x).ticks(5).tickFormat(xKey==='year'?d3.format("d"):null));
  svg.append("g").call(d3.axisLeft(y).ticks(5));
  svg.append("text").attr("x", iW/2).attr("y", iH+35).style("text-anchor","middle").style("font-size","12px").text(nameMap[xKey]);
  
  const cKey = document.getElementById('colorSelect').value;
  const cExt = d3.extent(data, d => d[cKey]);
  let scaleDomain = cKey === 'favorable_rate' ? [cExt[0], cExt[1]] : [cExt[1], cExt[0]];
  const cScale = d3.scaleSequential().domain(scaleDomain).interpolator(t => d3.interpolateTurbo(0.95 - 0.85 * t));
  
  svg.selectAll("circle").data(data).enter().append("circle").attr("cx", d => x(d[xKey])).attr("cy", d => y(d[yKey])).attr("r", 5).style("fill", d => cScale(d[cKey])).style("stroke", "#000").style("stroke-width", 0.8)
    .on("mouseover", function(e, d) { 
        d3.select(this).attr("r", 8).style("stroke", "#fff").raise(); 
        let tipContent = `<div class="tooltip-title">${d.name}</div>`;
        if (xKey !== 'log_players') tipContent += `<div class="tooltip-row"><span>${nameMap[xKey]}:</span> <b>${xKey === 'year' ? d[xKey] : d[xKey].toFixed(2)}</b></div>`;
        if (yKey !== 'log_players') tipContent += `<div class="tooltip-row"><span>${nameMap[yKey]}:</span> <b>${yKey === 'year' ? d[yKey] : d[yKey].toFixed(2)}</b></div>`;
        tipContent += `
            <div class="tooltip-row"><span>👥 最大在线:</span> <b>${d.max_players.toLocaleString()}</b></div>
            <div class="tooltip-row"><span>💬 总评论数:</span> <b>${d.total_comments.toLocaleString()}</b></div>
            <div class="tooltip-row"><span>👍 好评率:</span> <b>${d.favorable_rate}%</b></div>
        `;
        showTooltip(e, tipContent); 
    })
    .on("mouseout", function() { d3.select(this).attr("r", 5).style("stroke", "#000"); GlobalVizConfig.setupTooltip().style("opacity", 0); });
}

// --- 初始化与事件监听 ---
function init() { drawParallelPlot(); drawTagBubbleChart(); updateScatter(); }
function updateScatter() { drawScatterChart(document.getElementById('scatterX').value, document.getElementById('scatterY').value); }

window.exitFocusMode = () => { 
    isFocusMode = false; selectedAxisIndex = null; 
    document.getElementById('exitFocusBtn').style.display = 'none'; 
    const svg = d3.select("#main-chart-container svg.shared-viz-svg"); 
    if (!svg.empty()) svg.selectAll("text.axis-title").style("fill", "var(--text-main)").style("font-size", "12px"); 
    drawParallelPlot(); 
};

window.resetFilters = () => { 
    document.getElementById('searchName').value = ''; 
    document.getElementById('selectYear').value = ''; 
    window.updateParallelChart("", ""); 
};

// 绑定DOM事件
document.getElementById('searchName').addEventListener('input', e => window.updateParallelChart(e.target.value, document.getElementById('selectYear').value));
document.getElementById('selectYear').addEventListener('change', e => window.updateParallelChart(document.getElementById('searchName').value, e.target.value));
document.getElementById('colorSelect').addEventListener('change', () => { drawParallelPlot(); updateScatter(); });
document.getElementById('scatterX').addEventListener('change', updateScatter);
document.getElementById('scatterY').addEventListener('change', updateScatter);
window.addEventListener('resize', () => init());

// 启动
loadData();