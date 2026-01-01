import * as d3 from "d3";

// 创建滤镜 defs（供光晕与图例颜色球共用）
export const ensureMotionFilterDefs = (container) => {
  const defsSvg = container.append("svg").attr("width", 0).attr("height", 0);
  const defs = defsSvg.append("defs");

  defs
    .append("filter")
    .attr("id", "motionFilter")
    .attr("filterUnits", "objectBoundingBox")
    .attr("x", "-100%")
    .attr("y", "-100%")
    .attr("width", "300%")
    .attr("height", "300%")
    .append("feGaussianBlur")
    .attr("in", "SourceGraphic")
    .attr("stdDeviation", "4.5");

  return defs;
};

export const createLegend = ({
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
}) => {
  const legendHeight = 940;

  const legendSvg = container
    .append("svg")
    .attr("width", width)
    .attr("height", legendHeight)
    .style("position", "absolute")
    .style("top", "0px")
    .style("left", "50%")
    .style("transform", "translateX(-50%)")
    .style("z-index", "2")
    .style("pointer-events", "none")
    .style("background", "transparent")
    .style("opacity", 1);

  const legendTitleStyle = (selection) => {
    selection
      .attr("text-anchor", "middle")
      .style("font-family", "sans-serif")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .style("fill", "#333");
  };
  const legendTextStyle = (selection) => {
    selection
      .attr("text-anchor", "middle")
      .style("font-family", "sans-serif")
      .style("font-size", "13px")
      .style("fill", "#555");
  };

  const LEGEND_LAYOUT = {
    COMPACT: "compact",
    FULL: "full"
  };

  const COMPACT_LEGEND_Y = 20;
  const COMPACT_LEGEND_HEIGHT = 250;
  const FULL_TRANSFORMS = {
    group1: "translate(0, 20)",
    group4: "translate(0, 235)",
    group3: "translate(0, 455)",
    group2: "translate(0, 725)"
  };

  // 1. Platform Code (形状)
  const legendGroup1 = legendSvg.append("g").attr("transform", `translate(0, ${COMPACT_LEGEND_Y})`);
  legendGroup1
    .append("text")
    .attr("x", width / 2)
    .attr("y", 20)
    .call(legendTitleStyle)
    .text("1. 平台 -> 花瓣形状");

  const shapeGroup = legendGroup1.append("g").attr("transform", `translate(${width / 2}, 70)`);

  const shapeWidth = 120;
  const shapeCount = petalPaths.length;
  const totalShapeWidth = shapeCount * shapeWidth;

  for (let i = 1; i <= shapeCount; i++) {
    const g = shapeGroup
      .append("g")
      .attr("transform", `translate(${(i - 1) * shapeWidth - totalShapeWidth / 2 + shapeWidth / 2}, 0)`);

    g
      .append("path")
      .attr("d", shapeScale(i))
      .attr("fill", "none")
      .attr("stroke", "#605b5bff")
      .attr("stroke-width", 5)
      .attr("transform", "translate(0, 55) rotate(180) scale(0.65)");

    g
      .append("text")
      .attr("y", 88)
      .call(legendTextStyle)
      .text(`Type ${i}`);

    const platforms = platformCodePlatforms?.get?.(String(i)) || "";
    if (platforms) {
      g
        .append("text")
        .attr("y", 110)
        .call(legendTextStyle)
        .text(platforms);
    }
  }

  // 2. Categories (颜色)
  const legendGroup2 = legendSvg.append("g").attr("transform", `translate(0, ${COMPACT_LEGEND_Y})`);
  legendGroup2
    .append("text")
    .attr("x", width / 2)
    .attr("y", 20)
    .call(legendTitleStyle)
    .text("4. 游戏分类 -> 光晕颜色");

  const colorGroup = legendGroup2.append("g").attr("transform", `translate(${width / 2}, 60)`);

  const categoriesList = colorScale.domain();
  const colorItemWidth = 140;
  const itemsPerRow = 5;

  categoriesList.forEach((cat, i) => {
    const row = Math.floor(i / itemsPerRow);
    const col = i % itemsPerRow;
    const lastRow = Math.floor((categoriesList.length - 1) / itemsPerRow);
    const itemsInThisRow = row === lastRow ? categoriesList.length % itemsPerRow || itemsPerRow : itemsPerRow;
    const rowWidth = itemsInThisRow * colorItemWidth;

    const x = col * colorItemWidth - rowWidth / 2 + colorItemWidth / 2;
    const y = row * 70;

    const g = colorGroup.append("g").attr("transform", `translate(${x}, ${y})`);

    g
      .append("circle")
      .attr("r", 22)
      .attr("fill", colorScale(cat))
      .style("mix-blend-mode", "multiply")
      .style("filter", "url(#motionFilter)")
      .attr("opacity", 0.7);

    g
      .append("text")
      .attr("y", 36)
      .call(legendTextStyle)
      .text(cat);
  });

  // 3. Total Comments (大小)
  const legendGroup3 = legendSvg.append("g").attr("transform", `translate(0, ${COMPACT_LEGEND_Y})`);
  legendGroup3
    .append("text")
    .attr("x", width / 2)
    .attr("y", 20)
    .call(legendTitleStyle)
    .text("3. 评论总数 -> 花朵大小");

  const petalNumGroup = legendGroup3.append("g").attr("transform", `translate(${width / 2}, 110)`);

  const sizeWidth = 200;
  const totalSizeWidth = commentSamples.length * sizeWidth;

  commentSamples.forEach((val, i) => {
    const g = petalNumGroup
      .append("g")
      .attr("transform", `translate(${i * sizeWidth - totalSizeWidth / 2 + sizeWidth / 2}, 0)`);

    const scale = sizeScale(val);
    const numPetals = 5;
    const path = petalPaths[3];

    for (let k = 0; k < numPetals; k++) {
      g
        .append("path")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", "#605b5bff")
        .attr("stroke-width", 2 / scale)
        .attr("transform", `rotate(${(360 / numPetals) * k}) scale(${scale})`);
    }

    g.append("circle").attr("r", 3).attr("fill", "#605b5bff");
    g
      .append("text")
      .attr("y", 110)
      .call(legendTextStyle)
      .text(commentLabelFormat(val));
  });

  // 4. Favorable Rate (花瓣数量)
  const legendGroup4 = legendSvg.append("g").attr("transform", `translate(0, ${COMPACT_LEGEND_Y})`);
  legendGroup4
    .append("text")
    .attr("x", width / 2)
    .attr("y", 20)
    .call(legendTitleStyle)
    .text("2. 好评率 -> 花瓣数量");

  const sizeGroup = legendGroup4.append("g").attr("transform", `translate(${width / 2}, 95)`);

  const numWidth = 160;
  const totalNumWidth = rateSamples.length * numWidth;

  rateSamples.forEach((val, i) => {
    const g = sizeGroup
      .append("g")
      .attr("transform", `translate(${i * numWidth - totalNumWidth / 2 + numWidth / 2}, 0)`);

    const numPetals = numPetalScale(val);
    const path = petalPaths[3];

    for (let k = 0; k < numPetals; k++) {
      g
        .append("path")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", "#605b5bff")
        .attr("stroke-width", 4)
        .attr("transform", `rotate(${(360 / numPetals) * k}) scale(0.5)`);
    }

    g
      .append("text")
      .attr("y", 92)
      .call(legendTextStyle)
      .text(`${val.toFixed(1)}%`);
  });

  // --- 紧凑展示阶段：放大图例1/2/4（不改变最终 FULL 的大小） ---
  const wrapLegendGroup = (group) => {
    const node = group.node();
    const children = Array.from(node.childNodes);
    const wrapper = document.createElementNS("http://www.w3.org/2000/svg", "g");
    wrapper.setAttribute("class", "legend-inner");
    node.appendChild(wrapper);
    children.forEach((ch) => wrapper.appendChild(ch));
    return d3.select(wrapper);
  };

  const legendInner1 = wrapLegendGroup(legendGroup1);
  const legendInner2 = wrapLegendGroup(legendGroup2);
  const legendInner3 = wrapLegendGroup(legendGroup3);
  const legendInner4 = wrapLegendGroup(legendGroup4);

  const COMPACT_SCALE = 1.10;
  const applyLegendInnerScale = (layout) => {
    if (layout === LEGEND_LAYOUT.COMPACT) {
      legendInner1.attr("transform", `translate(${width / 2}, 0) scale(${COMPACT_SCALE}) translate(${-width / 2}, 0)`);
      legendInner2.attr("transform", `translate(${width / 2}, 0) scale(${COMPACT_SCALE}) translate(${-width / 2}, 0)`);
      legendInner3.attr("transform", "");
      legendInner4.attr("transform", `translate(${width / 2}, 0) scale(${COMPACT_SCALE}) translate(${-width / 2}, 0)`);
    } else {
      legendInner1.attr("transform", "");
      legendInner2.attr("transform", "");
      legendInner3.attr("transform", "");
      legendInner4.attr("transform", "");
    }
  };

  let compactLegendTransforms = null;

  const computeCompactLegendTransforms = () => {
    applyLegendInnerScale(LEGEND_LAYOUT.COMPACT);

    const targetTop = COMPACT_LEGEND_Y;
    const groups = {
      group1: legendGroup1,
      group2: legendGroup2,
      group3: legendGroup3,
      group4: legendGroup4
    };

    Object.values(groups).forEach((g) => g.attr("transform", "translate(0, 0)"));

    const result = {};
    for (const [key, g] of Object.entries(groups)) {
      const node = g.node();
      let bbox;
      try {
        bbox = node.getBBox();
      } catch {
        bbox = { x: 0, y: 0, width: 0, height: 0 };
      }
      const dy = targetTop - bbox.y;
      result[key] = `translate(0, ${dy})`;
    }
    return result;
  };

  const applyLegendLayout = (layout) => {
    if (layout === LEGEND_LAYOUT.FULL) {
      applyLegendInnerScale(LEGEND_LAYOUT.FULL);
      legendSvg.attr("height", legendHeight);
      legendGroup1.attr("transform", FULL_TRANSFORMS.group1);
      legendGroup2.attr("transform", FULL_TRANSFORMS.group2);
      legendGroup3.attr("transform", FULL_TRANSFORMS.group3);
      legendGroup4.attr("transform", FULL_TRANSFORMS.group4);
    } else {
      applyLegendInnerScale(LEGEND_LAYOUT.COMPACT);
      legendSvg.attr("height", COMPACT_LEGEND_HEIGHT);
      if (!compactLegendTransforms) {
        compactLegendTransforms = computeCompactLegendTransforms();
      }
      legendGroup1.attr("transform", compactLegendTransforms.group1);
      legendGroup2.attr("transform", compactLegendTransforms.group2);
      legendGroup3.attr("transform", compactLegendTransforms.group3);
      legendGroup4.attr("transform", compactLegendTransforms.group4);
    }
  };

  const groups = [legendGroup1, legendGroup2, legendGroup3, legendGroup4];

  const setLegendDisplay = async (display, animate = true) => {
    const targets = new Map();

    if (!display || display.mode === "none") {
      groups.forEach((g) => targets.set(g, 0));
    } else if (display.mode === "all") {
      groups.forEach((g) => targets.set(g, 1));
    } else if (display.mode === "single") {
      groups.forEach((g) => targets.set(g, 0));
      const sel = display.group;
      if (sel) targets.set(sel, 1);
    }

    const OFFSET_Y = 26;
    const DURATION = 420;
    const ease = d3.easeCubicOut;

    const writeBase = (sel) => {
      const base = sel.attr("transform") || "";
      sel.attr("data-base-transform", base);
      return base;
    };

    const getBase = (sel) => sel.attr("data-base-transform") || sel.attr("transform") || "";

    if (!animate) {
      targets.forEach((opacity, sel) => {
        writeBase(sel);
        sel.interrupt();
        sel.style("opacity", opacity);
        sel.attr("transform", getBase(sel));
      });
      return;
    }

    const ends = [];
    targets.forEach((opacity, sel) => {
      const base = writeBase(sel);
      const currentlyVisible = +sel.style("opacity") > 0.001;

      if (opacity === 1) {
        if (!currentlyVisible) {
          sel.interrupt();
          sel.style("opacity", 0);
          sel.attr("transform", `${base} translate(0, ${OFFSET_Y})`);
        }
        const tr = sel
          .transition()
          .duration(DURATION)
          .ease(ease)
          .style("opacity", 1)
          .attr("transform", base);
        ends.push(tr.end());
        return;
      }

      const tr = sel
        .transition()
        .duration(DURATION)
        .ease(ease)
        .style("opacity", 0)
        .attr("transform", `${base} translate(0, ${-OFFSET_Y})`)
        .on("end", function () {
          d3.select(this).attr("transform", base);
        });
      ends.push(tr.end());
    });

    await Promise.allSettled(ends);
  };

  return {
    legendSvg,
    legendHeight,
    COMPACT_LEGEND_HEIGHT,
    LEGEND_LAYOUT,
    legendGroup1,
    legendGroup2,
    legendGroup3,
    legendGroup4,
    applyLegendLayout,
    setLegendDisplay
  };
};

export const createLegendFrameController = ({ container, legend, mainSvg, mainHeight }) => {
  const FINAL_TOP_GAP = 20;
  const getCompactTop = () => legend.COMPACT_LEGEND_HEIGHT;
  const getFinalTop = () => legend.legendHeight + FINAL_TOP_GAP;

  const setCompactFrameInstant = () => {
    legend.applyLegendLayout(legend.LEGEND_LAYOUT.COMPACT);
    mainSvg.style("top", `${getCompactTop()}px`);
    container.style("height", `${getCompactTop() + mainHeight}px`);
    document.body.style.overflow = "hidden";
    legend.legendSvg.style("z-index", "10").raise();
  };

  const setFinalFrameInstant = () => {
    legend.applyLegendLayout(legend.LEGEND_LAYOUT.FULL);
    mainSvg.style("top", `${getFinalTop()}px`);
    container.style("height", `${getFinalTop() + mainHeight}px`);
    document.body.style.overflow = "auto";
    legend.legendSvg.style("z-index", "10").raise();
  };

  const transitionToFinalPresentation = async (animate = true) => {
    legend.applyLegendLayout(legend.LEGEND_LAYOUT.FULL);
    legend.legendSvg.style("z-index", "10").raise();

    const finalTop = getFinalTop();
    const finalHeight = finalTop + mainHeight;

    if (!animate) {
      mainSvg.style("top", `${finalTop}px`);
      container.style("height", `${finalHeight}px`);
      document.body.style.overflow = "auto";
      await legend.setLegendDisplay({ mode: "all" }, false);
      return;
    }

    const t = d3.transition().duration(650).ease(d3.easeCubicInOut);

    const anims = [];
    anims.push(mainSvg.transition(t).style("top", `${finalTop}px`).end());
    anims.push(container.transition(t).style("height", `${finalHeight}px`).end());

    const allGroups = [legend.legendGroup1, legend.legendGroup2, legend.legendGroup3, legend.legendGroup4];
    allGroups.forEach((g) => g.style("opacity", 0));

    anims.push(
      Promise.allSettled([
        legend.legendGroup1.transition(t).style("opacity", 1).end(),
        legend.legendGroup2.transition(t).style("opacity", 1).end(),
        legend.legendGroup3.transition(t).style("opacity", 1).end(),
        legend.legendGroup4.transition(t).style("opacity", 1).end()
      ])
    );

    await Promise.allSettled(anims);
    document.body.style.overflow = "auto";
  };

  return { setCompactFrameInstant, setFinalFrameInstant, transitionToFinalPresentation };
};
