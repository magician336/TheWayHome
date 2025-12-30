import FractalTree from './tree.js';

// 1. 基于 revenue.csv 的真实数据
const marketData = [
    { year: 2017, num_games: 150, actual_revenue: 1.31, growth_rate: 114.3 },
    { year: 2018, num_games: 180, actual_revenue: 4.20, growth_rate: 180.0 },
    { year: 2019, num_games: 500, actual_revenue: 4.50, growth_rate: 7.1 },
    { year: 2020, num_games: 600, actual_revenue: 6.40, growth_rate: 42.2 },
    { year: 2021, num_games: 650, actual_revenue: 27.90, growth_rate: 335.9 },
    { year: 2022, num_games: 800, actual_revenue: 47.50, growth_rate: 70.3 },
    { year: 2023, num_games: 1200, actual_revenue: 75.80, growth_rate: 59.6 },
    { year: 2024, num_games: 1600, actual_revenue: 102.20, growth_rate: 28.0 }
];

const canvas = document.getElementById('treeCanvas');
const inputsDiv = document.getElementById('inputs');
const yearSelect = document.getElementById('yearSelect');
const animateBtn = document.getElementById('animateBtn');
const recordBtn = document.getElementById('recordBtn');

// 初始化树
const tree = new FractalTree(canvas);

// 2. 动态生成年份选择框
marketData.forEach(data => {
    const option = document.createElement('option');
    option.value = data.year;
    option.textContent = `${data.year}年`;
    yearSelect.appendChild(option);
});

// 3. 监听年份切换
yearSelect.addEventListener('change', (e) => {
    const selectedYear = parseInt(e.target.value);
    const data = marketData.find(d => d.year === selectedYear);

    if (data) {
        // 使用 3 秒平滑过渡到该年份的市场特征
        tree.transitionToMarketData(data, 3000);
    }
});

// 4. 同步滑块位置的函数
function syncSliders(config) {
    Object.keys(config).forEach(key => {
        const input = document.querySelector(`input[data-key="${key}"]`);
        const display = document.getElementById(`val-${key}`);
        if (input && display) {
            input.value = config[key];
            display.innerText = typeof config[key] === 'number' ? config[key].toFixed(4) : config[key];
        }
    });
}

// 5. 原有的 UI 控制逻辑（微调：添加 data-key 方便同步）
const params = [
    { key: 'maxDepth', label: '生长深度', min: 0, max: 20, step: 1 },
    { key: 'scale', label: '尺寸比例', min: 0, max: 200, step: 1 },
    { key: 'lineWidth', label: '初始线宽', min: 0, max: 30, step: 1 },
    { key: 'branchiness', label: '分叉率', min: 0, max: 0.5, step: 0.001 },
    { key: 'upAmount', label: '向上趋势', min: 0, max: 0.1, step: 0.0001 }
];

params.forEach(p => {
    const group = document.createElement('div');
    group.className = 'control-group';
    group.innerHTML = `
        <label>${p.label} <span class="value-display" id="val-${p.key}">${tree.config[p.key]}</span></label>
        <input type="range" data-key="${p.key}" min="${p.min}" max="${p.max}" step="${p.step}" value="${tree.config[p.key]}">
    `;

    const input = group.querySelector('input');
    input.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        document.getElementById(`val-${p.key}`).innerText = val;
        tree.updateConfig({ [p.key]: val });
        tree.draw();
    });
    inputsDiv.appendChild(group);
});

// 初始：播放最新一年的数据
yearSelect.value = 2017;
yearSelect.dispatchEvent(new Event('change'));

// 下载功能
document.getElementById('downloadBtn').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'fractal-tree.png';
    link.href = canvas.toDataURL();
    link.click();
});

/**
 * 播放动画的函数
 */
function playGrowAnimation() {
    // 禁用按钮防止重复点击
    animateBtn.disabled = true;
    animateBtn.innerText = "生长中...";

    // 调用 tree.js 提供的动画接口
    // 参数 40 表示每层分支生成的间隔毫秒
    tree.drawAnimated(40).then(() => {
        animateBtn.disabled = false;
        animateBtn.innerText = "播放生长动画";
    });
}

// 绑定事件
animateBtn.addEventListener('click', playGrowAnimation);

recordBtn.addEventListener('click', async () => {
    recordBtn.disabled = true;
    recordBtn.innerText = "准备环境中...";

    try {
        // 1. 解决跨域 Worker 问题
        const resp = await fetch('/public/gif.min.js');
        const script = await resp.text();
        const workerUrl = URL.createObjectURL(new Blob([script], { type: 'application/javascript' }));

        // main.js 中的配置
        const gif = new GIF({
            workers: 4,
            quality: 10,
            width: canvas.width,
            height: canvas.height,
            // 路径指向 /gif.worker.js，Vite 会自动从 public 目录查找
            workerScript: '/gif.worker.js',
            background: '#ffffff'
        });

        // 2. 按年份顺序循环演化
        for (let i = 0; i < marketData.length; i++) {
            const currentYearData = marketData[i];

            await new Promise(resolve => {
                tree.transitionToMarketData(currentYearData, 1500, () => {
                    const ctx = canvas.getContext('2d');

                    // 1. 强制在最底层补充白色背景
                    ctx.save();
                    ctx.globalCompositeOperation = 'destination-over';
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.restore();

                    // 2. 优化图例：白底深字
                    ctx.save();
                    // 绘制图例半透明背景块
                    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
                    ctx.fillRect(20, 20, 200, 100);

                    // 年份
                    ctx.fillStyle = "#2C3E50";
                    ctx.font = "bold 28px Arial";
                    ctx.fillText(`${currentYearData.year}`, 35, 55);

                    // 销售额数据
                    ctx.font = "16px Arial";
                    ctx.fillStyle = "#34495E";
                    ctx.fillText(`销售额: ${currentYearData.actual_revenue} 亿元`, 35, 85);

                    // 增长率数据
                    ctx.fillStyle = currentYearData.growth_rate >= 0 ? "#E74C3C" : "#2980B9";
                    ctx.fillText(`增长率: ${currentYearData.growth_rate}%`, 35, 110);
                    ctx.restore();

                    gif.addFrame(canvas, { copy: true, delay: 33 });
                });
                setTimeout(resolve, 1600);
            });

            // 年度停留帧
            for (let f = 0; f < 10; f++) gif.addFrame(canvas, { copy: true, delay: 100 });
        }

        recordBtn.innerText = "正在合成 GIF (可能需要数十秒)...";

        gif.on('finished', (blob) => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `china-indie-game-market-history.gif`;
            link.click();

            recordBtn.disabled = false;
            recordBtn.innerText = "录制 2017-2024 全纪录 (.gif)";
            URL.revokeObjectURL(workerUrl);
        });

        gif.render();

    } catch (err) {
        console.error("录制失败:", err);
        recordBtn.disabled = false;
        recordBtn.innerText = "录制失败，请重试";
    }
});

// 如果希望页面一加载就自动播放
// window.addEventListener('load', playGrowAnimation);