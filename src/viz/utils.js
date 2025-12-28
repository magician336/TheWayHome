import * as d3 from "d3";

export const quantileFromSorted = (sortedArr, p) => {
  if (!sortedArr?.length) return 0;
  const idx = Math.floor((sortedArr.length - 1) * p);
  return sortedArr[idx];
};

export const commentLabelFormat = d3.format("~s");

export const isWukong = (d) => {
  const name = String(d?.name ?? "").toLowerCase();
  // 兼容英文/中文标题（数据 name 可能已改为中文）
  const isEn = name.includes("black myth") && name.includes("wukong");
  const isZh = name.includes("黑神话") && name.includes("悟空");
  return isEn || isZh;
};
