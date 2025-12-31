import * as d3 from "d3";

export const createMainSvg = ({ container, width, height }) => {
  return container
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("position", "absolute")
    .style("top", "0px")
    .style("left", "50%")
    .style("transform", "translateX(-50%)")
    .style("z-index", "1");
};

export const createFlowerGrid = ({
  mainSvg,
  games,
  width,
  cols,
  flowerSize,
  rowGap = 80,
  isWukong,
  WUKONG_Y_SHIFT,
  WUKONG_LABEL_Y_SHIFT
}) => {
  const flowers = mainSvg
    .selectAll("g.flower")
    .data(games)
    .enter()
    .append("g")
    .attr("class", "flower")
    .attr("transform", (d, i) => {
      const x = (i % cols) * (width / cols) + width / cols / 2;
      const yBase = Math.floor(i / cols) * (flowerSize + rowGap) + 85;
      const y = yBase + (isWukong(d) ? WUKONG_Y_SHIFT : 0);
      return `translate(${x}, ${y})`;
    })
    .style("opacity", 0);

  flowers.append("g").attr("class", "halo-layer");
  flowers.append("g").attr("class", "petal-layer");
  const labelLayer = flowers.append("g").attr("class", "label-layer").style("opacity", 0);

  labelLayer
    .append("text")
    .attr("y", (d) => 110 + (isWukong(d) ? WUKONG_LABEL_Y_SHIFT : 0))
    .attr("text-anchor", "middle")
    .style("font-family", "sans-serif")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .style("fill", "#333")
    .text((d) => (d.name.length > 15 ? d.name.substring(0, 15) + "..." : d.name));

  labelLayer
    .append("text")
    .attr("y", (d) => 130 + (isWukong(d) ? WUKONG_LABEL_Y_SHIFT : 0))
    .attr("text-anchor", "middle")
    .style("font-family", "sans-serif")
    .style("font-size", "13px")
    .style("fill", "#666")
    .text((d) => {
      const comments = d3.format(",")(d.totalComments ?? 0);
      return `平台编码: ${d.platformCode} ｜ 评论数: ${comments}`;
    });

  labelLayer
    .append("text")
    .attr("y", (d) => 146+ (isWukong(d) ? WUKONG_LABEL_Y_SHIFT : 0))
    .attr("text-anchor", "middle")
    .style("font-family", "sans-serif")
    .style("font-size", "14px")
    .style("fill", "#666")
    .text((d) => {
      const rate = Number.isFinite(d.favorableRate) ? d.favorableRate.toFixed(2) : String(d.favorableRate ?? "");
      return `好评率: ${rate}%`;
    });

  return { flowers, labelLayer };
};

export const computeHaloLayout = (categories, scale) => {
  const list = Array.isArray(categories) ? categories : [];
  return list.map((cat, i) => {
    let angle;
    if (list.length === 1) {
      angle = 0;
    } else if (list.length === 3) {
      angle = (i / list.length) * 2 * Math.PI + Math.PI / 2;
    } else {
      angle = (i / list.length) * 2 * Math.PI - Math.PI / 2;
    }

    const offset = list.length === 1 ? 0 : 35 * scale;
    const cx = Math.cos(angle) * offset;
    const cy = Math.sin(angle) * offset;
    const r = 65 * scale;
    return { cat, cx, cy, r };
  });
};

export const updateHalos = ({ flowers, colorScale, scaleFn }, { animate = true, reveal = true } = {}) => {
  const transitions = [];
  flowers.each(function (d) {
    const g = d3.select(this);
    const haloLayer = g.select(".halo-layer");
    const scale = scaleFn(d);
    const data = computeHaloLayout(d.categories, scale);

    const sel = haloLayer.selectAll("circle.halo").data(data, (h) => h.cat);

    const enter = sel
      .enter()
      .append("circle")
      .attr("class", "halo")
      .attr("cx", (h) => h.cx)
      .attr("cy", (h) => h.cy)
      .attr("r", reveal ? 0 : (h) => h.r)
      .attr("fill", (h) => colorScale(h.cat))
      .style("mix-blend-mode", "multiply")
      .style("filter", "url(#motionFilter)")
      .attr("opacity", reveal ? 0 : 0.6);

    const merged = sel.merge(enter);

    if (animate) {
      const tr = merged
        .transition()
        .duration(700)
        .attr("cx", (h) => h.cx)
        .attr("cy", (h) => h.cy)
        .attr("r", (h) => h.r)
        .attr("opacity", 0.6);
      transitions.push(tr.end());
    } else {
      merged
        .attr("cx", (h) => h.cx)
        .attr("cy", (h) => h.cy)
        .attr("r", (h) => h.r)
        .attr("opacity", 0.6);
    }

    if (animate) {
      const trExit = sel.exit().transition().duration(350).attr("opacity", 0).remove();
      transitions.push(trExit.end());
    } else {
      sel.exit().remove();
    }
  });

  return Promise.allSettled(transitions);
};

const animateStrokeDraw = (pathSel, duration = 850, delay = 0) => {
  pathSel.each(function () {
    const el = this;
    let len = 0;
    try {
      len = el.getTotalLength();
    } catch {
      len = 0;
    }
    const s = d3.select(el);
    if (len > 0) {
      s.attr("stroke-dasharray", `${len} ${len}`).attr("stroke-dashoffset", len);
    }
  });

  const t = pathSel
    .transition()
    .delay(delay)
    .duration(duration)
    .ease(d3.easeCubicOut)
    .attr("stroke-dashoffset", 0);
  return t.end();
};

export const updatePetals = ({ flowers, shapeScale, numPetalsFn, scaleFn }, { animate = true, revealDraw = false } = {}) => {
  const transitions = [];

  flowers.each(function (d) {
    const g = d3.select(this);
    const petalLayer = g.select(".petal-layer");

    const numPetals = Math.max(1, Math.floor(numPetalsFn(d)));
    const path = shapeScale(d.platformCode);
    const scale = scaleFn(d);

    const data = d3.range(numPetals).map((i) => ({ i, rot: (360 / numPetals) * i }));

    const sel = petalLayer.selectAll("path.petal").data(data, (p) => p.i);

    const enter = sel
      .enter()
      .append("path")
      .attr("class", "petal")
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "#605b5bff")
      .attr("stroke-width", 2.5 / scale)
      .attr("opacity", 1)
      .attr("transform", (p) => `rotate(${p.rot}) scale(${scale})`);

    const merged = sel.merge(enter).attr("d", path);

    if (animate) {
      const tr = merged
        .transition()
        .duration(700)
        .ease(d3.easeCubicOut)
        .attr("stroke-width", 2.5 / scale)
        .attr("transform", (p) => `rotate(${p.rot}) scale(${scale})`);
      transitions.push(tr.end());

      if (revealDraw) {
        transitions.push(animateStrokeDraw(enter, 900, 0));
      }
    } else {
      merged
        .attr("stroke-width", 2.5 / scale)
        .attr("transform", (p) => `rotate(${p.rot}) scale(${scale})`);
    }

    if (animate) {
      const trExit = sel.exit().transition().duration(400).attr("opacity", 0).remove();
      transitions.push(trExit.end());
    } else {
      sel.exit().remove();
    }
  });

  return Promise.allSettled(transitions);
};

export const showFlowers = (flowers, animate = true) => {
  if (animate) {
    return flowers.transition().duration(450).style("opacity", 1).end();
  }
  flowers.style("opacity", 1);
  return Promise.resolve();
};

export const hideFlowers = ({ flowers, labelLayer }) => {
  flowers.style("opacity", 0);
  flowers.selectAll(".halo-layer > *").remove();
  flowers.selectAll(".petal-layer > *").remove();
  labelLayer.style("opacity", 0);
};

export const removeHalos = (flowers, animate = true) => {
  const transitions = [];
  flowers.each(function () {
    const haloLayer = d3.select(this).select(".halo-layer");
    const sel = haloLayer.selectAll("circle.halo");
    if (animate) {
      const tr = sel.transition().duration(400).attr("opacity", 0).attr("r", 0).remove();
      transitions.push(tr.end());
    } else {
      sel.remove();
    }
  });
  return Promise.allSettled(transitions);
};

export const setLabelsVisible = async (labelLayer, visible, animate = true) => {
  if (animate) {
    await labelLayer.transition().duration(400).style("opacity", visible ? 1 : 0).end();
  } else {
    labelLayer.style("opacity", visible ? 1 : 0);
  }
};
