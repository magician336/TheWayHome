// // script.js

// // 1. 数据源 (来自 chosen_game.json)
// const games = [
//     {
//         "name": "艾希 (ICEY)",
//         "appid": "553640",
//         "yearForSale": 2017,
//         "price": 38.0,
//         "favorableRate": 88.07,
//         "tags": "dataset\\2017\\tags_553640.csv",
//         "discounts": "dataset\\2017\\discounts_553640.csv",
//         "players": "dataset\\2017\\players_553640.csv",
//         "totalComments": 27362,
//         "categories": [
//             "角色扮演",
//             "平台银河城",
//             "动作格斗"
//         ],
//         "platforms": ["PC", "PS_Xbox", "Switch", "Mobile"],
//         "platformCode": 1
//     },
//     {
//         "name": "三色绘恋 (Tricolour Lovestory)",
//         "appid": "668630",
//         "yearForSale": 2017,
//         "price": 11.0,
//         "favorableRate": 80.1,
//         "tags": "dataset\\2017\\tags_668630.csv",
//         "discounts": "dataset\\2017\\discounts_668630.csv",
//         "players": "dataset\\2017\\players_668630.csv",
//         "totalComments": 27995,
//         "categories": [
//             "模拟建造",
//             "休闲治愈",
//             "剧情叙事"
//         ],
//         "platforms": ["PC", "PS_Xbox", "Mobile"],
//         "platformCode": 2
//     },
//     {
//         "name": "返校 (Detention)",
//         "appid": "555220",
//         "yearForSale": 2017,
//         "price": 38.0,
//         "favorableRate": 80.42,
//         "tags": "dataset\\2017\\tags_555220.csv",
//         "discounts": "dataset\\2017\\discounts_555220.csv",
//         "players": "dataset\\2017\\players_555220.csv",
//         "totalComments": 14624,
//         "categories": [
//             "恐怖悬疑",
//             "解谜探案",
//             "剧情叙事"
//         ],
//         "platforms": ["PC", "PS_Xbox", "Switch", "Mobile"],
//         "platformCode": 1
//     },
//     {
//         "name": "The Scroll Of Taiwu",
//         "appid": "838350",
//         "yearForSale": 2018,
//         "price": 68.0,
//         "favorableRate": 69.43,
//         "tags": "dataset\\2018\\tags_838350.csv",
//         "discounts": "dataset\\2018\\discounts_838350.csv",
//         "players": "dataset\\2018\\players_838350.csv",
//         "totalComments": 61589,
//         "categories": [
//             "奇幻神话",
//             "生存开放",
//             "策略战棋",
//             "肉鸽挑战"
//         ],
//         "platforms": ["PC"],
//         "platformCode": 3
//     },
//     {
//         "name": "波西亚时光 (My Time At Portia)",
//         "appid": "666140",
//         "yearForSale": 2018,
//         "price": 98.0,
//         "favorableRate": 85.16,
//         "tags": "dataset\\2018\\tags_666140.csv",
//         "discounts": "dataset\\2018\\discounts_666140.csv",
//         "players": "dataset\\2018\\players_666140.csv",
//         "totalComments": 47836,
//         "categories": [
//             "模拟建造",
//             "角色扮演",
//             "休闲治愈"
//         ],
//         "platforms": ["PC", "PS_Xbox", "Switch", "Mobile"],
//         "platformCode": 1
//     },
//     {
//         "name": "Gujian3(古剑奇谭三)",
//         "appid": "994280",
//         "yearForSale": 2018,
//         "price": 99.0,
//         "favorableRate": 85.97,
//         "tags": "dataset\\2018\\tags_994280.csv",
//         "discounts": "dataset\\2018\\discounts_994280.csv",
//         "players": "dataset\\2018\\players_994280.csv",
//         "totalComments": 48555,
//         "categories": [
//             "角色扮演",
//             "动作格斗",
//             "奇幻神话"
//         ],
//         "platforms": ["PC"],
//         "platformCode": 3
//     },
//     {
//         "name": "隐形守护者",
//         "appid": "998940",
//         "yearForSale": 2019,
//         "price": 28.0,
//         "favorableRate": 85.46,
//         "tags": "dataset\\2019\\tags_998940.csv",
//         "discounts": "dataset\\2019\\discounts_998940.csv",
//         "players": "dataset\\2019\\players_998940.csv",
//         "totalComments": 51655,
//         "categories": [
//             "角色扮演",
//             "剧情叙事"
//         ],
//         "platforms": ["PC", "Mobile"],
//         "platformCode": 5
//     },
//     {
//         "name": "光明记忆",
//         "appid": "955050",
//         "yearForSale": 2019,
//         "price": 29.0,
//         "favorableRate": 88.5,
//         "tags": "dataset\\2019\\tags_955050.csv",
//         "discounts": "dataset\\2019\\discounts_955050.csv",
//         "players": "dataset\\2019\\players_955050.csv",
//         "totalComments": 39283,
//         "categories": [
//             "科幻机甲",
//             "射击弹幕"
//         ],
//         "platforms": ["PC", "PS_Xbox", "Switch", "Mobile"],
//         "platformCode": 1
//     },
//     {
//         "name": "Pascal's Wager: Definitive Edition",
//         "appid": "1456650",
//         "yearForSale": 2020,
//         "price": 80.0,
//         "favorableRate": 70.45,
//         "tags": "dataset\\2020\\tags_1456650.csv",
//         "discounts": "dataset\\2020\\discounts_1456650.csv",
//         "players": "dataset\\2020\\players_1456650.csv",
//         "totalComments": 1330,
//         "categories": [
//             "角色扮演",
//             "动作格斗",
//             "奇幻神话"
//         ],
//         "platforms": ["PC", "Switch", "Mobile"],
//         "platformCode": 4
//     },
//     {
//         "name": "港詭實錄ParanormalHK",
//         "appid": "1178490",
//         "yearForSale": 2020,
//         "price": 56.0,
//         "favorableRate": 89.68,
//         "tags": "dataset\\2020\\tags_1178490.csv",
//         "discounts": "dataset\\2020\\discounts_1178490.csv",
//         "players": "dataset\\2020\\players_1178490.csv",
//         "totalComments": 19629,
//         "categories": [
//             "恐怖悬疑",
//             "解谜探案",
//             "剧情叙事"
//         ],
//         "platforms": ["PC", "PS_Xbox"],
//         "platformCode": 7
//     },
//     {
//         "name": "永劫无间 (NARAKA: BLADEPOINT)",
//         "appid": "1203220",
//         "yearForSale": 2021,
//         "price": 0.0,
//         "favorableRate": 68.81,
//         "tags": "dataset\\2021\\tags_1203220.csv",
//         "discounts": "dataset\\2021\\discounts_1203220.csv",
//         "players": "dataset\\2021\\players_1203220.csv",
//         "totalComments": 336077,
//         "categories": [
//             "多人竞技",
//             "角色扮演",
//             "动作格斗"
//         ],
//         "platforms": ["PC", "PS_Xbox", "Mobile"],
//         "platformCode": 2
//     },
//     {
//         "name": "鬼谷八荒 (Tale of Immortal)",
//         "appid": "1468810",
//         "yearForSale": 2021,
//         "price": 68.0,
//         "favorableRate": 54.05,
//         "tags": "dataset\\2021\\tags_1468810.csv",
//         "discounts": "dataset\\2021\\discounts_1468810.csv",
//         "players": "dataset\\2021\\players_1468810.csv",
//         "totalComments": 226599,
//         "categories": [
//             "模拟建造",
//             "奇幻神话",
//             "生存开放"
//         ],
//         "platforms": ["PC", "Switch"],
//         "platformCode": 8
//     },
//     {
//         "name": "戴森球计划 (Dyson Sphere Program)",
//         "appid": "1366540",
//         "yearForSale": 2021,
//         "price": 70.0,
//         "favorableRate": 96.03,
//         "tags": "dataset\\2021\\tags_1366540.csv",
//         "discounts": "dataset\\2021\\discounts_1366540.csv",
//         "players": "dataset\\2021\\players_1366540.csv",
//         "totalComments": 88259,
//         "categories": [
//             "模拟建造",
//             "科幻机甲",
//             "休闲治愈",
//             "策略战棋"
//         ],
//         "platforms": ["PC"],
//         "platformCode": 3
//     },
//     {
//         "name": "《文字遊戲》",
//         "appid": "1109570",
//         "yearForSale": 2022,
//         "price": 48.0,
//         "favorableRate": 93.87,
//         "tags": "dataset\\2022\\tags_1109570.csv",
//         "discounts": "dataset\\2022\\discounts_1109570.csv",
//         "players": "dataset\\2022\\players_1109570.csv",
//         "totalComments": 6138,
//         "categories": [
//             "解谜探案",
//             "策略战棋"
//         ],
//         "platforms": ["PC", "Switch"],
//         "platformCode": 8
//     },
//     {
//         "name": "暖雪 Warm Snow",
//         "appid": "1296830",
//         "yearForSale": 2022,
//         "price": 58.0,
//         "favorableRate": 93.07,
//         "tags": "dataset\\2022\\tags_1296830.csv",
//         "discounts": "dataset\\2022\\discounts_1296830.csv",
//         "players": "dataset\\2022\\players_1296830.csv",
//         "totalComments": 38003,
//         "categories": [
//             "卡牌构建",
//             "肉鸽挑战"
//         ],
//         "platforms": ["PC", "PS_Xbox", "Switch", "Mobile"],
//         "platformCode": 1
//     },
//     {
//         "name": "猛兽派对 (Party Animals)",
//         "appid": "1260320",
//         "yearForSale": 2023,
//         "price": 98.0,
//         "favorableRate": 78.55,
//         "tags": "dataset\\2023\\tags_1260320.csv",
//         "discounts": "dataset\\2023\\discounts_1260320.csv",
//         "players": "dataset\\2023\\players_1260320.csv",
//         "totalComments": 73171,
//         "categories": [
//             "多人竞技",
//             "动作格斗",
//             "休闲治愈"
//         ],
//         "platforms": ["PC", "PS_Xbox"],
//         "platformCode": 7
//     },
//     {
//         "name": "完蛋！我被美女包围了！ (Love Is All Around)",
//         "appid": "2322560",
//         "yearForSale": 2023,
//         "price": 42.0,
//         "favorableRate": 91.63,
//         "tags": "dataset\\2023\\tags_2322560.csv",
//         "discounts": "dataset\\2023\\discounts_2322560.csv",
//         "players": "dataset\\2023\\players_2322560.csv",
//         "totalComments": 45787,
//         "categories": [
//             "模拟建造",
//             "角色扮演",
//             "剧情叙事"
//         ],
//         "platforms": ["PC", "PS_Xbox", "Switch", "Mobile"],
//         "platformCode": 1
//     },
//     {
//         "name": "逸剑风云决 (Wandering Sword)",
//         "appid": "1876890",
//         "yearForSale": 2023,
//         "price": 78.0,
//         "favorableRate": 93.06,
//         "tags": "dataset\\2023\\tags_1876890.csv",
//         "discounts": "dataset\\2023\\discounts_1876890.csv",
//         "players": "dataset\\2023\\players_1876890.csv",
//         "totalComments": 38409,
//         "categories": [
//             "角色扮演",
//             "剧情叙事",
//             "策略战棋"
//         ],
//         "platforms": ["PC", "PS_Xbox", "Switch"],
//         "platformCode": 6
//     },
//     {
//         "name": "Black Myth: Wukong",
//         "appid": "2358720",
//         "yearForSale": 2024,
//         "price": 268.0,
//         "favorableRate": 96.59,
//         "tags": "dataset\\2024\\tags_2358720.csv",
//         "discounts": "dataset\\2024\\discounts_2358720.csv",
//         "players": "dataset\\2024\\players_2358720.csv",
//         "totalComments": 1186287,
//         "categories": [
//             "角色扮演",
//             "动作格斗",
//             "奇幻神话",
//             "剧情叙事"
//         ],
//         "platforms": ["PC", "PS_Xbox"],
//         "platformCode": 7
//     },
//     {
//         "name": "The Hungry Lamb: Traveling in the Late Ming Dynasty",
//         "appid": "2593370",
//         "yearForSale": 2024,
//         "price": 37.0,
//         "favorableRate": 94.93,
//         "tags": "dataset\\2024\\tags_2593370.csv",
//         "discounts": "dataset\\2024\\discounts_2593370.csv",
//         "players": "dataset\\2024\\players_2593370.csv",
//         "totalComments": 56660,
//         "categories": [
//             "恐怖悬疑",
//             "角色扮演",
//             "剧情叙事"
//         ],
//         "platforms": ["PC", "Mobile"],
//         "platformCode": 5
//     }
// ];

// // 2. 配置与比例尺
// const width = 1200;
// const flowerSize = 150;
// const cols = 5;
// const rows = Math.ceil(games.length / cols);
// const height = rows * (flowerSize + 80) + 50; // 增加高度以容纳标签

// // 花瓣路径 (4个来自index1 + 5个新生成的)
// const petalPaths = [
//     // 1. Round (Index1)
//     "M0 0 C50 50 50 100 0 100 C-50 100 -50 50 0 0",
//     // 2. Pointy (Index1)
//     "M-35 0 C-25 25 25 25 35 0 C50 25 25 75 0 100 C-25 75 -50 25 -35 0",
//     // 3. Split/Notched (Index1)
//     "M0 0 C50 40 50 70 20 100 L0 85 L-20 100 C-50 70 -50 40 0 0",
//     // 4. Simple Leaf (Index1)
//     "M0 0 C50 25 50 75 0 100 C-50 75 -50 25 0 0",
//     // 5. New: Slender Needle
//     "M0 0 C15 40 15 80 0 100 C-15 80 -15 40 0 0",
//     // 6. New: Diamond/Kite
//     "M0 0 Q40 50 0 100 Q-40 50 0 0",
//     // 7. New: Wide Bulb
//     "M0 0 C60 30 60 70 0 100 C-60 70 -60 30 0 0",
//     // 8. New: Bottle Shape
//     "M0 0 C10 10 50 80 0 100 C-50 80 -10 10 0 0",
//     // 9. New: Oval
//     "M0 0 C40 0 40 100 0 100 C-40 100 -40 0 0 0"
// ];

// // 颜色比例尺 (Categories)
// const allCategories = Array.from(new Set(games.flatMap(d => d.categories)));
// const colorScale = d3.scaleOrdinal()
//     .domain(allCategories)
//     .range(["#FFB09E", "#CBF2BD", "#AFE9FF", "#FFC8F0", "#FFF2B4", "#FFD700", "#40E0D0", "#FF69B4", "#8A2BE2", "#00FA9A", "#FFA07A", "#20B2AA", "#87CEFA", "#778899", "#B0C4DE"]);

// // 花瓣数量比例尺 (Total Comments -> 5 to 15)
// const minComments = d3.min(games, d => d.totalComments);
// const maxComments = d3.max(games, d => d.totalComments);
// const numPetalScale = d3.scaleQuantize()
//     .domain([minComments, maxComments])
//     .range([5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

// // 花朵大小比例尺 (Favorable Rate -> Scale Factor)
// const minRate = d3.min(games, d => d.favorableRate);
// const maxRate = d3.max(games, d => d.favorableRate);
// const sizeScale = d3.scaleLinear()
//     .domain([minRate, maxRate])
//     .range([0.3, 0.8]);

// // 形状比例尺 (Platform Code -> Path Index)
// // Platform Code 1-8 映射到 petalPaths 0-8
// const shapeScale = (code) => petalPaths[(code - 1) % petalPaths.length];


// // 3. 绘制流程
// const container = d3.select("#canvas");
// container.html(""); // 清空画布

// // 定义滤镜 (Blur) - 采用 index1 的参数
// const defsSvg = container.append("svg").attr("width", 0).attr("height", 0);
// const defs = defsSvg.append("defs");
// defs.append("filter")
//     .attr("id", "motionFilter")
//     .attr("width", "300%")
//     .attr("x", "-100%")
//     .append("feGaussianBlur")
//     .attr("in", "SourceGraphic")
//     .attr("stdDeviation", "8 8");

// // --- A. 图例区域 (Legend) ---
// const legendHeight = 180;
// const legendSvg = container.append("svg")
//     .attr("width", width)
//     .attr("height", legendHeight)
//     .style("display", "block")
//     .style("margin", "0 auto 20px auto")
//     .style("background", "#f9f9f9")
//     .style("border-radius", "8px");

// legendSvg.append("text")
//     .attr("x", width / 2)
//     .attr("y", 30)
//     .attr("text-anchor", "middle")
//     .style("font-family", "sans-serif")
//     .style("font-size", "20px")
//     .style("font-weight", "bold")
//     .style("fill", "#333")
//     .text("Platform Code 花瓣形状图例");

// const legendGroup = legendSvg.append("g")
//     .attr("transform", `translate(${width/2 - (8 * 80)/2 + 40}, 80)`);

// // 绘制 1-8 的形状图例
// for (let i = 1; i <= 8; i++) {
//     const g = legendGroup.append("g")
//         .attr("transform", `translate(${(i-1) * 80}, 0)`);
    
//     g.append("path")
//         .attr("d", shapeScale(i))
//         .attr("fill", "none")
//         .attr("stroke", "#444")
//         .attr("stroke-width", 2)
//         .attr("transform", "scale(0.4)");
        
//     g.append("text")
//         .attr("y", 60)
//         .attr("text-anchor", "middle")
//         .style("font-size", "14px")
//         .style("fill", "#555")
//         .text(`Code ${i}`);
// }


// // --- B. 主内容区域 (Grid) ---
// const mainSvg = container.append("svg")
//     .attr("width", width)
//     .attr("height", height)
//     .style("display", "block")
//     .style("margin", "0 auto");

// const flowers = mainSvg.selectAll("g.flower")
//     .data(games)
//     .enter()
//     .append("g")
//     .attr("class", "flower")
//     .attr("transform", (d, i) => {
//         // 一行五个
//         const x = (i % cols) * (width / cols) + (width / cols) / 2;
//         const y = Math.floor(i / cols) * (flowerSize + 80) + 100;
//         return `translate(${x}, ${y})`;
//     });

// // 1. 绘制光晕层 (Halo) - 依据 categories 数量
// flowers.each(function(d) {
//     const g = d3.select(this);
//     const categories = d.categories; // 2-4 个分类
//     const scale = sizeScale(d.favorableRate);
    
//     // 遍历分类生成光晕圆
//     categories.forEach((cat, i) => {
//         const angle = (i / categories.length) * 2 * Math.PI;
//         // 稍微错开圆心
//         const offset = 25 * scale; 
//         const cx = Math.cos(angle) * offset;
//         const cy = Math.sin(angle) * offset;
        
//         const r = 45 * scale; // 光晕半径

//         g.append("circle")
//             .attr("cx", cx)
//             .attr("cy", cy)
//             .attr("r", r)
//             .attr("fill", colorScale(cat))
//             .style("mix-blend-mode", "multiply") // 混合模式
//             .style("filter", "url(#motionFilter)") // 模糊滤镜
//             .attr("opacity", 0.7);
//     });
// });

// // 2. 绘制花瓣 (Petals) - 依据 Platform Code 和 Comments
// flowers.each(function(d) {
//     const g = d3.select(this);
//     const numPetals = numPetalScale(d.totalComments);
//     const path = shapeScale(d.platformCode);
//     const scale = sizeScale(d.favorableRate);
    
//     for (let i = 0; i < numPetals; i++) {
//         g.append("path")
//             .attr("d", path)
//             .attr("fill", "none")
//             .attr("stroke", "#444") // 线条颜色
//             .attr("stroke-width", 1.5 / scale) // 保持线条视觉宽度一致
//             .attr("transform", `rotate(${(360 / numPetals) * i}) scale(${scale})`);
//     }
    
//     // 花心
//     g.append("circle")
//         .attr("r", 3)
//         .attr("fill", "#444");
// });

// // 3. 添加文本标签
// flowers.append("text")
//     .attr("y", 90)
//     .attr("text-anchor", "middle")
//     .style("font-family", "sans-serif")
//     .style("font-size", "12px")
//     .style("font-weight", "bold")
//     .style("fill", "#333")
//     .text(d => d.name.length > 15 ? d.name.substring(0, 15) + "..." : d.name);

// flowers.append("text")
//     .attr("y", 110)
//     .attr("text-anchor", "middle")
//     .style("font-family", "sans-serif")
//     .style("font-size", "10px")
//     .style("fill", "#666")
//     .text(d => `Rate: ${d.favorableRate}% | Code: ${d.platformCode}`);
