// src/modules/treeVideoScrolly.js

export class TreeVideoScrolly {
    constructor(config) {
        this.video = document.querySelector(config.videoSelector);
        this.canSwitchBackground = false;
        setTimeout(() => {
            this.canSwitchBackground = true;

            const rect = this.container.getBoundingClientRect();
            const viewportHeight = window.innerHeight;

            // 只要容器的顶部进入了视口，且当前索引是 0，就应当切换到 2017 背景
            const isVisible = rect.top < viewportHeight * 0.8 && rect.bottom > 0;

            if (this.currentStepIndex === 0 && isVisible) {
                const firstStep = this.container.querySelector('.story-step[data-step="0"]');
                const bgId = firstStep?.getAttribute('data-bg');
                if (bgId) {
                    console.log("TreeVideoScrolly: 冷却结束，执行 2017 背景补偿");
                    this.switchGlobalBackground(bgId);
                }
            }
        }, 800); // 建议缩短到 800ms，提高响应速度
        this.container = document.querySelector(config.containerSelector);
        this.chartController = config.chartController;
        this.data = config.data;
        this.yearsSorted = Array.isArray(this.data)
            ? [...new Set(this.data.map(d => +d.year))].sort((a, b) => a - b)
            : [];
        this.storySteps = config.storySteps || [];
        this.storyMode = this.storySteps.length > 0;
        this.storyObserver = null;
        this.storyStepElements = [];
        this.currentStepIndex = -1;

        // 统一的事件处理引用，便于按需绑定/解绑
        this.onScroll = () => requestAnimationFrame(() => this.handleScroll());
        this.onWheel = () => requestAnimationFrame(() => this.handleScroll());
        this.onResize = () => requestAnimationFrame(() => this.handleScroll());
        this.observer = null;
        this.isActive = false;

        this.yearTitleEl = document.getElementById('tree-year-title');
        this.yearDescEl = document.getElementById('tree-year-desc');
        this.macroTextEl = document.getElementById('macro-dynamic-text');

        // 视频路径：对应 src/tree/ 文件夹
        this.videoSources = [];
        for (let i = 18; i <= 24; i++) {
            this.videoSources.push(`./tree/tree_${i}.webm`);
        }

        this.currentYear = null;
        this.currentVideoIdx = -1;
        this.isLocked = false; // 播放状态锁

        this.init();
    }

    init() {
        if (!this.video || !this.container) {
            console.error("TreeVideoScrolly: 找不到元素", { video: this.video, container: this.container });
            return;
        }

        // 必须静音才能由脚本触发切换
        this.video.muted = true;
        this.video.setAttribute('muted', '');
        this.video.setAttribute('playsinline', '');

        this.storyStepElements = this.container ? this.container.querySelectorAll('.story-step') : [];

        if (this.storyMode && this.storyStepElements.length > 0) {
            this.initStoryMode();
        } else {
            this.storyMode = false;
            this.initContinuousMode();
        }
    }

    initStoryMode() {
        this.currentStepIndex = -1;

        // 关键修正：初始化时只做静默处理（更新文字和视频，不切背景）
        this.activateStep(0, true);

        this.storyObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const idxAttr = entry.target.getAttribute('data-step');
                    const index = idxAttr !== null ? +idxAttr : Array.from(this.storyStepElements).indexOf(entry.target);

                    if (!Number.isNaN(index)) {
                        // 如果已经是这个 index 了，说明被前面的初始化占坑了
                        // 强制在下划第一次进入时检查一次背景
                        if (index === 0 && this.canSwitchBackground) {
                            const bgId = entry.target.getAttribute('data-bg');
                            if (bgId) this.switchGlobalBackground(bgId);
                        }

                        this.activateStep(index, !this.canSwitchBackground);
                    }
                }
            });
        }, {
            threshold: 0.3, // 降低阈值到 0.3，增加灵敏度
            rootMargin: "0px 0px -20% 0px" // 调整触发区域
        });

        this.storyStepElements.forEach(step => this.storyObserver.observe(step));

        // ！！！删掉原代码最后这一行 ！！！
        // this.activateStep(0); 
    }

    activateStep(index, isSilent = false) {
        if (index === this.currentStepIndex) return;
        this.currentStepIndex = index;

        this.storyStepElements.forEach(step => step.classList.remove('active'));
        const activeEl = this.container.querySelector(`.story-step[data-step="${index}"]`);
        if (activeEl) {
            activeEl.classList.add('active');

            if (!isSilent && this.canSwitchBackground) {
                const targetBgId = activeEl.getAttribute('data-bg');
                if (targetBgId) {
                    this.switchGlobalBackground(targetBgId);
                }
            }
        }
        const config = this.storySteps[index] || {};
        const videoIdx = this.normalizeVideoIndex(config.videoIdx ?? index);
        if (videoIdx !== this.currentVideoIdx) {
            this.currentVideoIdx = videoIdx;
            this.switchVideo(this.videoSources[videoIdx]);
        }

        const highlightYear = this.resolveYearForStep(config, videoIdx);
        this.updateYearUI(highlightYear, config.titleOverride);
        this.updateDescription(config.description);
        this.updateMacroText(config.macroText);

        if (this.chartController && highlightYear) {
            this.chartController.highlight(highlightYear);
        }
    }
    switchGlobalBackground(targetId) {
        // 双重保险：再次检查开关
        if (!this.canSwitchBackground) return;

        const allLayers = document.querySelectorAll('.bg-layer');
        allLayers.forEach(layer => {
            layer.classList.toggle('active', layer.id === targetId);
        });
    }

    resolveYearForStep(config, videoIdx) {
        if (config.year) return config.year;
        const baseYear = this.yearsSorted[0] || 0;
        return baseYear + videoIdx;
    }

    normalizeVideoIndex(idx) {
        if (typeof idx !== 'number' || Number.isNaN(idx)) return 0;
        return Math.max(0, Math.min(idx, this.videoSources.length - 1));
    }

    updateYearUI(yearValue, overrideTitle) {
        if (!yearValue) return;
        this.currentYear = yearValue;
        const title = overrideTitle || yearValue;
        if (this.yearTitleEl) this.yearTitleEl.innerText = title;
    }

    updateDescription(desc) {
        if (this.yearDescEl && typeof desc === 'string') {
            this.yearDescEl.innerText = desc;
        }
    }

    updateMacroText(text) {
        if (this.macroTextEl && typeof text === 'string') {
            this.macroTextEl.innerHTML = text;
        }
    }

    initContinuousMode() {
        // 参考平行坐标系的做法，使用 IntersectionObserver 只在可见时挂载监听
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.target !== this.container) return;
                if (entry.isIntersecting) {
                    this.activate();
                } else {
                    this.deactivate();
                }
            });
        }, { threshold: this.buildThresholds() });

        this.observer.observe(this.container);
    }

    buildThresholds() {
        const steps = [];
        for (let i = 0; i <= 20; i++) steps.push(i / 20);
        return steps;
    }

    activate() {
        if (this.isActive) return;
        this.isActive = true;
        window.addEventListener('scroll', this.onScroll, { passive: true });
        this.container.addEventListener('wheel', this.onWheel, { passive: true });
        window.addEventListener('resize', this.onResize, { passive: true });
        this.handleScroll();
    }

    deactivate() {
        if (!this.isActive) return;
        this.isActive = false;
        window.removeEventListener('scroll', this.onScroll);
        this.container.removeEventListener('wheel', this.onWheel);
        window.removeEventListener('resize', this.onResize);
    }

    handleScroll() {
        if (this.storyMode) return;
        if (!this.container) return;

        // 离屏状态直接跳过
        if (!this.isActive) return;

        const rect = this.container.getBoundingClientRect();

        // 只有当容器中心靠近视口中心时才推进动画
        if (!this.isContainerCentered(rect)) return;

        // --- 调试：如果控制台没输出下面这行，说明 scroll 事件根本没触发 ---
        // console.log("Container Top:", rect.top); 

        const viewportHeight = window.innerHeight;

        // 只要有一部分在视口内就开始计算
        if (rect.bottom < 0 || rect.top > viewportHeight) return;

        const totalDistance = Math.max(rect.height - viewportHeight, 1);
        // 修正计算公式：让 progress 在 rect.top 从 0 到 -totalDistance 变化时，从 0 变到 1
        let progress = -rect.top / totalDistance;

        progress = Math.max(0, Math.min(1, progress));

        const numVideos = this.videoSources.length;
        const videoIdx = Math.min(Math.floor(progress * numVideos), numVideos - 1);

        if (videoIdx !== this.currentVideoIdx) {
            this.currentVideoIdx = videoIdx;
            console.log(`切换视频源: ${this.videoSources[videoIdx]}`); // 这行应该出现了
            this.switchVideo(this.videoSources[videoIdx]);
        }

        this.syncUI(progress);
    }

    switchVideo(src) {
        console.log(`切换视频源: ${src}`);

        // 1. 停止当前
        this.video.pause();

        // 2. 换源
        this.video.src = src;

        // 3. 强制重载
        this.video.load();

        // 4. 尝试播放
        const playPromise = this.video.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                // 忽略由于快速滚动导致的请求中断错误 (AbortError)
                if (error.name !== 'AbortError') {
                    console.warn("视频播放被拦截:", error);
                }
            });
        }
    }

    syncUI(progress) {
        if (this.storyMode) return;
        if (!this.data || this.data.length === 0) return;

        // 将每个视频段映射到相邻年份区间
        const segment = 1 / this.videoSources.length;
        const segmentStart = this.currentVideoIdx / this.videoSources.length;
        const within = Math.max(0, Math.min(1, (progress - segmentStart) / segment || 0));

        const baseYear = (this.yearsSorted[0] || 0) - 1; // tree_18 开头对应到 17 年
        const startYear = baseYear + this.currentVideoIdx;
        const endYear = startYear + 1;
        const interpolatedYear = startYear + within;
        const targetYear = Math.round(interpolatedYear);

        // 边界保护，避免超过数据范围
        const clampedYear = Math.max(this.yearsSorted[0] || targetYear, Math.min(targetYear, this.yearsSorted[this.yearsSorted.length - 1] || targetYear));

        if (this.currentYear !== clampedYear) {
            this.currentYear = clampedYear;

            // 更新标题
            const titleEl = document.getElementById('tree-year-title');
            if (titleEl) titleEl.innerText = clampedYear;

            // 联动右侧图表高亮
            if (this.chartController) {
                this.chartController.highlight(clampedYear);
            }
        }
    }

    isContainerCentered(rect) {
        const viewportHeight = window.innerHeight || 1;
        const containerCenter = rect.top + rect.height / 2;
        const viewportCenter = viewportHeight / 2;
        const tolerance = viewportHeight * 0.15; // 允许中心上下 15% 的缓冲区
        return Math.abs(containerCenter - viewportCenter) <= tolerance;
    }
}