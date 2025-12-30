// src/modules/treeSequenceScrolly.js

export class TreeSequenceScrolly {
    constructor(config) {
        this.canvas = document.querySelector(config.canvasSelector);
        if (!this.canvas) return;

        this.context = this.canvas.getContext('2d');
        this.container = document.querySelector(config.containerSelector);

        this.chartController = config.chartController;
        // 修改点：直接接收图片路径数组，不再自动生成
        this.imageUrls = config.imageUrls || [];
        this.data = config.data; // 年份数据

        this.images = [];
        this.imagesLoaded = 0;
        this.currentFrameIndex = -1;
        this.currentYear = null;

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
        if (this.imageUrls.length === 0) {
            console.error("TreeScrolly: 没有提供图片列表");
            return;
        }
        this.preloadImages();
        this.handleResize();

        // 绑定事件
        window.addEventListener('resize', () => this.handleResize());
        window.addEventListener('scroll', () => this.handleScroll());

        // 初始调用一次
        this.handleScroll();
    }

    preloadImages() {
        console.log(`TreeScrolly: 开始预加载 ${this.imageUrls.length} 张图片...`);

        this.imageUrls.forEach((url, index) => {
            const img = new Image();
            img.src = url;
            img.onload = () => {
                this.imagesLoaded++;
                // 当第一张和第二张加载完时，尝试绘制一下，避免空白
                if (this.imagesLoaded >= 2) {
                    this.handleScroll();
                }
            };
            img.onerror = () => {
                console.error(`TreeScrolly: 图片加载失败 ${url}`);
            }
            this.images[index] = img;
        });
    }

    handleScroll() {
        if (!this.container || this.images.length === 0) return;

        const rect = this.container.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        // 计算滚动进度 (0 到 1)
        const totalDistance = rect.height - viewportHeight;
        let progress = -rect.top / totalDistance;

        // 限制范围
        progress = Math.max(0, Math.min(1, progress));

        // 调用混合绘制函数
        this.drawMixedFrame(progress);

        // 同步数据年份
        this.syncData(progress);
    }

    // 核心修改：支持两张图片混合绘制，实现平滑过渡
    drawMixedFrame(progress) {
        const ctx = this.context;
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        // 1. 计算当前的浮点数索引 (例如 2.5 表示在第3张和第4张之间)
        // 总共有 N 张图，就有 N-1 个过渡段
        const totalSegments = this.images.length - 1;
        if (totalSegments <= 0) return;

        const rawIndex = progress * totalSegments;

        // 当前基准帧 (整数部分)
        let index1 = Math.floor(rawIndex);
        // 下一帧
        let index2 = index1 + 1;

        // 混合系数 (小数部分)
        let alpha = rawIndex - index1;

        // 边界处理
        if (index1 >= totalSegments) {
            index1 = totalSegments;
            index2 = totalSegments;
            alpha = 0;
        }

        const img1 = this.images[index1];
        const img2 = this.images[index2];

        // 清空画布
        ctx.clearRect(0, 0, cw, ch);

        // 绘制辅助函数
        const drawImg = (img, opacity) => {
            if (!img || !img.complete) return;

            ctx.globalAlpha = opacity;

            // "contain" 模式计算
            const imgRatio = img.width / img.height;
            const canvasRatio = cw / ch;
            let drawW, drawH, offsetX, offsetY;

            if (canvasRatio > imgRatio) {
                drawH = ch;
                drawW = drawH * imgRatio;
                offsetX = (cw - drawW) / 2;
                offsetY = 0;
            } else {
                drawW = cw;
                drawH = drawW / imgRatio;
                offsetX = 0;
                offsetY = (ch - drawH) / 2;
            }
            ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
        };

        // 2. 执行混合绘制
        // 先画第一张 (底图)
        drawImg(img1, 1);

        // 再画第二张 (覆盖，透明度为 alpha)
        if (img2 && alpha > 0) {
            drawImg(img2, alpha);
        }

        // 恢复全局透明度
        ctx.globalAlpha = 1.0;
    }

    syncData(progress) {
        if (!this.data || this.data.length === 0) return;

        // 简单映射：进度对应数据索引
        const index = Math.round(progress * (this.data.length - 1));
        const safeIndex = Math.max(0, Math.min(index, this.data.length - 1));

        const targetData = this.data[safeIndex];
        const targetYear = targetData.year;

        if (this.currentYear !== targetYear) {
            // console.log(`TreeScrolly: 年份切换 -> ${targetYear}`);
            this.currentYear = targetYear;

            // A. 更新文字
            const titleEl = document.getElementById('tree-year-title');
            const descEl = document.getElementById('tree-year-desc');

            if (titleEl) titleEl.innerText = targetYear;
            if (descEl) descEl.innerHTML = this.storyText[targetYear] || "数据载入中...";

            // B. 通知图表高亮
            if (this.chartController && this.chartController.highlight) {
                this.chartController.highlight(targetYear);
            }
        }
    }

    handleResize() {
        if (!this.canvas) return;
        const box = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = box.width;
        this.canvas.height = box.height;
        // 触发重绘
        this.handleScroll();
    }
}