let rawData = [];
let tagData = {};
let data = [];
const currentYear = 2025;

const nameMap = { 
  "year": "年份", 
  "original_price": "售价 (¥)", 
  "discount_strength": "折扣力度", 
  "favorable_rate": "好评率 (%)", 
  "log_players": "在线人数 (10^x)", 
  "retention_days": "留存天数 (Days)" 
};

const parallelDimensions = ["year", "original_price", "discount_strength", "favorable_rate", "log_players", "retention_days"];

async function loadData() {
  try {
    const [gamesResponse, tagsResponse, strategiesResponse] = await Promise.all([
      fetch('new_processed_games.json'),
      fetch('tag_heat.json'),
      fetch('discount_strategies.json').catch(() => ({ ok: false, json: async () => [] }))
    ]);
    
    rawData = await gamesResponse.json();
    tagData = await tagsResponse.json();
    const sDataRaw = await strategiesResponse.json();
    
    const strategyMap = {};
    if (Array.isArray(sDataRaw)) {
        sDataRaw.forEach(item => { strategyMap[item.name] = item; });
    }
    
    if (rawData && rawData.length > 0) {
      data = rawData.map(d => {
        const strat = strategyMap[d.name] || {};
        return {
          ...d,
          log_players: Math.log10(d.max_players < 1 ? 1 : d.max_players),
          discount_strength: (d.discount_count * (d.avg_discount_rate * 100)) / Math.max(0.1, currentYear - d.year),
          discount_frequency: d.discount_frequency || (d.discount_count / Math.max(0.1, currentYear - d.year)),
          avg_discount_rate: d.avg_discount_rate || 0,
          max_players: d.max_players || 0,
          total_comments: d.total_comments || 0,
          discount_count: d.discount_count || 0,
          events_breakdown: strat.events_breakdown || {},
          strategy_class: strat.strategy_class || "未知", 
          seasonal_ratio: strat.seasonal_ratio || 0
        };
      });
    }
    
    return { data, tagData, rawData };
  } catch (error) {
    console.error('加载数据失败:', error);
    throw error;
  }
}

function getData() { return data; }
function getTagData() { return tagData; }
function getRawData() { return rawData; }
function getNameMap() { return nameMap; }
function getParallelDimensions() { return parallelDimensions; }
function getCurrentYear() { return currentYear; }

function updateParallelDimensions(newDimensions) {
  parallelDimensions.length = 0;
  parallelDimensions.push(...newDimensions);
}

const DataManager = {
  loadData,
  getData,
  getTagData,
  getRawData,
  getNameMap,
  getParallelDimensions,
  updateParallelDimensions,
  getCurrentYear
};

