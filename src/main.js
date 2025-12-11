/* 初始化一个空的 D3 图表画布 */
(function initChart() {
    const container = document.getElementById('chart');
    if (!container) return;

    // 创建 SVG（响应式填充容器）
    const svg = d3.select(container)
        .append('svg')
        .attr('viewBox', `0 0 ${container.clientWidth} ${container.clientHeight}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');

    // 背景占位文本，提示可开始绘制
    svg.append('text')
        .attr('x', container.clientWidth / 2)
        .attr('y', container.clientHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#94a3b8')
        .style('font-size', '16px')
        .text('在此处使用 D3.js 绘制你的图表');

    // 简单的自适应：窗口大小变化时更新 viewBox
    window.addEventListener('resize', () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        svg.attr('viewBox', `0 0 ${w} ${h}`);
    });
})();
