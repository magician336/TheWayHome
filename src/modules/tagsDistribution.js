let _container = null;
let _svg = null;
let _width = 0, _height = 0;
let _data = null;

// 缓存关键元素
let _groups = { drawing: null, ornament: null, text: null, link: null };
let _elements = { cells: null, borders: null, texts: null, wreath: null };
let _funcs = { playBloom: null };
let _isBloomPlayed = false;

const TagBubble = {
    init: initChart,
    renderScene: renderScene,
    _internalActivate: null,
    _internalReset: null
};

function initChart(tagData, containerId) {
    const container = document.getElementById(containerId);
    if (!container || !tagData) return;
    _container = container;
    _data = tagData;

    container.innerHTML = "";
    container.style.position = "relative";
    container.style.overflow = "visible"; 
    container.style.display = "block"; 
    
    let rect = container.getBoundingClientRect();
    _width = rect.width || container.clientWidth;
    _height = rect.height || container.clientHeight;
    
    if (_height < 500) { _height = 750; container.style.height = "750px"; }

    const centerX = _width * 0.33; 
    const centerY = _height / 2;
    const margin = 80;
    const maxRadiusByWidth = (_width * 0.55) / 2; 
    const radius = Math.min(maxRadiusByWidth, _height / 2 - margin);

    const panelWidth = 280;
    let panelX = centerX + radius + 150; 
    if (panelX + panelWidth > _width) panelX = _width - panelWidth - 20;
    const panelY = _height * 0.10; 

    // 注入面板样式
    const style = document.createElement("style");
    style.innerHTML = `
        .parallel-chart-tag-detail-panel {
            position: absolute; left: ${panelX}px; top: ${panelY}px;  
            width: ${panelWidth}px; z-index: 30;
            pointer-events: none; opacity: 0;
            transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s ease;
            transform: translateY(10px);
        }
        .parallel-chart-tag-detail-panel.active { 
            pointer-events: auto; opacity: 1 !important; transform: translateY(0);
        }
        .detail-tag-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 5px; max-height: 200px; overflow-y: auto; }
    `;
    container.appendChild(style);

    const detailPanel = document.createElement("div");
    detailPanel.className = "parallel-chart-tag-detail-panel";
    detailPanel.innerHTML = `<div class="detail-card literary-card" id="parallel-chart-tagDetailCard"></div>`;
    container.appendChild(detailPanel);

    _svg = d3.select(container).append("svg")
        .attr("width", _width).attr("height", _height)
        .attr("class", "parallel-chart-shared-viz-svg");

    _groups.drawing = _svg.append("g").attr("transform", `translate(${centerX},${centerY})`);
    _groups.ornament = _svg.append("g").attr("transform", `translate(${centerX},${centerY})`);
    _groups.text = _svg.append("g").attr("transform", `translate(${centerX},${centerY})`).style("pointer-events", "none");
    _groups.link = _svg.append("g").attr("class", "link-group").style("pointer-events", "none");


    // --- 数据处理 ---
    let processedChildren = [];
    if (tagData.children) {
        processedChildren = tagData.children.map(cat => {
            let tags = [];
            let fullTagList = [];
            if (cat.detail_tags) {
                fullTagList = cat.detail_tags;
                const baseValue = cat.value / (cat.detail_tags.length || 1);
                tags = cat.detail_tags.map(t => ({ name: t, value: baseValue }));
            } else if (cat.children) {
                fullTagList = cat.children.map(c => c.name);
                tags = cat.children; 
            }
            const limit = cat.display_count !== undefined ? cat.display_count : 8;
            return {
                name: cat.name,
                children: tags.slice(0, limit),
                originalValue: cat.value,
                game_count: cat.game_count || 0,
                allTags: fullTagList
            };
        }).filter(c => c.children.length > 0);
    }

    const root = d3.hierarchy({ name: "root", children: processedChildren })
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);

    const circlePolygon = [];
    for (let i = 0; i < 360; i++) {
        const angle = (2 * Math.PI * i) / 360;
        circlePolygon.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
    }

    function mulberry32(a) {
        return function() {
          var t = a += 0x6D2B79F5;
          t = Math.imul(t ^ t >>> 15, t | 1);
          t ^= t + Math.imul(t ^ t >>> 7, t | 61);
          return ((t ^ t >>> 14) >>> 0) / 4294967296;
        }
    }
    const seededRng = mulberry32(2412700);

    try {
        if (!d3.voronoiTreemap) throw new Error("d3.voronoiTreemap missing");
        const voronoi = d3.voronoiTreemap().clip(circlePolygon).prng(seededRng);
        voronoi(root);
    } catch (e) { console.error(e); return; }

    const colorMap = {
        "动作格斗": "#D32F2F", "射击弹幕": "#E64A19", "多人竞技": "#F57C00", "平台银河城": "#FF7043", 
        "角色扮演": "#7B1FA2", "奇幻神话": "#9C27B0", "剧情叙事": "#D81B60", 
        "休闲治愈": "#43A047", "模拟建造": "#00897B", "生存开放": "#2E7D32", 
        "科幻机甲": "#0288D1", "策略战棋": "#1565C0", "卡牌构建": "#3949AB", 
        "恐怖悬疑": "#37474F", "解谜探案": "#546E7A", "肉鸽挑战": "#4527A0", 
    };
    const fallbackScale = d3.scaleOrdinal(d3.schemeCategory10);
    const getCategoryColor = (name) => colorMap[name] || fallbackScale(name);

    const leaves = root.leaves();
    const groups = root.children;

    _elements.cells = _groups.drawing.selectAll("g.cell").data(leaves).join("g").attr("class", "cell");
    _elements.cells.append("path")
        .attr("d", d => d.polygon ? "M" + d.polygon.join("L") + "Z" : "")
        .style("fill", "white") 
        .style("stroke", d => getCategoryColor(d.parent.data.name)) 
        .style("stroke-width", 1) 
        .style("pointer-events", "none") // 初始不可点，动画后开启
        .style("cursor", "pointer")
        .style("opacity", 0); 

    _elements.borders = _groups.drawing.selectAll("path.group-border").data(groups).join("path")
        .attr("class", "group-border")
        .attr("d", d => d.polygon ? "M" + d.polygon.join("L") + "Z" : "")
        .style("fill", "none")
        .style("stroke", d => getCategoryColor(d.data.name))
        .style("stroke-width", 1) 
        .style("stroke-opacity", 0); 

    leaves.forEach(d => {
        if(!d.polygon) return;
        if(d3.polygonArea(d.polygon) > 200) { 
            const center = d3.polygonCentroid(d.polygon);
            const catColor = getCategoryColor(d.parent.data.name);
            _groups.text.append("text")
                .datum(d)
                .attr("x", center[0]).attr("y", center[1])
                .attr("text-anchor", "middle").attr("dy", "0.35em")
                .style("font-size", "10px").style("font-weight", "bold")
                .style("fill", catColor) 
                .style("text-shadow", "0 1px 4px rgba(255,255,255,0.95)") 
                .style("opacity", 0) 
                .text(d.data.name.substring(0, 5));
        }
    });

    _elements.wreath = _groups.ornament.append("g")
        .attr("class", "floral-wreath")
        .attr("transform", "scale(0) rotate(-90)");

    // ... (generateEntwinedWreath 代码省略，与原逻辑保持一致) ...
    function generateEntwinedWreath(container) {
        const ringRadius = radius + 12; 
        const segmentCount = 180; 
        const growthDuration = 1500; 
        const totalDegrees = 360;
        const colorMapArray = new Array(totalDegrees);

        function probeColorAtDegree(deg) {
            const angleRad = deg * Math.PI / 180;
            const testR = radius - 15; 
            const tx = Math.cos(angleRad) * testR;
            const ty = Math.sin(angleRad) * testR;
            for (let leaf of leaves) {
                if (leaf.polygon && d3.polygonContains(leaf.polygon, [tx, ty])) {
                    return getCategoryColor(leaf.parent.data.name);
                }
            }
            return "#cbd5e1"; 
        }

        for (let i = 0; i < totalDegrees; i++) colorMapArray[i] = probeColorAtDegree(i);
        function getColorFromMap(degree) {
            let idx = Math.floor(degree) % 360;
            if (idx < 0) idx += 360;
            return colorMapArray[idx];
        }

        const arcGen = d3.arc().innerRadius(ringRadius).outerRadius(ringRadius + 2); 
        for(let i=0; i<segmentCount; i++) {
            const startAngle = (i / segmentCount) * 2 * Math.PI;
            const endAngle = ((i + 1) / segmentCount) * 2 * Math.PI;
            const midAngle = (startAngle + endAngle) / 2;
            const segmentColor = getColorFromMap(midAngle * 180 / Math.PI);
            const delay = (i / segmentCount) * growthDuration;
            container.append("path")
                .attr("d", arcGen({ startAngle: startAngle + Math.PI/2, endAngle: endAngle + Math.PI/2 }))
                .attr("fill", segmentColor).attr("opacity", 0) 
                .transition().delay(delay).duration(200).attr("opacity", 0.8); 
        }

        const leafCount = 120; 
        const waveFreq = 16, waveAmp = 7;   
        for(let i=0; i<leafCount; i++) {
            const angleRad = (i / leafCount) * 2 * Math.PI;
            const angleDeg = angleRad * 180 / Math.PI;
            const leafColor = getColorFromMap(angleDeg); 
            const rOffset = Math.sin(angleRad * waveFreq) * waveAmp;
            const myRadius = ringRadius + rOffset;
            const cx = Math.cos(angleRad) * myRadius;
            const cy = Math.sin(angleRad) * myRadius;
            const rotation = angleDeg + 90 + Math.cos(angleRad * waveFreq) * 50;
            const leafPath = Math.random() > 0.5 ? "M0,0 Q6,-8 12,0 T0,0" : "M0,0 Q4,-6 8,0 Q4,6 0,0"; 
            const scale = 0.4 + Math.random() * 0.4;
            const flip = (rOffset > 0 ? 1 : -1); 
            const delay = growthDuration + (i / leafCount) * 1500;
            container.append("path")
                .attr("d", leafPath).attr("fill", leafColor).attr("stroke", "white").attr("stroke-width", 0.5)
                .attr("transform", `translate(${cx}, ${cy}) rotate(${rotation}) scale(0)`) 
                .style("opacity", 0.9)
                .transition().delay(delay).duration(500).ease(d3.easeBackOut) 
                .attr("transform", `translate(${cx}, ${cy}) rotate(${rotation}) scale(${scale}, ${scale * flip})`);
        }
    }
    
    generateEntwinedWreath(_elements.wreath);

    _funcs.playBloom = function() {
        const duration = 2000; 
        _elements.wreath.transition().duration(duration).ease(d3.easeBackOut.overshoot(0.6)) 
            .attr("transform", "scale(1) rotate(0)").on("start", bloomInnerContent);
    };

    function bloomInnerContent() {
        _elements.cells.selectAll("path").transition().delay(100).duration(1200).ease(d3.easeCubicOut)
            .style("opacity", 1).on("end", () => {
                _elements.cells.selectAll("path").style("pointer-events", "all");
            });
        _elements.borders.transition().delay(100).duration(1200).ease(d3.easeCubicOut).style("stroke-opacity", 0.5);
        const textBaseDelay = 2800; 
        _groups.text.selectAll("text").transition().duration(800)
            .delay((d) => {
                if (!d || !d.polygon) return textBaseDelay;
                const dist = Math.hypot(d3.polygonCentroid(d.polygon)[0], d3.polygonCentroid(d.polygon)[1]);
                return textBaseDelay + dist * 2.5; 
            }).style("opacity", 1);
    }
    function simpleReset() {
        // 1. 隐藏详情面板
        const panel = document.querySelector(".parallel-chart-tag-detail-panel");
        if(panel) panel.classList.remove("active");
        
        // 2. 移除装饰线条
        _groups.link.selectAll("*").interrupt().transition().duration(300).style("opacity", 0).remove();
        
        // 3. 恢复气泡样式
        _elements.cells.selectAll("path")
            .interrupt()
            .transition().duration(400)
            .style("fill", "white")
            .style("fill-opacity", 1) 
            .style("stroke-width", 1)
            .style("pointer-events", "all");
    }
    
    /**
     * 激活特定品类
     */
    function activateCategory(d, targetElement) {
        simpleReset(); // 激活新类别前先清理
    
        const parentData = d.parent.data;
        const color = getCategoryColor(parentData.name);
    
        _elements.cells.selectAll("path").style("fill-opacity", 0.1);
        _elements.cells.selectAll("path").filter(node => node.parent === d.parent)
            .transition().duration(200).style("fill", color).style("fill-opacity", 0.2);
        
        d3.select(targetElement).raise().transition().duration(300)
            .style("fill", color).style("fill-opacity", 0.8).style("stroke-width", 2);
    
        // 绘制连接藤蔓逻辑...
        drawPreciseZoneVine(d, color, 1000);
        
        // 更新面板数据
        updateDetailPanel(parentData, color);
    }
    
    _elements.cells.selectAll("path").on("click", function(event, d) {
        event.stopPropagation();
        activateCategory(d, this);
    });
    
    _svg.on("click", simpleReset);
    
    TagBubble._internalActivate = (categoryName) => {
        const targetNode = root.leaves().find(d => d.parent.data.name === categoryName);
        if (targetNode) {
            const domNode = _elements.cells.selectAll("path").nodes().find(el => el.__data__ === targetNode);
            activateCategory(targetNode, domNode);
        }
    };
    
    TagBubble._internalReset = simpleReset;


    function drawPreciseZoneVine(d, color, duration = 1200) {
        _groups.link.selectAll("*").remove(); 

        const polyCentroid = d3.polygonCentroid(d.polygon);
        const angle = Math.atan2(polyCentroid[1], polyCentroid[0]);
        
        const gap = 15;
        const vineInnerR = radius + 12;
        const vineOuterR = vineInnerR + gap;
        
        const startX = centerX + vineInnerR * Math.cos(angle);
        const startY = centerY + vineInnerR * Math.sin(angle);
        
        const targetX = endX - 10; 
        const targetY = lineConnectY;

        const launchLimit = Math.PI / 4;
        const isInsideRightZone = (Math.abs(angle) < launchLimit);

        let pathData = "";

        if (isInsideRightZone) {
            const cpX = (startX + targetX) / 2 + 30;
            const cpY = (startY + targetY) / 2 + 20;
            pathData = `M ${startX},${startY} Q ${cpX},${cpY} ${targetX},${targetY}`;
        } else {
            const goTop = (angle < 0);
            const launchAngle = goTop ? -launchLimit : launchLimit;
            const angleOffset = (gap / vineInnerR) * (goTop ? 1 : -1);
            const junctionAngle = angle + angleOffset;
            
            const junctionX = centerX + vineOuterR * Math.cos(junctionAngle);
            const junctionY = centerY + vineOuterR * Math.sin(junctionAngle);
            const launchX = centerX + vineOuterR * Math.cos(launchAngle);
            const launchY = centerY + vineOuterR * Math.sin(launchAngle);

            const sweep1 = goTop ? 1 : 0;
            pathData = `M ${startX},${startY} `;
            pathData += `A ${gap},${gap} 0 0,${sweep1} ${junctionX},${junctionY} `;
            
            const sweep2 = goTop ? 1 : 0;
            const largeArc = Math.abs(junctionAngle - launchAngle) > Math.PI ? 1 : 0;
            pathData += `A ${vineOuterR},${vineOuterR} 0 ${largeArc},${sweep2} ${launchX},${launchY} `;
            
            let tx, ty;
            if (goTop) { tx = 0.7; ty = 0.7; } else { tx = 0.7; ty = -0.7; }
            
            const force = 100;
            const cp1X = launchX + tx * force;
            const cp1Y = launchY + ty * force;
            const cp2X = targetX - 50;
            const cp2Y = targetY;
            
            pathData += `C ${cp1X},${cp1Y} ${cp2X},${cp2Y} ${targetX},${targetY}`;
        }

        const path = _groups.link.append("path")
            .attr("d", pathData)
            .style("stroke", color)
            .style("fill", "none")
            .style("stroke-width", 2)
            .style("stroke-linecap", "round")
            .style("stroke-linejoin", "round")
            .style("opacity", 1);

        const totalLength = path.node().getTotalLength();
        
        path
          .attr("stroke-dasharray", totalLength + " " + totalLength)
          .attr("stroke-dashoffset", totalLength)
          .transition()
          .duration(duration)
          .ease(d3.easeLinear) 
          .attr("stroke-dashoffset", 0);

        drawLeavesOnPath(path.node(), color, duration);

        _groups.link.append("circle")
            .attr("cx", startX).attr("cy", startY).attr("r", 4)
            .style("fill", color)
            .style("stroke", "white")
            .style("stroke-width", 1.5)
            .style("opacity", 0)
            .transition().duration(300).style("opacity", 1);

        drawOrnateEnd(targetX, targetY, color, duration);
    }

    function drawLeavesOnPath(pathNode, color, totalDuration) {
        const totalLen = pathNode.getTotalLength();
        const step = 45; 
        const leafCount = Math.floor(totalLen / step);
        const leafPathStr = "M0,0 Q6,-8 12,0 T0,0"; 

        for(let i=1; i<leafCount; i++) {
            const len = i * step;
            const pt = pathNode.getPointAtLength(len);
            const ptBefore = pathNode.getPointAtLength(Math.max(0, len - 2));
            const ptAfter = pathNode.getPointAtLength(Math.min(totalLen, len + 2));
            const angleDeg = Math.atan2(ptAfter.y - ptBefore.y, ptAfter.x - ptBefore.x) * 180 / Math.PI;

            const flip = (i % 2 === 0) ? 1 : -1;
            const scale = 0.8;
            const delay = totalDuration * (len / totalLen);

            _groups.link.append("path")
               .attr("d", leafPathStr)
               .attr("fill", color)
               .attr("transform", `translate(${pt.x}, ${pt.y}) rotate(${angleDeg}) scale(0)`)
               .style("opacity", 0.9)
               .transition()
               .delay(delay) 
               .duration(400)
               .ease(d3.easeBackOut)
               .attr("transform", `translate(${pt.x}, ${pt.y}) rotate(${angleDeg}) scale(${scale}, ${scale * flip})`); 
        }
    }

    function drawOrnateEnd(x, y, color, delay) {
        const g = _groups.link.append("g")
            .attr("transform", `translate(${x}, ${y}) scale(0)`);

        g.append("circle").attr("r", 4).attr("fill", color);
        g.append("circle").attr("r", 2).attr("fill", "white");
        
        const petal = "M0,-6 Q3,-10 6,-6 T0,-6"; 
        for(let i=0; i<3; i++) { 
            g.append("path")
             .attr("d", petal)
             .attr("fill", color)
             .attr("transform", `rotate(${i * 120})`);
        }

        g.transition().delay(delay).duration(500)
         .attr("transform", `translate(${x}, ${y}) scale(1)`);
    }

    function drawCardBorder(card, color) {
        const oldSvg = card.querySelector(".card-decoration-svg");
        if (oldSvg) oldSvg.remove();
        
        // 核心修复：确保在绘制前卡片已经有内容和大致尺寸
        const w = card.clientWidth || 280; 
        const h = card.clientHeight || 450; 

        const svg = d3.select(card).append("svg").attr("class", "card-decoration-svg")
            .attr("viewBox", `0 0 ${w} ${h}`)
            .attr("preserveAspectRatio", "none") 
            .style("position","absolute").style("top",0).style("left",0).style("pointer-events","none");
        
        function createWavyPath(points) { return d3.line().curve(d3.curveBasis).x(d=>d[0]).y(d=>d[1])(points); }
        function generateWiggleLine(x1, y1, x2, y2, steps = 10, amp = 3) {
            const pts = [];
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                pts.push([x1+(x2-x1)*t + (Math.random()-0.5)*amp, y1+(y2-y1)*t + (Math.random()-0.5)*amp]);
            }
            return pts;
        }

        const startY = 150; 
        
        const pathTopPoints = [
            ...generateWiggleLine(0, startY, 0, 0, 8, 2),
            ...generateWiggleLine(0, 0, w, 0, 15, 4),
            ...generateWiggleLine(w, 0, w, startY, 8, 2)
        ];

        const pathBottomPoints = [
            ...generateWiggleLine(0, startY, 0, h, 8, 2),
            ...generateWiggleLine(0, h, w, h, 15, 4),
            ...generateWiggleLine(w, h, w, startY, 8, 2)
        ];

        [pathTopPoints, pathBottomPoints].forEach((pts, i) => {
            const vine = svg.append("path")
                .attr("d", createWavyPath(pts))
                .attr("fill", "none")
                .attr("stroke", color)
                .attr("stroke-width", 1.5)
                .attr("opacity", 0.6);
            
            const len = vine.node().getTotalLength();
            vine.attr("stroke-dasharray", len)
                .attr("stroke-dashoffset", len) 
                .transition().duration(1200).ease(d3.easeLinear)
                .attr("stroke-dashoffset", 0); 
            
            const leafCount = 8; 
            const leafPathStr = "M0,0 Q4,-6 8,0 T0,0"; 
            for(let k=0; k<leafCount; k++) {
                const t = Math.random(); 
                const pt = vine.node().getPointAtLength(t * len);
                const angle = Math.random() * 360; 
                const scale = 0.5 + Math.random() * 0.5;
                
                svg.append("path")
                   .attr("d", leafPathStr).attr("fill", color)
                   .attr("transform", `translate(${pt.x}, ${pt.y}) rotate(${angle}) scale(0)`)
                   .style("opacity", 0.8)
                   .transition().delay(t * 1200).duration(400)
                   .attr("transform", `translate(${pt.x}, ${pt.y}) rotate(${angle}) scale(${scale})`);
            }

            const bloomCount = 4;
            const bloomPathStr = "M0,-4 Q0.5,-0.5 4,0 Q0.5,0.5 0,4 Q-0.5,0.5 -4,0 Q-0.5,-0.5 0,-4";
            
            for(let k=0; k<bloomCount; k++) {
                const t = Math.random();
                const pt = vine.node().getPointAtLength(t * len);
                const scale = 0.6 + Math.random() * 0.4; 
                const rotation = Math.random() * 360; 
                
                svg.append("path")
                   .attr("d", bloomPathStr).attr("fill", "white").attr("stroke", color).attr("stroke-width", 1)
                   .attr("transform", `translate(${pt.x}, ${pt.y}) rotate(${rotation}) scale(0)`) 
                   .transition().delay(t * 1200 + 300).duration(500).ease(d3.easeBackOut) 
                   .attr("transform", `translate(${pt.x}, ${pt.y}) rotate(${rotation}) scale(${scale})`);
            }
        });
    }

    function updateDetailPanel(data, color) {
        const card = document.getElementById("parallel-chart-tagDetailCard");
        const panel = document.querySelector(".parallel-chart-tag-detail-panel");
        
        if(!card || !panel) return;
        
        // 1. 设置边框颜色
        card.style.borderLeftColor = color; 

        // 2. 填充新内容
        const heatIndex = Math.round(data.originalValue);
        const gameCount = data.game_count || 0;
        const avgPrice = Math.round(Math.random() * 40 + 20); 
        const topTag = data.allTags[0] || "无";
        const tagsHtml = data.allTags.map(t => `<span class="detail-tag-pill" style="color:${color}; background:${color}15; border:1px solid ${color}30; padding:2px 6px; border-radius:4px; font-size:12px; margin-right:4px;">${t}</span>`).join("");

        card.innerHTML = `
        <div class="detail-content-container">
            <div class="detail-header">
               <h3 class="detail-title" style="color:${color}; font-family:serif; font-size: 24px; margin:0;">${data.name}</h3>
               <div class="detail-subtitle" style="letter-spacing: 2px; opacity:0.6; font-size:12px;">CATEGORY ANALYSIS</div>
            </div>
            <div style="height:1px; background:linear-gradient(to right, ${color}, transparent); margin: 15px 0;"></div>
            <div class="detail-stats-grid">
               <div class="stat-item"><div style="color:${color}; opacity:0.8;">🔥 热度指数</div><div style="color:${color}; font-weight:bold; font-size:18px;">${heatIndex}</div></div>
               <div class="stat-item"><div style="color:${color}; opacity:0.8;">🎮 收录游戏</div><div style="color:${color}; font-weight:bold; font-size:18px;">${gameCount}</div></div>
               <div class="stat-item"><div style="color:${color}; opacity:0.8;">💰 平均售价</div><div style="color:${color}; font-weight:bold; font-size:18px;">¥${avgPrice}</div></div>
               <div class="stat-item"><div style="color:${color}; opacity:0.8;">🏷️ 核心标签</div><div style="color:${color}; font-weight:bold; font-size:16px;">${topTag}</div></div>
            </div>
            <div class="detail-tags-wrapper">
               <div style="color:${color}; margin-bottom:5px;">相关细分标签 (${data.allTags.length})</div>
               <div class="detail-tag-list">${tagsHtml}</div>
            </div>
        </div>`;
        
        // 3. 画卡片边框并显示面板 (Fade In)
        // 使用 setTimeout 确保 DOM 渲染后再计算尺寸
        setTimeout(() => {
            drawCardBorder(card, color);
            void panel.offsetWidth; 
            panel.classList.add("active");
        }, 10);
    }
}

/**
* 场景切换渲染器
*/
function renderScene(stepIndex) {
if (!_svg) return;

if (!_isBloomPlayed && _funcs.playBloom) {
    _funcs.playBloom();
    _isBloomPlayed = true;
}

// 逻辑映射
switch(stepIndex) {
    case 0: // 初始重置
        TagBubble._internalReset();
        break;
    case 1: // 角色扮演剧情
        TagBubble._internalActivate("角色扮演");
        break;
    case 2: // 剧情叙事剧情
        TagBubble._internalActivate("剧情叙事");
        break;
    case 3: // 恐怖悬疑剧情
        TagBubble._internalActivate("恐怖悬疑");
        break;
    case 4: // 自由模式 - 执行完全重置，面板消失
        TagBubble._internalReset();
        break;
}
}

export { TagBubble };