/**
 * 伪随机数生成器
 */
class RandomGenerator {
    constructor(seed) {
        this.initialSeed = seed;
        this.seed = seed;
    }
    reset() { this.seed = this.initialSeed; }
    random() {
        let x = Math.sin(this.seed) * 10000;
        this.seed++;
        return x - Math.floor(x);
    }
    gaussian(mean, std) {
        var rand = 0;
        for (var i = 0; i < 6; i += 1) rand += this.random();
        return ((rand - 3) / 6) * std + mean;
    }
    unif(a, b) { return this.random() * (b - a) + a; }
}

export default class FractalTree {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        // 修复：添加 willReadFrequently 优化 getImageData 性能
        this.ctx = canvas.getContext('2d', { willReadFrequently: true });

        this.defaults = {
            maxDepth: 12,
            scale: 60,
            lineWidth: 20,
            lineWidthFalloff: 1.6,
            lengthVar: 3.8,
            branchiness: 0.05,
            curveAmount: 0.2,
            upAmount: 0.01,
            spread: 0.4,
            seed: 31
        };

        this.config = { ...this.defaults, ...options };
        this.rng = new RandomGenerator(this.config.seed);
        this.animationFrameId = null;
    }

    /**
     * 优化后的极限值映射逻辑
     */
    applyMarketData(data) {
        // 1. 销售额映射：使用平方根平滑高位增长 (1.31 - 102.2)
        const revenueFactor = Math.sqrt(data.actual_revenue);
        const scale = this._mapRange(revenueFactor, Math.sqrt(1.3), Math.sqrt(105), 40, 115);

        // 2. 增长率映射：限制极端增长对形态的影响 (-30 - 400)
        const clampedGrowth = Math.max(-30, Math.min(data.growth_rate, 150));
        const upAmount = this._mapRange(clampedGrowth, -30, 150, 0, 0.022);

        // 3. 游戏数量映射：使用对数防止分叉过密 (150 - 1600)
        const branchFactor = Math.log10(data.num_games);
        const branchiness = this._mapRange(branchFactor, Math.log10(150), Math.log10(1800), 0.035, 0.095);

        this.updateConfig({
            scale: scale,
            upAmount: upAmount,
            branchiness: branchiness,
            maxDepth: data.actual_revenue > 60 ? 13 : 11 // 仅在大规模时增加细节
        });
    }

    _mapRange(val, in_min, in_max, out_min, out_max) {
        return (val - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        if (newConfig.seed !== undefined) {
            this.rng = new RandomGenerator(this.config.seed);
        }
    }

    /**
     * 平滑过渡动画 (严格 3s 周期)
     */
    transitionToMarketData(targetData, duration = 3000, onFrame) {
        this.stopAnimation();

        const targetConfig = {
            scale: this._mapRange(Math.sqrt(targetData.actual_revenue), Math.sqrt(1.3), Math.sqrt(105), 40, 115),
            upAmount: this._mapRange(Math.max(-30, Math.min(targetData.growth_rate, 150)), -30, 150, 0, 0.022),
            branchiness: this._mapRange(Math.log10(targetData.num_games), Math.log10(150), Math.log10(1800), 0.035, 0.095),
            maxDepth: targetData.actual_revenue > 60 ? 13 : 11
        };

        const startConfig = { ...this.config };
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3); // Cubic Out 缓动

            this.config.scale = startConfig.scale + (targetConfig.scale - startConfig.scale) * ease;
            this.config.upAmount = startConfig.upAmount + (targetConfig.upAmount - startConfig.upAmount) * ease;
            this.config.branchiness = startConfig.branchiness + (targetConfig.branchiness - startConfig.branchiness) * ease;
            this.config.maxDepth = progress > 0.5 ? targetConfig.maxDepth : startConfig.maxDepth;

            this.draw();
            if (onFrame) onFrame();

            if (progress < 1) {
                this.animationFrameId = requestAnimationFrame(animate);
            }
        };

        this.animationFrameId = requestAnimationFrame(animate);
    }

    stopAnimation() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    draw() {
        const { width, height } = this.canvas;
        this.ctx.clearRect(0, 0, width, height);
        // 核心修复：绘制实心背景，防止透明导致的黑色
        this.ctx.save();
        this.ctx.fillStyle = "#FFFFFF";
        this.ctx.fillRect(0, 0, width, height);
        this.ctx.restore();
        this.rng.reset();
        let start_angle = -1 * (Math.PI / 2) + this.rng.gaussian(0, 0.5);
        this._drawBranch(width / 2, height, start_angle, 1);
    }

    _drawBranch(x, y, angle, depth) {
        if (depth >= this.config.maxDepth) return;

        let _x = x, _y = y, _angle = angle;
        let length = (this.config.scale / depth) * this.rng.gaussian(1, this.config.lengthVar);
        let segments = length / 10;

        this.ctx.lineWidth = this.config.lineWidth / (Math.pow(this.config.lineWidthFalloff, depth));
        this.ctx.strokeStyle = "rgb(60,60,60)";
        this.ctx.lineCap = "round";

        let curve_dir = (this.rng.unif(0, 1) < 0.5) ? -1 : 1;
        let curve = this.config.curveAmount * curve_dir;
        if (depth == 1) curve *= 0.25;

        for (let i = 0; i < segments; i++) {
            let up = (angle < -Math.PI / 2) ? Math.PI / 2 - angle : angle - Math.PI / 2;
            _angle += curve + (up * this.config.upAmount * depth);
            let nextX = x + 10 * Math.cos(angle);
            let nextY = y + 10 * Math.sin(angle);

            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(nextX, nextY);
            this.ctx.stroke();

            x = nextX; y = nextY; angle = _angle;

            if (this.rng.unif(0, 1) < this.config.branchiness) {
                let dir = (this.rng.unif(0, 1) < 0.5) ? -1 : 1;
                this._drawBranch(x, y, angle + (this.config.spread / 2 * dir), depth + 1);
                this.ctx.lineWidth = this.config.lineWidth / (Math.pow(this.config.lineWidthFalloff, depth));
                this.ctx.strokeStyle = "rgb(60,60,60)";
            }
        }

        let dir = (this.rng.unif(0, 1) < 0.5) ? -1 : 1;
        this._drawBranch(x, y, angle + (this.config.spread * dir), depth + 1);
        this._drawBranch(x, y, angle + (this.config.spread * -dir), depth + 1);

        if (depth >= this.config.maxDepth - 2) {
            this._drawLeaf(x, y);
        }
    }

    _drawLeaf(x, y) {
        let h = this.rng.unif(160, 170);
        let s = this.rng.unif(65, 75);
        let l = this.rng.unif(60, 70);
        this.ctx.fillStyle = `hsl(${h}, ${s}%, ${l}%)`;
        let r = this.rng.gaussian(4, 1);
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, Math.PI * 2);
        this.ctx.fill();
    }
}