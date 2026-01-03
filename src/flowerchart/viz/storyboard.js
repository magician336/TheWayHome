import * as d3 from "d3";
import { hideFlowers, removeHalos, setLabelsVisible, showFlowers, updateHalos, updatePetals } from "./flowers.js";

export const createStoryboard = ({
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
  BASE_SCALE,
  WHEEL_COOLDOWN_MS = 150,
  onStateChange // 新增回调
}) => {
  const STATE = {
    TITLE: -1,
    INTRO_LEGEND: 0,
    INTRO_DRAWN: 1,

    COUNT_LEGEND: 2,
    COUNT_DRAWN: 3,

    SIZE_LEGEND: 4,
    SIZE_DRAWN: 5,

    COLOR_LEGEND: 6,
    COLOR_DRAWN: 7,

    FINAL: 8
  };

  let currentState = STATE.TITLE;
  let isAnimating = false;

  const setTitleInFlow = (inFlow) => {
    d3.select("#main-title").classed("in-flow", !!inFlow);
  };

  // 初始化：标题放大，图例隐藏
  d3.select("#main-title").classed("initial", true);
  setTitleInFlow(false);
  legend.setLegendDisplay({ mode: "none" }, false);

  const legendForState = (state) => {
    switch (state) {
      case STATE.INTRO_LEGEND:
        return legend.legendGroup1;
      case STATE.COUNT_LEGEND:
        return legend.legendGroup4;
      case STATE.SIZE_LEGEND:
        return legend.legendGroup3;
      case STATE.COLOR_LEGEND:
        return legend.legendGroup2;
      default:
        return null;
    }
  };

  const showLegendForState = async (state, animate = true) => {
    if (state === STATE.FINAL) {
      frame.setFinalFrameInstant();
      setTitleInFlow(true);
      await legend.setLegendDisplay({ mode: "all" }, animate);
      return;
    }

    frame.setCompactFrameInstant();
    setTitleInFlow(false);

    const group = legendForState(state);
    if (group) {
      await legend.setLegendDisplay({ mode: "single", group }, animate);
    } else {
      await legend.setLegendDisplay({ mode: "none" }, animate);
    }
  };

  const transitionToFinal = async () => {
    await frame.transitionToFinalPresentation(true);
    await legend.setLegendDisplay({ mode: "all" }, false);
    setTitleInFlow(true);
    if (onStateChange) onStateChange(STATE.FINAL); // 通知状态变更
  };

  const goForward = async () => {
    switch (currentState) {
      case STATE.TITLE: {
        // 标题缩小上移
        d3.select("#main-title").classed("initial", false);
        // 同时出现图例一
        await showLegendForState(STATE.INTRO_LEGEND, true);
        currentState = STATE.INTRO_LEGEND;
        break;
      }
      case STATE.INTRO_LEGEND: {
        // 现在：先绘制（图例保持可见），下一次滚动再切走图例
        await showFlowers(flowers, true);
        await Promise.allSettled([
          updatePetals({ flowers, shapeScale, numPetalsFn: () => 1, scaleFn: () => BASE_SCALE }, { animate: true, revealDraw: true }),
          setLabelsVisible(labelLayer, true, true)
        ]);
        currentState = STATE.INTRO_DRAWN;
        break;
      }
      case STATE.INTRO_DRAWN: {
        // 下一次滚动：切换到“数量图例”（此时平台图例才消失）
        await legend.setLegendDisplay({ mode: "none" }, true);
        await showLegendForState(STATE.COUNT_LEGEND, true);
        currentState = STATE.COUNT_LEGEND;
        break;
      }
      case STATE.COUNT_LEGEND: {
        // 先绘制（数量图例保持可见）
        await updatePetals(
          { flowers, shapeScale, numPetalsFn: (d) => numPetalScale(d.favorableRate), scaleFn: () => BASE_SCALE },
          { animate: true, revealDraw: true }
        );
        currentState = STATE.COUNT_DRAWN;
        break;
      }
      case STATE.COUNT_DRAWN: {
        // 下一次滚动：切换到“大小图例”（数量图例才消失）
        await legend.setLegendDisplay({ mode: "none" }, true);
        await showLegendForState(STATE.SIZE_LEGEND, true);
        currentState = STATE.SIZE_LEGEND;
        break;
      }
      case STATE.SIZE_LEGEND: {
        // 先绘制（大小图例保持可见）
        await updatePetals(
          { flowers, shapeScale, numPetalsFn: (d) => numPetalScale(d.favorableRate), scaleFn: (d) => getFlowerScale(d) },
          { animate: true, revealDraw: false }
        );
        currentState = STATE.SIZE_DRAWN;
        break;
      }
      case STATE.SIZE_DRAWN: {
        // 下一次滚动：切换到“颜色图例”（大小图例才消失）
        await legend.setLegendDisplay({ mode: "none" }, true);
        await showLegendForState(STATE.COLOR_LEGEND, true);
        currentState = STATE.COLOR_LEGEND;
        break;
      }
      case STATE.COLOR_LEGEND: {
        // 先绘制（颜色图例保持可见）
        await updateHalos({ flowers, colorScale, scaleFn: (d) => getFlowerScale(d) }, { animate: true, reveal: true });
        currentState = STATE.COLOR_DRAWN;
        break;
      }
      case STATE.COLOR_DRAWN: {
        // 下一次滚动：颜色图例消失，然后进入最终态（全图例淡入）
        await legend.setLegendDisplay({ mode: "none" }, true);
        await transitionToFinal();
        currentState = STATE.FINAL;
        if (onStateChange) onStateChange(STATE.FINAL);
        break;
      }
      case STATE.FINAL:
      default:
        break;
    }
  };

  const goBackward = async () => {
    switch (currentState) {
      case STATE.FINAL: {
        frame.setCompactFrameInstant();
        setTitleInFlow(false);
        // 回到“颜色已绘制”（只显示颜色图例）
        await legend.setLegendDisplay({ mode: "single", group: legend.legendGroup2 }, true);
        currentState = STATE.COLOR_DRAWN;
        if (onStateChange) onStateChange(STATE.COLOR_DRAWN);
        break;
      }
      case STATE.COLOR_DRAWN: {
        // 回到“颜色图例”阶段：撤销光晕，但图例保持可见
        await removeHalos(flowers, true);
        await showLegendForState(STATE.COLOR_LEGEND, true);
        currentState = STATE.COLOR_LEGEND;
        break;
      }
      case STATE.COLOR_LEGEND: {
        // 从“颜色图例”回退：切回“大小已绘制”（此时大小图例应可见）
        await legend.setLegendDisplay({ mode: "none" }, true);
        await showLegendForState(STATE.SIZE_LEGEND, true);
        currentState = STATE.SIZE_DRAWN;
        break;
      }
      case STATE.SIZE_DRAWN: {
        // 回到“大小图例”阶段：撤销大小变化（回到 BASE_SCALE），图例保持可见
        await updatePetals(
          { flowers, shapeScale, numPetalsFn: (d) => numPetalScale(d.favorableRate), scaleFn: () => BASE_SCALE },
          { animate: true, revealDraw: false }
        );
        await showLegendForState(STATE.SIZE_LEGEND, true);
        currentState = STATE.SIZE_LEGEND;
        break;
      }
      case STATE.SIZE_LEGEND: {
        // 从“大小图例”回退：切回“数量已绘制”（数量图例应可见）
        await legend.setLegendDisplay({ mode: "none" }, true);
        await showLegendForState(STATE.COUNT_LEGEND, true);
        currentState = STATE.COUNT_DRAWN;
        break;
      }
      case STATE.COUNT_DRAWN: {
        // 回到“数量图例”阶段：撤销数量变化（回到 1 瓣），图例保持可见
        await updatePetals({ flowers, shapeScale, numPetalsFn: () => 1, scaleFn: () => BASE_SCALE }, { animate: true, revealDraw: false });
        await showLegendForState(STATE.COUNT_LEGEND, true);
        currentState = STATE.COUNT_LEGEND;
        break;
      }
      case STATE.COUNT_LEGEND: {
        // 从“数量图例”回退：切回“平台已绘制”（平台图例应可见）
        await legend.setLegendDisplay({ mode: "none" }, true);
        await showLegendForState(STATE.INTRO_LEGEND, true);
        currentState = STATE.INTRO_DRAWN;
        break;
      }
      case STATE.INTRO_DRAWN: {
        // 回到初始：隐藏主图与标签，但平台图例保持可见
        await setLabelsVisible(labelLayer, false, true);
        await flowers.transition().duration(400).style("opacity", 0).end();
        flowers.selectAll(".halo-layer > *").remove();
        flowers.selectAll(".petal-layer > *").remove();
        await showLegendForState(STATE.INTRO_LEGEND, true);
        currentState = STATE.INTRO_LEGEND;
        break;
      }
      case STATE.INTRO_LEGEND: {
        // 回到标题页：标题放大，隐藏图例
        d3.select("#main-title").classed("initial", true);
        setTitleInFlow(false);
        await legend.setLegendDisplay({ mode: "none" }, true);
        currentState = STATE.TITLE;
        break;
      }
      case STATE.TITLE:
      default:
        break;
    }
  };



  const init = async () => {
    // 初始化状态：标题放大，图例隐藏，花朵隐藏
    frame.setCompactFrameInstant();
    await legend.setLegendDisplay({ mode: "none" }, false);
    d3.select("#main-title").classed("initial", true);
    hideFlowers({ flowers, labelLayer });
    
    // 监听父页面消息
    window.addEventListener('message', (event) => {
        const data = event.data;
        if (!data || typeof data !== 'object') return;

        if (data.type === 'step-forward') {
            if (!isAnimating) goForward();
        }
        if (data.type === 'step-backward') {
            if (!isAnimating) goBackward();
        }
    });
  };

  return { init, getState: () => currentState };
};
