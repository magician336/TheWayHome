import pandas as pd
import numpy as np
import json
import os
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler

# =================配置区域=================
INPUT_FILE = 'new_processed_games.json'
OUTPUT_FILE = '多元变量关系分析.json'

# 定义自变量 (X): 游戏自身的属性
# 对应你的需求：年份、售价、打折力度
FEATURE_COLS = ['year', 'original_price', 'discount_strength']

# 定义因变量 (Y): 我们想探究的结果
# 对应你的需求：好评率、最大游玩人数、留存、(额外加一个热度/评论数)
TARGET_COLS = ['favorable_rate', 'max_players', 'retention_days', 'total_comments']

# 为了让前端显示更好看，做一个字段名的中文映射
NAME_MAPPING = {
    'year': '年份',
    'original_price': '原价',
    'discount_strength': '折扣力度',
    'favorable_rate': '好评率',
    'max_players': '在线人数峰值',
    'retention_days': '留存天数',
    'total_comments': '总评论数(热度)'
}
# =========================================

def main():
    # 1. 读取数据
    if not os.path.exists(INPUT_FILE):
        print(f"错误: 找不到文件 {INPUT_FILE}")
        return

    try:
        df = pd.read_json(INPUT_FILE)
        print(f"成功读取数据，共 {len(df)} 条记录。")
    except ValueError:
        print("JSON格式错误，请检查文件内容。")
        return

    # 2. 数据清洗
    # 提取我们需要的列，并去除含有空值的行，防止报错
    model_df = df[FEATURE_COLS + TARGET_COLS].dropna()
    
    # 简单处理：如果 max_players 差异过大（幂律分布），线性回归效果可能不好
    # 建议：实际分析中通常会对人数做 log 处理，但在本可视化Demo中暂时保持原样直观展示
    
    # 3. 准备结果容器
    analysis_result = {
        "meta": {
            "description": "基于多元线性回归的属性影响力分析",
            "features": [NAME_MAPPING[f] for f in FEATURE_COLS]
        },
        "regression_results": [], # 存放回归系数
        "correlation_heatmap": [] # 存放相关性热力图数据
    }

    # ================= 核心建模部分 =================

    # 步骤 A: 数据标准化 (Standard Scaler)
    # 将 X 转换为均值为0，方差为1的标准正态分布，以便比较系数权重
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(model_df[FEATURE_COLS])

    # 步骤 B: 对每个目标 Y 进行回归分析
    for target in TARGET_COLS:
        y = model_df[target].values
        
        # 实例化并训练模型
        model = LinearRegression()
        model.fit(X_scaled, y)
        
        # 获取系数 (Coefficients) - 这就是“影响力”
        # 正值代表正相关（促进），负值代表负相关（抑制）
        weights = model.coef_
        r2_score = model.score(X_scaled, y) # 模型的拟合度 (0-1)

        # 封装该目标变量的分析结果
        target_analysis = {
            "target_name": NAME_MAPPING[target],     # 中文名，如“好评率”
            "target_key": target,                    # 原始key
            "r2_score": round(r2_score, 4),          # 模型解释力
            "bias": round(model.intercept_, 2),      # 截距
            "influence": []                          # 存放具体权重
        }

        # 整理每个特征的权重
        for idx, col_name in enumerate(FEATURE_COLS):
            target_analysis["influence"].append({
                "feature": NAME_MAPPING[col_name],
                "weight": round(weights[idx], 4)     # 保留4位小数
            })

        analysis_result["regression_results"].append(target_analysis)

    # 步骤 C: 计算皮尔逊相关系数矩阵 (用于绘制热力图)
    # 这是一个 n x n 的矩阵
    corr_matrix = model_df.corr()
    
    # 将矩阵转换为 ECharts 热力图需要的格式: [x_index, y_index, value]
    # 我们只关心 Features (X轴) vs Targets (Y轴) 的关系
    heatmap_data = []
    
    for i, feature in enumerate(FEATURE_COLS):
        for j, target in enumerate(TARGET_COLS):
            # 获取两个变量的相关系数
            val = corr_matrix.loc[feature, target]
            # ECharts 格式: [X坐标索引, Y坐标索引, 数值]
            heatmap_data.append([i, j, round(val, 2)])

    analysis_result["correlation_heatmap"] = {
        "x_axis": [NAME_MAPPING[f] for f in FEATURE_COLS],
        "y_axis": [NAME_MAPPING[t] for t in TARGET_COLS],
        "data": heatmap_data
    }

    # 4. 导出 JSON
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(analysis_result, f, ensure_ascii=False, indent=2)

    print(f"分析完成！文件已生成: {OUTPUT_FILE}")
    print("你可以使用该 JSON 文件在前端绘制 '雷达图' (展示权重) 或 '热力图' (展示相关性)。")

if __name__ == "__main__":
    main()