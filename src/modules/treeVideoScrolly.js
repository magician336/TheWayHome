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
        for (let i = 17; i <= 24; i++) {
            this.videoSources.push(`./tree/tree_${i}.webm`);
        }

        this.currentYear = null;
        this.currentVideoIdx = -1;
        this.isLocked = false; // 播放状态锁

        this.isViewable = false;

        this.init();
    }

    init() {
        if (!this.video || !this.container) return;

        this.video.muted = true;
        this.video.removeAttribute('autoplay');
        this.video.setAttribute('muted', '');
        this.video.setAttribute('playsinline', '');

        // 找到视频所在的固定舞台
        const stickyStage = this.container.querySelector('.sticky-stage');

        const playObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                // 只要有一部分进入视口就判定为可见
                this.isViewable = entry.isIntersecting;

                if (this.isViewable) {
                    console.log("TreeVideoScrolly: 进入视口，开始播放");
                    this.video.play().catch(e => {
                        if (e.name !== 'AbortError') console.warn("播放失败:", e);
                    });
                } else {
                    // 增加判定保护：只有当完全离开视口时才暂停
                    console.log("TreeVideoScrolly: 离开视口，暂停视频");
                    this.video.pause();
                }
            });
        }, {
            threshold: [0, 0.1, 0.5], // 多个阈值点提升检测精度
            rootMargin: "20% 0px 20% 0px" // 上下预留 20% 的空间，防止判定过于紧绷
        });

        // 观察 stickyStage 而不是整个庞大的 container
        if (stickyStage) {
            playObserver.observe(stickyStage);
        } else {
            playObserver.observe(this.container);
        }

        this.storyStepElements = this.container ? this.container.querySelectorAll('.story-step') : [];

        if (this.storyMode && this.storyStepElements.length > 0) {
            this.initStoryMode();
        } else {
            this.storyMode = false;
            this.initContinuousMode();
        }
    }

    /**
     * 异步预加载所有视频到内存
     * @returns {Promise<void>}
     */
    async preloadAllVideos() {
        console.log("TreeVideoScrolly: 开始预加载视频...");

        // 1. 创建所有 fetch 请求的 Promise 数组
        const fetchPromises = this.videoSources.map((src, index) => {
            return fetch(src)
                .then(response => {
                    if (!response.ok) throw new Error(`Failed to load ${src}`);
                    return response.blob();
                })
                .then(blob => {
                    // 2. 将 Blob 转换为内存 URL
                    const objectUrl = URL.createObjectURL(blob);
                    return { index, url: objectUrl };
                });
        });

        try {
            // 3. 并行等待所有视频下载完成
            const results = await Promise.all(fetchPromises);

            // 4. 按顺序替换 this.videoSources 中的路径为 Blob URL
            results.forEach(item => {
                this.videoSources[item.index] = item.url;
            });

            console.log("TreeVideoScrolly: 所有视频预加载完成 (Blob Mode)");

            if (this.video && this.videoSources[0]) {
                this.video.src = this.videoSources[0];
                this.video.load();
            }

        } catch (error) {
            console.error("TreeVideoScrolly: 视频预加载失败，将回退到普通流式播放", error);
            // 出错时不替换 source，代码会自动使用构造函数里生成的原始路径
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
        if (this.yearDescEl) {
            if (desc && typeof desc === 'string') {
                this.yearDescEl.style.display = 'block';
                this.yearDescEl.innerText = desc;
            } else {
                // 如果删除了内容，则隐藏该 DOM 元素，防止留白
                this.yearDescEl.style.display = 'none';
            }
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
        this.video.pause();
        this.video.src = src;
        this.video.load();

        // 只有在当前容器可见时，换源后才自动播放
        if (this.isViewable) {
            const playPromise = this.video.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    if (error.name !== 'AbortError') {
                        console.warn("视频播放被拦截:", error);
                    }
                });
            }
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