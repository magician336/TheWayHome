import * as d3 from "d3";

import { petalPaths, shapeScale } from "./viz/petals.js";
import { commentLabelFormat, isWukong, quantileFromSorted } from "./viz/utils.js";
import { createColorScale, createFlowerScaleGetter, createNumPetalScale, createSizeScale } from "./viz/scales.js";
import { createLegend, createLegendFrameController, ensureMotionFilterDefs } from "./viz/legend.js";
import { createFlowerGrid, createMainSvg } from "./viz/flowers.js";
import { createStoryboard } from "./viz/storyboard.js";

// 入口：加载数据并组装可视化
d3.json("chosen_game_update.json")
  .then(async function (games) {
    // 动态获取容器宽度，如果获取失败则默认为 1200
    const containerNode = document.getElementById("canvas");
    // 注意：页面用了 CSS zoom（见 styles.css），clientWidth 会跟着变小。
    // 为了保持“每行 7 朵”但不挤，需要把用于布局计算的宽度按 zoom 反向补偿。
    const zoom = Number.parseFloat(window.getComputedStyle(document.body).zoom) || 1;
    const rawWidth = containerNode && containerNode.clientWidth > 0 ? containerNode.clientWidth : 1200;
    const width = rawWidth / (zoom > 0 ? zoom : 1);

    const flowerSize = 150;
    // 行间距：需要给 3 行文字留出空间，避免被下一行花朵遮挡
    const rowGap = 150;
    const cols = 7;
    // 同一行花与花的“横向额外间距”（单位：px）。
    // 调大：同一行更松；调小：更紧。建议 0~200。
    const colGap = -20;
    const rows = Math.ceil(games.length / cols);
    // 额外留白：避免首行/末行的大花瓣（如戴森球计划）被 SVG 裁切
    const height = rows * (flowerSize + rowGap) + 140;

    const container = d3.select("#canvas");
    container.html("");
    container
      .style("position", "relative")
      .style("width", "100%")
      // 保持一行 7 朵但不挤：扩大画布可用宽度
      .style("max-width", "1600px")
      .style("margin-left", "auto")
      .style("margin-right", "auto");

    const { sizeScale, commentValues } = createSizeScale(games);
    const { numPetalScale, rateValues } = createNumPetalScale(games);
    const colorScale = createColorScale(games);

    const commentSorted = commentValues.slice().sort(d3.ascending);
    const rateSorted = rateValues.slice().sort(d3.ascending);
    const commentSamples = [
      quantileFromSorted(commentSorted, 0),
      quantileFromSorted(commentSorted, 0.25),
      quantileFromSorted(commentSorted, 0.5),
      quantileFromSorted(commentSorted, 0.75),
      quantileFromSorted(commentSorted, 1)
    ];
    const rateSamples = [
      quantileFromSorted(rateSorted, 0),
      quantileFromSorted(rateSorted, 0.25),
      quantileFromSorted(rateSorted, 0.5),
      quantileFromSorted(rateSorted, 0.75),
      quantileFromSorted(rateSorted, 1)
    ];

    // 悟空特例：整体下移
    const WUKONG_Y_SHIFT = 25;
    const WUKONG_LABEL_Y_SHIFT = 18;

    const mainHeight = height + (games.some(isWukong) ? WUKONG_Y_SHIFT : 0);
    const { getFlowerScale } = createFlowerScaleGetter({ games, sizeScale, isWukong });

    // 平台编码 -> 具体平台（用于图例1展示；花朵本体仍只显示编号）
    const PLATFORM_ORDER = ["PC", "Console", "Mobile"];
    const normalizePlatforms = (platforms) => {
      const list = Array.isArray(platforms) ? platforms.slice() : [];
      return list.sort((a, b) => PLATFORM_ORDER.indexOf(a) - PLATFORM_ORDER.indexOf(b));
    };
    const platformCodePlatforms = new Map();
    games.forEach((g) => {
      const code = g?.platformCode;
      if (code == null) return;
      const list = normalizePlatforms(g?.platforms);
      if (!list.length) return;
      const key = String(code);
      const value = list.join(" / ");
      // 若同一 code 出现多种组合，优先保留更“长”的那条
      const prev = platformCodePlatforms.get(key);
      if (!prev || value.length > prev.length) {
        platformCodePlatforms.set(key, value);
      }
    });

    ensureMotionFilterDefs(container);

    const mainSvg = createMainSvg({ container, width, height: mainHeight });

    // 容器高度：默认给足（后续由 frame 控制）
    container.style("height", `${mainHeight}px`);

    const { flowers, labelLayer } = createFlowerGrid({
      mainSvg,
      games,
      width,
      cols,
      flowerSize,
      rowGap,
      colGap,
      isWukong,
      WUKONG_Y_SHIFT,
      WUKONG_LABEL_Y_SHIFT
    });

    const legend = createLegend({
      container,
      width,
      colorScale,
      shapeScale,
      petalPaths,
      sizeScale,
      numPetalScale,
      platformCodePlatforms,
      commentSamples,
      rateSamples,
      commentLabelFormat
    });

    // 图例层显式提到最上
    legend.legendSvg.style("z-index", "10").raise();

    const frame = createLegendFrameController({ container, legend, mainSvg, mainHeight });

    const storyboard = createStoryboard({
      container,
      mainSvg,
      flowers,
      labelLayer,
      legend,
      frame,
      numPetalScale,
      getFlowerScale,
      colorScale,
      shapeScale,
      BASE_SCALE: 0.7,
      onStateChange: (state) => {
        // 当进入最终状态时，通知父页面调整 iframe 高度
        if (state === 8) { // STATE.FINAL = 8
          // 获取 body 的实际渲染高度 (考虑 zoom)
          const actualHeight = document.body.getBoundingClientRect().height;
          // 发送消息给父窗口
          window.parent.postMessage({ type: 'flowerchart-resize', height: actualHeight + 100 }, '*');
        }
      }
    });

    await storyboard.init();
  })
  .catch(function (error) {
    console.error("Error loading the data: " + error);
  });
