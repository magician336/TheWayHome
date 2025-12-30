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

// main.js 中的 recordBtn 逻辑替换如下：
recordBtn.addEventListener('click', async () => {
    recordBtn.disabled = true;

    // 映射逻辑（统一定义，方便复用）
    const getTargetConfig = (d) => ({
        scale: tree._mapRange(Math.sqrt(d.actual_revenue), Math.sqrt(1.3), Math.sqrt(105), 40, 115),
        upAmount: tree._mapRange(Math.max(-30, Math.min(d.growth_rate, 150)), -30, 150, 0, 0.022),
        branchiness: tree._mapRange(Math.log10(d.num_games), Math.log10(150), Math.log10(1800), 0.035, 0.095)
    });

    const lerp = (a, b, t) => a + (b - a) * (1 - Math.pow(1 - t, 3));

    // 在 main.js 中找到 recordSegment 函数并修改如下部分：
    const recordSegment = async (startData, endData) => {
        return new Promise((resolve) => {
            // 修改点 1：强制 30 FPS，确保录制器持续监听
            const stream = canvas.captureStream(30);
            const recorder = new MediaRecorder(stream, {
                mimeType: 'video/webm; codecs=vp9'
            });
            const chunks = [];

            const startConf = getTargetConfig(startData);
            const endConf = getTargetConfig(endData);

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                const name = `tree_${startData.year.toString().slice(-2)}-${endData.year.toString().slice(-2)}`;
                link.download = `${name}.webm`;
                link.href = url;
                link.click();
                resolve();
            };

            recorder.start();

            let progress = 0;
            // 修改点 2：减小步长。0.01 表示 100 帧，在 30FPS 下约为 3.3 秒
            const step = 0.01;

            const renderFrame = () => {
                if (progress <= 1) {
                    tree.config.scale = lerp(startConf.scale, endConf.scale, progress);
                    tree.config.upAmount = lerp(startConf.upAmount, endConf.upAmount, progress);
                    tree.config.branchiness = lerp(startConf.branchiness, endConf.branchiness, progress);

                    tree.draw();
                    progress += step;
                    // 使用 requestAnimationFrame 确保录制器能抓到每一帧
                    requestAnimationFrame(renderFrame);
                } else {
                    // 停留 1 秒确保结尾完整
                    setTimeout(() => {
                        recorder.stop();
                    }, 1000);
                }
            };

            requestAnimationFrame(renderFrame);
        });
    };

    try {
        for (let i = 0; i < marketData.length - 1; i++) {
            recordBtn.innerText = `正在导出 ${marketData[i].year}-${marketData[i + 1].year}...`;
            await recordSegment(marketData[i], marketData[i + 1]);
            // 增加等待时间，防止浏览器因并发下载过多而崩溃
            await new Promise(r => setTimeout(r, 1500));
        }
        recordBtn.innerText = "全部导出完成";
    } catch (err) {
        console.error(err);
        recordBtn.innerText = "导出出错";
    } finally {
        recordBtn.disabled = false;
    }
});

const scrollVideo = document.getElementById('scrollVideo');
const scrollSection = document.getElementById('scroll-display-section');

// 1. 初始化视频状态
scrollVideo.addEventListener('loadedmetadata', () => {
    // 确保视频暂停，防止自动播放干扰
    scrollVideo.pause();
    // 初始化时间到 0
    scrollVideo.currentTime = 0;
    console.log("视频加载完成，时长:", scrollVideo.duration);
});

// 2. 滚动监听
let isTicking = false;
window.addEventListener('scroll', () => {
    if (!isTicking) {
        window.requestAnimationFrame(() => {
            // 获取视频区域相对于视口的位置
            const sectionRect = scrollSection.getBoundingClientRect();
            // 计算该区域的总滚动行程 = 区域高度 - 视口高度
            const scrollDistance = scrollSection.offsetHeight - window.innerHeight;

            // 只有当视频区域进入视口时才计算
            // sectionRect.top <= 0 表示区域顶部已经到达或滚过视口顶部
            // sectionRect.bottom >= 0 表示区域底部还没滚出视口
            if (sectionRect.top <= 0 && sectionRect.bottom >= 0) {

                // 计算进度：已滚动的距离 / 总行程
                // sectionRect.top 是负数，取反即为已滚过的距离
                let progress = -sectionRect.top / scrollDistance;

                // 限制在 0 到 1 之间
                progress = Math.max(0, Math.min(1, progress));

                // 如果视频元数据已加载，更新时间
                if (scrollVideo.duration) {
                    // 使用 toFixed(3) 避免过度精确导致微小的抖动
                    const targetTime = progress * scrollVideo.duration;

                    // 只有当时间变化超过 0.05秒时才更新，优化性能
                    if (Math.abs(scrollVideo.currentTime - targetTime) > 0.05) {
                        scrollVideo.currentTime = targetTime;
                    }
                }
            } else if (sectionRect.top > 0) {
                // 如果还在上面没滚下来，重置为 0
                scrollVideo.currentTime = 0;
            } else if (sectionRect.bottom < 0) {
                // 如果已经滚过去了，定格在最后
                scrollVideo.currentTime = scrollVideo.duration;
            }

            isTicking = false;
        });
        isTicking = true;
    }
});


// 如果希望页面一加载就自动播放
// window.addEventListener('load', playGrowAnimation);