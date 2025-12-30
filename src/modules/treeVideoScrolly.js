// src/modules/treeVideoScrolly.js

export class TreeVideoScrolly {
    constructor(config) {
        this.video = document.querySelector(config.videoSelector);
        if (!this.video) {
            console.error("TreeVideoScrolly: 找不到视频元素", config.videoSelector);
            return;
        }

        this.container = document.querySelector(config.containerSelector);
        this.chartController = config.chartController;
        this.data = config.data; // 年份数据

        this.currentYear = null;
        this.videoDuration = 0;

        // 年份文案配置
        this.storyText = {
            "2017": "<b>萌芽期</b><br>独立游戏开始进入大众视野，星星之火已在燎原。",
            "2018": "<b>探索期</b><br>《太吾绘卷》等爆款的出现，证明了玩法创新的巨大潜力。",
            "2019": "<b>沉淀期</b><br>市场回归理性，开发者们潜心打磨，根基扎得更深了。",
            "2020": "<b>爆发前夜</b><br>疫情期间居家娱乐需求激增，为数字化分发提供了天然温床。",
            "2021": "<b>黄金时代</b><br>《戴森球计划》《鬼谷八荒》横空出世，国产独立游戏在全球放异彩。",
            "2022": "<b>调整期</b><br>版号政策与市场竞争的双重压力下，优胜劣汰加速。",
            "2023": "<b>回暖期</b><br>随着版号常态化，积压的项目陆续释放，市场信心恢复。",
            "2024": "<b>新高峰</b><br>《黑神话：悟空》等现象级作品带动了产业链升级。"
        };

        this.init();
    }

    init() {
        // 等待视频元数据加载，获取时长
        if (this.video.readyState >= 1) {
            this.videoDuration = this.video.duration;
            this.setupScrollListener();
        } else {
            this.video.addEventListener('loadedmetadata', () => {
                this.videoDuration = this.video.duration;
                this.setupScrollListener();
            });
        }

        // 窗口大小改变时重新计算滚动进度
        window.addEventListener('resize', () => {
            this.handleScroll();
        });
    }

    setupScrollListener() {
        console.log("TreeVideoScrolly: 视频就绪，时长", this.videoDuration, "s");

        // 初始执行一次
        this.handleScroll();

        // 监听滚动
        window.addEventListener('scroll', () => {
            // 使用 requestAnimationFrame 确保视频更新与屏幕刷新同步，极其丝滑
            requestAnimationFrame(() => this.handleScroll());
        });
    }

    handleScroll() {
        if (!this.container || !this.videoDuration) return;

        const rect = this.container.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        // 计算滚动进度 (0 到 1)
        // 进度 0: 容器顶部刚进入视口顶部
        // 进度 1: 容器底部刚离开视口底部 (完全滚完)
        // 我们利用容器的高度差来做控制器
        const totalDistance = rect.height - viewportHeight;
        let progress = -rect.top / totalDistance;

        // 限制进度在 0-1 之间
        progress = Math.max(0, Math.min(1, progress));

        // --- 核心逻辑：初始锁定 2017 ---
        // 假设我们有 8 个年份 (2017-2024)
        // 我们希望第 1 个年份 (2017) 保持视频静止在第 0 秒
        // 后面 7 个年份 (2018-2024) 播放视频

        const staticSegment = 1 / 8; // 0.125 (12.5% 的滚动行程)

        if (progress <= staticSegment) {
            // 在前 1/8 的区域，强制视频时间为 0 (静止在第一帧)
            this.video.currentTime = 0;
        } else {
            // 超过 1/8 后，将剩余的进度 (0.125 - 1.0) 映射为 (0 - 1) 的播放进度
            const playProgress = (progress - staticSegment) / (1 - staticSegment);

            // 计算目标时间
            const targetTime = playProgress * this.videoDuration;

            // 设置视频时间
            // 加一个微小的阈值判断，避免重复设置
            if (Math.abs(this.video.currentTime - targetTime) > 0.05) {
                this.video.currentTime = targetTime;
            }
        }

        // --- 同步年份文字与图表高亮 ---
        this.syncData(progress);
    }

    syncData(progress) {
        if (!this.data || this.data.length === 0) return;

        // 简单映射：进度对应年份数组索引
        // 0.00 - 0.125 -> Index 0 (2017)
        // 0.125 - 0.25 -> Index 1 (2018) ...
        const index = Math.floor(progress * this.data.length);
        const safeIndex = Math.max(0, Math.min(index, this.data.length - 1));

        const targetData = this.data[safeIndex];
        const targetYear = targetData.year;

        if (this.currentYear !== targetYear) {
            this.currentYear = targetYear;

            // A. 更新左侧大字
            const titleEl = document.getElementById('tree-year-title');
            const descEl = document.getElementById('tree-year-desc');

            if (titleEl) titleEl.innerText = targetYear;
            if (descEl) descEl.innerHTML = this.storyText[targetYear] || "数据载入中...";

            // B. 更新右侧图表高亮 (调用 revenue.js 的接口)
            if (this.chartController && this.chartController.highlight) {
                this.chartController.highlight(targetYear);
            }
        }
    }
}