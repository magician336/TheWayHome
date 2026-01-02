import * as d3 from "d3";

export const createColorScale = (games) => {
  const allCategories = Array.from(new Set((games ?? []).flatMap((d) => d.categories)));
  return d3
    .scaleOrdinal()
    .domain(allCategories)
    .range([
      "#FFB09E", // 珊瑚橙
      "#CBF2BD", // 浅绿
      "#AFE9FF", // 天蓝
      "#FF69B4", // 亮粉
      "#FFD700", // 金黄
      "#40E0D0", // 青绿
      "#8A2BE2", // 紫罗兰
      "#5bec4eff", // 翠绿
      "#A0522D", // 咖啡色
      "#778899" // 蓝灰
    ]);
};

export const createSizeScale = (games) => {
  const commentValues = (games ?? [])
    .map((d) => d.totalComments)
    .filter((v) => Number.isFinite(v))
    .map((v) => +v);

  if (!commentValues.length) {
    return {
      sizeScale: () => 0.6,
      commentValues
    };
  }

  const sizeScale = d3
    .scaleQuantile()
    .domain(commentValues)
    .range([0.35, 0.5, 0.62, 0.7, 0.8, 0.95]);

  return { sizeScale, commentValues };
};

export const createNumPetalScale = (games) => {
  const rateValues = (games ?? [])
    .map((d) => d.favorableRate)
    .filter((v) => Number.isFinite(v))
    .map((v) => +v);

  const numPetalScale = d3
    .scaleQuantile()
    .domain(rateValues)
    .range(d3.range(5, 15));

  return { numPetalScale, rateValues };
};

// 只针对悟空，给它一个明显更大的 scale
export const createFlowerScaleGetter = ({ games, sizeScale, isWukong }) => {
  const maxScaleOther =
    d3.max(
      (games ?? []).filter((d) => !isWukong(d)),
      (d) => sizeScale(d.totalComments)
    ) ?? 1;

  const wukongScale = Math.max(maxScaleOther * 1.15, maxScaleOther + 0.2);
  const getFlowerScale = (d) => (isWukong(d) ? wukongScale : sizeScale(d.totalComments));

  return { getFlowerScale, wukongScale, maxScaleOther };
};
