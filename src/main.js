// main.js

let currentScatterMode = 'scatter'; // 'scatter' or 'matrix'

async function loadData() {
  const result = await DataManager.loadData();
  initYearSelect();
  init();
}

function initYearSelect() {
  const data = DataManager.getData();
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

function init() {
  const data = DataManager.getData();
  const tagData = DataManager.getTagData();
  const nameMap = DataManager.getNameMap();
  const parallelDimensions = DataManager.getParallelDimensions();
  
  // 1. 平行坐标
  ParallelCoordinates.draw(data, parallelDimensions, nameMap, 'main-chart-container', 'colorSelect', 'searchName', 'selectYear', 'exitFocusBtn');
  
  // 2. Tag 气泡
  TagBubble.draw(tagData, 'tag-viz');
  
  // 3. 统一散点图 (初始渲染)
  updateScatter();
}

// 供 index.html 的切换按钮调用
window.toggleScatterMode = function() {
    const btn = document.getElementById('toggleViewBtn');
    const controls = document.getElementById('scatter-controls');
    
    if (currentScatterMode === 'scatter') {
        currentScatterMode = 'matrix';
        btn.innerText = "⬅ 返回散点分布";
        btn.style.background = "#64748b"; // 变成灰色表示返回
        controls.style.opacity = "0.3"; // 禁用散点控制器的视觉效果
        controls.style.pointerEvents = "none";
    } else {
        currentScatterMode = 'scatter';
        btn.innerText = "切换至折扣策略视图 ➡";
        btn.style.background = "var(--accent-color)";
        controls.style.opacity = "1";
        controls.style.pointerEvents = "all";
    }
    
    updateScatter();
};

function updateScatter() {
  const data = DataManager.getData();
  const nameMap = DataManager.getNameMap();
  const xKey = document.getElementById('scatterX').value;
  const yKey = document.getElementById('scatterY').value;
  
  // 核心改动：把 currentScatterMode 传进去
  // 注意：我们复用了 'scatter-viz' 这个容器
  ScatterPlot.draw(data, nameMap, xKey, yKey, 'scatter-viz', 'colorSelect', currentScatterMode);
}

// ... (以下保持不变，去掉 updateDiscountMatrix 及其相关调用) ...

window.redrawParallelChart = function() {
  const data = DataManager.getData();
  const nameMap = DataManager.getNameMap();
  const parallelDimensions = DataManager.getParallelDimensions();
  ParallelCoordinates.draw(data, parallelDimensions, nameMap, 'main-chart-container', 'colorSelect', 'searchName', 'selectYear', 'exitFocusBtn');
};

window.exitFocusMode = function() {
  ParallelCoordinates.exitFocusMode('exitFocusBtn');
};

window.resetFilters = () => { 
    document.getElementById('searchName').value = ''; 
    document.getElementById('selectYear').value = ''; 
    if (window.updateParallelChart) {
      window.updateParallelChart("", ""); 
    }
};

document.getElementById('searchName').addEventListener('input', e => {
  if (window.updateParallelChart) {
    window.updateParallelChart(e.target.value, document.getElementById('selectYear').value);
  }
});
document.getElementById('selectYear').addEventListener('change', e => {
  if (window.updateParallelChart) {
    window.updateParallelChart(document.getElementById('searchName').value, e.target.value);
  }
});
document.getElementById('colorSelect').addEventListener('change', () => { 
  init();
});
document.getElementById('scatterX').addEventListener('change', updateScatter);
document.getElementById('scatterY').addEventListener('change', updateScatter);
window.addEventListener('resize', () => init());

loadData();