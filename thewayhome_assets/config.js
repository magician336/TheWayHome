const GlobalVizConfig = {
    // 统一调色板
    theme: {
        background: "#ffffff",
        textMain: "#1e293b",
        accent: "#0ea5e9",
        gridColor: "#e2e8f0",
        categorical: ["#4e79a7", "#f28e2c", "#e15759", "#76b7b2", "#59a14f",
            "#edc949", "#af7aa1", "#ff9da7", "#9c755f", "#bab0ab",
            "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd"],
        // 连续色谱工具
        sequential: typeof d3 !== 'undefined' ? d3.interpolateTurbo : null
    },

    // 统一布局参数
    layout: {
        margin: { top: 60, right: 80, bottom: 60, left: 60 },
        transitionDuration: 750
    },

    setupTooltip: () => {
        if (typeof d3 === 'undefined') return null;
        let tip = d3.select("#shared-tooltip");
        if (tip.empty()) {
            tip = d3.select("body").append("div").attr("id", "shared-tooltip").attr("class", "viz-tooltip").style("opacity", 0);
        }
        return tip;
    },

    addBlurFilter: (svg) => {
        if (typeof d3 === 'undefined') return null;
        const defs = svg.append("defs");
        const filter = defs.append("filter").attr("id", "shared-motion-filter")
            .attr("x", "-100%").attr("y", "-100%").attr("width", "300%").attr("height", "300%");
        filter.append("feGaussianBlur").attr("in", "SourceGraphic").attr("stdDeviation", "4.5");
        return "url(#shared-motion-filter)";
    },

    // 3. 统一工具函数
    utils: {
        createResponsiveSvg: (selector, width, height, className = "") => {
            if (typeof d3 === 'undefined') return null;
            return d3.select(selector)
                .append("svg")
                .attr("viewBox", `0 0 ${width} ${height}`)
                .attr("preserveAspectRatio", "xMidYMid meet")
                .attr("class", `shared-viz-svg ${className}`);
        }
    }
};

// 显式导出供 ES Module 使用
export { GlobalVizConfig };

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GlobalVizConfig };
} else {
    window.GlobalVizConfig = GlobalVizConfig;
}
