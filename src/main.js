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
  
  ParallelCoordinates.draw(data, parallelDimensions, nameMap, 'main-chart-container', 'colorSelect', 'searchName', 'selectYear', 'exitFocusBtn');
  TagBubble.draw(tagData, 'tag-viz');
  updateScatter();
  updateDiscountMatrix();
}

window.redrawParallelChart = function() {
  const data = DataManager.getData();
  const nameMap = DataManager.getNameMap();
  const parallelDimensions = DataManager.getParallelDimensions();
  ParallelCoordinates.draw(data, parallelDimensions, nameMap, 'main-chart-container', 'colorSelect', 'searchName', 'selectYear', 'exitFocusBtn');
};

window.exitFocusMode = function() {
  ParallelCoordinates.exitFocusMode('exitFocusBtn');
};

function updateScatter() {
  const data = DataManager.getData();
  const nameMap = DataManager.getNameMap();
  const xKey = document.getElementById('scatterX').value;
  const yKey = document.getElementById('scatterY').value;
  ScatterPlot.draw(data, nameMap, xKey, yKey, 'scatter-viz', 'colorSelect');
}

function updateDiscountMatrix() {
  const data = DataManager.getData();
  const colorKey = document.getElementById('colorSelect').value;
  const cExtent = d3.extent(data, d => d[colorKey]);
  let scaleDomain = [cExtent[1], cExtent[0]];
  if (colorKey === 'favorable_rate') {
    scaleDomain = [cExtent[0], cExtent[1]];
  }
  const cScale = d3.scaleSequential()
    .domain(scaleDomain)
    .interpolator(t => d3.interpolateTurbo(0.95 - 0.85 * t));
  DiscountStrategyMatrix.draw(data, cScale, colorKey, 'discount-matrix-viz');
}

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