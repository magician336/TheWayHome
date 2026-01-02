// 花瓣形状/路径定义与平台映射

// 花瓣路径（当前版本保留 4 种）
export const petalPaths = [
  // 1. Round
  "M0 0 C50 50 50 100 0 100 C-50 100 -50 50 0 0",

  // 2. Pointy
  "M-35 0 C-25 25 25 25 35 0 C50 25 25 75 0 100 C-25 75 -50 25 -35 0",

  // 3. Split/Notched
  "M0 0 C40 60 40 85 20 100 L0 90 L-20 100 C-40 85 -40 60 0 0",

  // 4. Simple Leaf
  "M0 0 C50 25 50 75 0 100 C-50 75 -50 25 0 0"
];

// Platform Code 1..n 循环映射到 petalPaths
export const shapeScale = (code) => petalPaths[(code - 1) % petalPaths.length];
