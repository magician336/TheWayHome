// script.js
import * as d3 from "d3";
import { GlobalVizConfig } from "@magician336/assets";

// 花瓣路径 (4个来自index1 + 5个新生成的)
const petalPaths = [
    // 1. Round (原版圆形 - 饱满，重叠度高)
    'M0 0 C50 50 50 100 0 100 C-50 100 -50 50 0 0',

    // 2. Pointy (原版尖头 - 底部宽，重叠度好)
    'M-35 0 C-25 25 25 25 35 0 C50 25 25 75 0 100 C-25 75 -50 25 -35 0',

    // 3. Split/Notched (原版缺口 - 形状独特)
    'M0 0 C50 40 50 70 20 100 L0 85 L-20 100 C-50 70 -50 40 0 0',

    // 4. Simple Leaf (原版叶形 - 标准花瓣)
    'M0 0 C50 25 50 75 0 100 C-50 75 -50 25 0 0',

    // 5. Optimized Needle (优化后的针形 - 稍微加宽了中部，保证根部能重叠，尖端保持锋利)
    // 原版 C15 太细无法重叠，改为 C35
    'M0 0 C35 40 15 80 0 100 C-15 80 -35 40 0 0',

    // 6. Soft Diamond (柔和菱形 - 类似风筝形状，但在中部加宽以产生重叠)
    // 使用三次贝塞尔曲线代替二次，增加侧面宽度
    // Optional: Violin (小提琴/收腰形 - 侧面内凹，不再是圆滚滚的)
'M0 0 C60 20 10 60 0 100 C-10 60 -60 20 0 0',

  // 8. Gentle Heart (柔和心形 - 顶部是圆润的M形，没有尖角)
// C50 40... 把侧面画得圆鼓鼓的
// C15 95 10 85 0 85 这一段负责画顶部的柔和凹陷
'M0 0 C50 40 60 90 30 100 C15 95 10 85 0 85 C-10 85 -15 95 -30 100 C-60 90 -50 40 0 0',

// 8. Cosmos/Jagged (波斯菊/锯齿形 - 顶部平坦且带有波浪折角，像剪纸边缘)
// 侧面 C40 60 比较直
// 顶部不聚拢到一点，而是先去 20 100，再折回 0 90，制造锯齿感
'M0 0 C40 60 40 85 20 100 L0 90 L-20 100 C-40 85 -40 60 0 0'
];

// 1. 数据源 (来自 chosen_game.json)
d3.json("chosen_game.json").then(function(games) {

    // 2. 配置与比例尺
    const width = 1200;
    const flowerSize = 150;
    const cols = 5;
    const rows = Math.ceil(games.length / cols);
    const height = rows * (flowerSize + 80) + 50; // 增加高度以容纳标签

    // 颜色比例尺 (Categories)
    const allCategories = Array.from(new Set(games.flatMap(d => d.categories)));
    const colorScale = d3.scaleOrdinal()
        .domain(allCategories)
        .range(["#FFB09E", "#CBF2BD", "#AFE9FF", "#FFC8F0", "#FFF2B4", "#FFD700", "#40E0D0", "#FF69B4", "#8A2BE2", "#00FA9A", "#FFA07A", "#20B2AA", "#87CEFA", "#778899", "#B0C4DE"]);

    // 花瓣数量比例尺 (Total Comments -> 5 to 15)
    const minComments = d3.min(games, d => d.totalComments);
    const maxComments = d3.max(games, d => d.totalComments);
    const numPetalScale = d3.scaleQuantize()
        .domain([minComments, maxComments])
        .range([5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

    // 花朵大小比例尺 (Favorable Rate -> Scale Factor)
    const minRate = d3.min(games, d => d.favorableRate);
    const maxRate = d3.max(games, d => d.favorableRate);
    const sizeScale = d3.scaleLinear()
        .domain([minRate, maxRate])
        .range([0.2, 0.8]);

    // 形状比例尺 (Platform Code -> Path Index)
    // Platform Code 1-8 映射到 petalPaths 0-8
    const shapeScale = (code) => petalPaths[(code - 1) % petalPaths.length];


    // 3. 绘制流程
    const container = d3.select("#canvas");
    container.html(""); // 清空画布

    // 定义滤镜 (Blur) - 采用 index1 的参数
    const defsSvg = container.append("svg").attr("width", 0).attr("height", 0);
    const defs = defsSvg.append("defs");
    
    defs.append("filter")
        .attr("id", "motionFilter") // ID保持不变
        // 1. 解决方块问题：全方位扩大渲染区域
        // 原来只改了width，现在必须把 height 和 y 也加上
        .attr("filterUnits", "objectBoundingBox") // 确保是相对于对象的比例
        .attr("x", "-100%")       // 向左扩展
        .attr("y", "-100%")       // 向上扩展 (关键！解决上下被切平的问题)
        .attr("width", "300%")    // 宽度
        .attr("height", "300%")   // 高度 (关键！解决上下被切平的问题)
        .append("feGaussianBlur")
        .attr("in", "SourceGraphic")
        // 2. 解决太糊的问题：降低模糊参数
        // 之前的 8 有点太大了，对于 r=15 的圆，建议用 4 到 5 之间
        .attr("stdDeviation", "4.5");

    // --- A. 图例区域 (Legend) ---
    const legendHeight = 750; // 增加总高度以容纳所有图例
    const legendSvg = container.append("svg")
        .attr("width", width)
        .attr("height", legendHeight)
        .style("display", "block")
        .style("margin", "0 auto 20px auto")
        .style("background", "#f9f9f9")
        .style("border-radius", "8px");

    // 样式辅助函数
    const legendTitleStyle = (selection) => {
        selection.attr("text-anchor", "middle")
            .style("font-family", "sans-serif")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .style("fill", "#333");
    };
    const legendTextStyle = (selection) => {
        selection.attr("text-anchor", "middle")
            .style("font-family", "sans-serif")
            .style("font-size", "12px")
            .style("fill", "#555");
    };

    // 1. Platform Code (形状)
    const legendGroup1 = legendSvg.append("g").attr("transform", `translate(0, 20)`);
    legendGroup1.append("text")
        .attr("x", width / 2)
        .attr("y", 20)
        .call(legendTitleStyle)
        .text("1. 平台 (Platform Code) -> 花瓣形状");

    const shapeGroup = legendGroup1.append("g")
        .attr("transform", `translate(${width/2}, 60)`);
    
    const shapeWidth = 80;
    const totalShapeWidth = 8 * shapeWidth;
    
    for (let i = 1; i <= 8; i++) {
        const g = shapeGroup.append("g")
            .attr("transform", `translate(${(i-1) * shapeWidth - totalShapeWidth/2 + shapeWidth/2}, 0)`);
        
        g.append("path")
            .attr("d", shapeScale(i))
            .attr("fill", "none")
            .attr("stroke", "#605b5bff")
            .attr("stroke-width", 5)
            .attr("transform", "translate(0, 40) rotate(180) scale(0.4)");
            
        g.append("text")
            .attr("y", 60)
            .call(legendTextStyle)
            .text(`Code ${i}`);
    }

    // 2. Categories (颜色)
    const legendGroup2 = legendSvg.append("g").attr("transform", `translate(0, 160)`);
    legendGroup2.append("text")
        .attr("x", width / 2)
        .attr("y", 20)
        .call(legendTitleStyle)
        .text("2. 游戏分类 (Categories) -> 光晕颜色");

    const colorGroup = legendGroup2.append("g")
        .attr("transform", `translate(${width/2}, 60)`);
    
    const categoriesList = colorScale.domain();
    const colorItemWidth = 80;
    const itemsPerRow = 8; // 每行8个
    
    categoriesList.forEach((cat, i) => {
        const row = Math.floor(i / itemsPerRow);
        const col = i % itemsPerRow;
        const itemsInThisRow = (row === Math.floor((categoriesList.length - 1) / itemsPerRow)) ? (categoriesList.length % itemsPerRow || itemsPerRow) : itemsPerRow;
        const rowWidth = itemsInThisRow * colorItemWidth;
        
        const x = col * colorItemWidth - rowWidth / 2 + colorItemWidth / 2;
        const y = row * 50; 

        const g = colorGroup.append("g")
            .attr("transform", `translate(${x}, ${y})`);
        
        g.append("circle")
            .attr("r", 15)
            .attr("fill", colorScale(cat))
            .style("mix-blend-mode", "multiply")
            .style("filter", "url(#motionFilter)")
            .attr("opacity", 0.7);
            
        g.append("text")
            .attr("y", 25)
            .call(legendTextStyle)
            .text(cat);
    });

    // 3. Total Comments (花瓣数量)
    const legendGroup3 = legendSvg.append("g").attr("transform", `translate(0, 320)`);
    legendGroup3.append("text")
        .attr("x", width / 2)
        .attr("y", 20)
        .call(legendTitleStyle)
        .text("3. 评论总数 (Total Comments) -> 花瓣数量");

    const petalNumGroup = legendGroup3.append("g")
        .attr("transform", `translate(${width/2}, 70)`);
    
    const commentSamples = [minComments, minComments + (maxComments - minComments) * 0.25, minComments + (maxComments - minComments) * 0.5, minComments + (maxComments - minComments) * 0.75, maxComments];
    const numWidth = 120;
    const totalNumWidth = commentSamples.length * numWidth;

    commentSamples.forEach((val, i) => {
        const g = petalNumGroup.append("g")
            .attr("transform", `translate(${i * numWidth - totalNumWidth/2 + numWidth/2}, 0)`);
        
        const numPetals = numPetalScale(val);
        const path = petalPaths[3]; 
        
        for (let k = 0; k < numPetals; k++) {
            g.append("path")
                .attr("d", path)
                .attr("fill", "none")
                .attr("stroke", "#605b5bff")
                .attr("stroke-width", 5)
                .attr("transform", `rotate(${(360 / numPetals) * k}) scale(0.3)`);
        }
        // Removed circle here

        g.append("text")
            .attr("y", 60)
            .call(legendTextStyle)
            .text(`${Math.round(val)}`);
    });

    // 4. Favorable Rate (大小)
    const legendGroup4 = legendSvg.append("g").attr("transform", `translate(0, 500)`);
    legendGroup4.append("text")
        .attr("x", width / 2)
        .attr("y", 20)
        .call(legendTitleStyle)
        .text("4. 好评率 (Favorable Rate) -> 花朵大小");

    const sizeGroup = legendGroup4.append("g")
        .attr("transform", `translate(${width/2}, 100)`);

    const rateSamples = [minRate, minRate + (maxRate - minRate) * 0.25, minRate + (maxRate - minRate) * 0.5, minRate + (maxRate - minRate) * 0.75, maxRate];
    const sizeWidth = 160;
    const totalSizeWidth = rateSamples.length * sizeWidth;

    rateSamples.forEach((val, i) => {
        const g = sizeGroup.append("g")
            .attr("transform", `translate(${i * sizeWidth - totalSizeWidth/2 + sizeWidth/2}, 0)`);
        
        const scale = sizeScale(val);
        const numPetals = 5; 
        const path = petalPaths[3]; 

        for (let k = 0; k < numPetals; k++) {
            g.append("path")
                .attr("d", path)
                .attr("fill", "none")
                .attr("stroke", "#605b5bff")
                .attr("stroke-width", 2 / scale)
                .attr("transform", `rotate(${(360 / numPetals) * k}) scale(${scale})`);
        }
        g.append("circle").attr("r", 3).attr("fill", "#605b5bff");
        g.append("text")
            .attr("y", 110)
            .call(legendTextStyle)
            .text(`${val.toFixed(1)}%`);
    });


    // --- B. 主内容区域 (Grid) ---
    const mainSvg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("display", "block")
        .style("margin", "0 auto");

    const flowers = mainSvg.selectAll("g.flower")
        .data(games)
        .enter()
        .append("g")
        .attr("class", "flower")
        .attr("transform", (d, i) => {
            // 一行五个
            const x = (i % cols) * (width / cols) + (width / cols) / 2;
            const y = Math.floor(i / cols) * (flowerSize + 80) + 100;
            return `translate(${x}, ${y})`;
        });

    // 1. 绘制光晕层 (Halo) - 依据 categories 数量
    flowers.each(function(d) {
        const g = d3.select(this);
        const categories = d.categories; // 2-4 个分类
        const scale = sizeScale(d.favorableRate);
        
        // 遍历分类生成光晕圆
        categories.forEach((cat, i) => {
            let angle;
            if (categories.length === 3) {
                // 3个：倒三角（上面两个，下面一个）
                angle = (i / categories.length) * 2 * Math.PI + Math.PI / 2;
            } else {
                // 2个：上下排列
                // 4个：十字排列
                angle = (i / categories.length) * 2 * Math.PI - Math.PI / 2;
            }

            // 稍微错开圆心
            const offset = 35 * scale; 
            const cx = Math.cos(angle) * offset;
            const cy = Math.sin(angle) * offset;
            
            const r = 65 * scale; // 光晕半径

            g.append("circle")
                .attr("cx", cx)
                .attr("cy", cy)
                .attr("r", r)
                .attr("fill", colorScale(cat))
                .style("mix-blend-mode", "multiply") // 混合模式
                .style("filter", "url(#motionFilter)") // 模糊滤镜
                .attr("opacity", 0.6);
        });
    });

    // 2. 绘制花瓣 (Petals) - 依据 Platform Code 和 Comments
    flowers.each(function(d) {
        const g = d3.select(this);
        const numPetals = numPetalScale(d.totalComments);
        const path = shapeScale(d.platformCode);
        const scale = sizeScale(d.favorableRate);
        
        for (let i = 0; i < numPetals; i++) {
            g.append("path")
                .attr("d", path)
                .attr("fill", "none")
                .attr("stroke", "#605b5bff") // 线条颜色
                .attr("stroke-width", 2.5 / scale) // 保持线条视觉宽度一致
                .attr("transform", `rotate(${(360 / numPetals) * i}) scale(${scale})`);
        }
        
        // 花心
        // g.append("circle")
        //     .attr("r", 3)
        //     .attr("fill", "#444");
    });

    // 3. 添加文本标签
    flowers.append("text")
        .attr("y", 90)
        .attr("text-anchor", "middle")
        .style("font-family", "sans-serif")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .style("fill", "#333")
        .text(d => d.name.length > 15 ? d.name.substring(0, 15) + "..." : d.name);

    flowers.append("text")
        .attr("y", 110)
        .attr("text-anchor", "middle")
        .style("font-family", "sans-serif")
        .style("font-size", "10px")
        .style("fill", "#666")
        .text(d => `Rate: ${d.favorableRate}% | Code: ${d.platformCode}`);

}).catch(function(error) {
    console.error("Error loading the data: " + error);
});
