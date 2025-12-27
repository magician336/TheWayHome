let parallelChart_currentScatterMode = 'scatter';

async function parallelChart_loadData() {
  const result = await DataManager.loadData();
  parallelChart_initYearSelect();
  parallelChart_init();
}

function parallelChart_initYearSelect() {
  const data = DataManager.getData();
  const yearSelect = document.getElementById('parallel-chart-selectYear');
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

function parallelChart_init() {
  const data = DataManager.getData();
  const tagData = DataManager.getTagData();
  const nameMap = DataManager.getNameMap();
  const parallelDimensions = DataManager.getParallelDimensions();
  
  ParallelCoordinates.draw(data, parallelDimensions, nameMap, 'parallel-chart-main-container', 'parallel-chart-colorSelect', 'parallel-chart-searchName', 'parallel-chart-selectYear', 'parallel-chart-exitFocusBtn');
  
  TagBubble.draw(tagData, 'parallel-chart-tag-viz');
  
  parallelChart_updateScatter();
}

window.parallelChart_toggleScatterMode = function() {
    const btn = document.getElementById('parallel-chart-toggleViewBtn');
    const controls = document.getElementById('parallel-chart-scatter-controls');
    
    if (parallelChart_currentScatterMode === 'scatter') {
        parallelChart_currentScatterMode = 'matrix';
        btn.innerText = "⬅ 返回散点分布";
        btn.style.background = "#64748b";
        controls.style.opacity = "0.3";
        controls.style.pointerEvents = "none";
    } else {
        parallelChart_currentScatterMode = 'scatter';
        btn.innerText = "切换至折扣策略视图 ➡";
        btn.style.background = "var(--accent-color)";
        controls.style.opacity = "1";
        controls.style.pointerEvents = "all";
    }
    
    parallelChart_updateScatter();
};

function parallelChart_updateScatter() {
  const data = DataManager.getData();
  const nameMap = DataManager.getNameMap();
  const xKey = document.getElementById('parallel-chart-scatterX').value;
  const yKey = document.getElementById('parallel-chart-scatterY').value;
  
  ScatterPlot.draw(data, nameMap, xKey, yKey, 'parallel-chart-scatter-viz', 'parallel-chart-colorSelect', parallelChart_currentScatterMode);
}

window.parallelChart_redrawParallelChart = function() {
  const data = DataManager.getData();
  const nameMap = DataManager.getNameMap();
  const parallelDimensions = DataManager.getParallelDimensions();
  ParallelCoordinates.draw(data, parallelDimensions, nameMap, 'parallel-chart-main-container', 'parallel-chart-colorSelect', 'parallel-chart-searchName', 'parallel-chart-selectYear', 'parallel-chart-exitFocusBtn');
};

window.parallelChart_exitFocusMode = function() {
  ParallelCoordinates.exitFocusMode('parallel-chart-exitFocusBtn');
};

// 【修复 2】在这里：增强了重置按钮的逻辑
window.parallelChart_resetFilters = () => { 
    // 1. 清空输入框数据
    document.getElementById('parallel-chart-searchName').value = ''; 
    document.getElementById('parallel-chart-selectYear').value = ''; 
    
    // 2. 检查是否处于观察模式 (通过“退出观察模式”按钮的显示状态判断)
    const exitBtn = document.getElementById('parallel-chart-exitFocusBtn');
    const isFocusing = exitBtn && exitBtn.style.display !== 'none';

    if (isFocusing) {
        // 如果在观察模式，调用退出函数。
        // exitFocusMode 内部会重置 selectedAxisIndex，消除文字高亮，并触发一次全量 redraw
        window.parallelChart_exitFocusMode();
    } else {
        // 如果不在观察模式，仅执行常规的样式更新
        if (window.parallelChart_updateParallelChart) {
          window.parallelChart_updateParallelChart("", ""); 
        }
    }
};

document.getElementById('parallel-chart-searchName').addEventListener('input', e => {
  if (window.parallelChart_updateParallelChart) {
    window.parallelChart_updateParallelChart(e.target.value, document.getElementById('parallel-chart-selectYear').value);
  }
});
document.getElementById('parallel-chart-selectYear').addEventListener('change', e => {
  if (window.parallelChart_updateParallelChart) {
    window.parallelChart_updateParallelChart(document.getElementById('parallel-chart-searchName').value, e.target.value);
  }
});
document.getElementById('parallel-chart-colorSelect').addEventListener('change', () => { 
  const data = DataManager.getData();
  const nameMap = DataManager.getNameMap();
  const parallelDimensions = DataManager.getParallelDimensions();
  ParallelCoordinates.draw(data, parallelDimensions, nameMap, 'parallel-chart-main-container', 'parallel-chart-colorSelect', 'parallel-chart-searchName', 'parallel-chart-selectYear', 'parallel-chart-exitFocusBtn');
  parallelChart_updateScatter();
});
document.getElementById('parallel-chart-scatterX').addEventListener('change', parallelChart_updateScatter);
document.getElementById('parallel-chart-scatterY').addEventListener('change', parallelChart_updateScatter);
window.addEventListener('resize', () => parallelChart_init());

parallelChart_loadData();