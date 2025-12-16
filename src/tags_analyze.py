import pandas as pd
import numpy as np
import json
import os
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.preprocessing import MinMaxScaler

# ================= 配置区域 =================
GAME_JSON_FILE = 'dataset\\games.json'  # 你的主索引文件
DATASET_ROOT = ''             # 如果 dataset 就在当前目录下，留空
OUTPUT_FILE = 'dataset\\tag_heat_clusters.json'
N_CLUSTERS = 16                # 你想把所有 Tag 分成几个大圆圈（类别）

# 权重配置
W_PLAYERS = 0.5
W_RATE = 0.3
W_RETENTION = 0.2
# ===========================================

def calculate_heat(games_list):
    """
    步骤 0: 先算好每个游戏的热度，后面直接查表调用
    """
    df = pd.DataFrame(games_list)
    
    # 1. 数据清洗与转换
    # 你的 JSON 里 max_players 对应的是哪个字段？
    # 根据你之前的描述，JSON 里是 "players": "路径"，但你需要的是人数数值。
    # 假设你已经把人数提取到了主 JSON 里，或者我们需要去 players csv 里读最大值？
    # **修正**：通常 dashboard 数据源里会把清洗好的 max_players 放进 json。
    # 如果 json 里没有 max_players 数字，只有 csv 路径，那我们需要读 csv。
    # 这里为了代码运行，我假设 json 对象里已经有了 'maxPlayers' 或 'totalComments' 做近似，
    # 或者你之前的 'new_processed_games.json' 里已经有 'max_players'。
    
    # 为了演示，我假设 json 里已经有了清洗好的数值字段 'max_players', 'retention_days'
    # 如果是原始 game.json 只有路径，你需要先跑一个预处理脚本把数值读出来。
    # 这里暂用 totalComments 代替 players 演示归一化流程，实际请换回你的 max_players
    
    # 模拟数据列存在 (请确保你的 JSON 里有这些数值键，而不是文件路径)
    # 如果没有，请先处理 game.json 增加数值字段
    cols = ['totalComments', 'favorableRate', 'yearForSale'] 
    # 注意：这里暂时用 totalComments 模拟热度，实际请用清洗好的 max_players
    
    # 归一化处理
    scaler = MinMaxScaler()
    
    # Log 处理人数 (防止头部效应过大)
    p_log = np.log10(df['totalComments'].replace(0, 1)) 
    r_val = df['favorableRate']
    # 假设有个 retention 字段，如果没有，暂给个默认值
    l_val = df.get('retention_days', pd.Series([10]*len(df))) 

    # 归一化
    p_norm = scaler.fit_transform(p_log.values.reshape(-1, 1)).flatten()
    r_norm = scaler.fit_transform(r_val.values.reshape(-1, 1)).flatten()
    l_norm = scaler.fit_transform(l_val.values.reshape(-1, 1)).flatten()

    # 计算最终热度
    heat_scores = (p_norm * W_PLAYERS + r_norm * W_RATE + l_norm * W_RETENTION) * 100
    
    # 返回 id -> heat 的字典 (假设 name 是唯一的)
    return dict(zip(df['name'], heat_scores))

def main():
    # --- 步骤 1: 读取游戏列表 ---
    print(f"1. 读取 {GAME_JSON_FILE} ...")
    with open(GAME_JSON_FILE, 'r', encoding='utf-8') as f:
        games = json.load(f)
    
    # 计算热度字典
    game_heat_map = calculate_heat(games)

    # --- 步骤 2: 遍历所有游戏，提取所有 Tags ---
    print("2. 正在提取所有 Tags (这可能需要一点时间)...")
    
    # 数据结构设计：
    # all_tags_corpus: 列表，每个元素是一个游戏的所有Tag拼成的字符串 "RPG Action Indie"
    # game_names: 列表，记录顺序对应的游戏名
    all_tags_corpus = []
    game_names = []
    
    for game in games:
        # 1. 构造路径
        # 你的 json 格式: "tags": "dataset\\2018\\tags_838350.csv"
        # 需要把双斜杠处理一下
        rel_path = game['tags'].replace('\\', '/')
        full_path = os.path.join(DATASET_ROOT, rel_path)
        
        tags_list = []
        if os.path.exists(full_path):
            try:
                # 读取 CSV，假设没有表头或第一列是 tag
                # 通常 tags.csv 内容可能是：
                # tag, count
                # RPG, 100
                df_t = pd.read_csv(full_path)
                # 假设第一列是 Tag 名称
                tags_list = df_t.iloc[:, 0].astype(str).tolist()
            except Exception as e:
                # print(f"  读取失败: {full_path}")
                pass
        else:
            # print(f"  文件不存在: {full_path}")
            pass
            
        # 2. 存下来
        # 将该游戏的 tag 列表转为字符串，作为特征
        # 例如: "RPG Indie Strategy"
        all_tags_corpus.append(" ".join(tags_list))
        game_names.append(game['name'])

    print(f"   已处理 {len(all_tags_corpus)} 个游戏的数据。")

    # --- 步骤 3: 向量化 (Vectorization) ---
    print("3. 构建 Tag 矩阵...")
    
    # 我们需要构建一个矩阵：行 = Tag, 列 = Game
    # 这里的 CountVectorizer 默认生成的是 (Game x Tag)
    vectorizer = CountVectorizer(binary=True, min_df=2) # min_df=2 过滤掉只出现过1次的生僻Tag
    X = vectorizer.fit_transform(all_tags_corpus)
    
    # 获取所有的 Tag 名字
    feature_names = vectorizer.get_feature_names_out()
    
    # 转置矩阵！变成 (Tag x Game)
    # 这样每一行代表一个 Tag，向量内容是它出现在了哪些游戏中
    tag_vectors = X.T
    
    print(f"   共提取到 {len(feature_names)} 个有效 Tag (去重后)。")

    # --- 步骤 4: K-Means 聚类 (分类) ---
    print(f"4. 执行 K-Means 聚类 (K={N_CLUSTERS})...")
    
    kmeans = KMeans(n_clusters=N_CLUSTERS, random_state=42)
    kmeans.fit(tag_vectors)
    
    # labels_[i] 表示第 i 个 Tag 属于哪个簇
    tag_labels = kmeans.labels_

    # --- 步骤 5: 统计每个圆圈的热度 ---
    print("5. 统计圆圈热度...")
    
    # 准备结果容器
    clusters = {} # key: cluster_id, value: {heat: 0, tags: [], games: set()}
    
    for i in range(N_CLUSTERS):
        clusters[i] = {'tags': [], 'related_games': set(), 'total_heat': 0}

    # 遍历每个 Tag，看它属于哪个簇
    # tag_vectors 是 sparse matrix，我们需要高效访问
    # convert to array might be huge, let's look at non-zero indices
    
    # 为了简化逻辑，我们遍历 feature_names
    for i, tag_name in enumerate(feature_names):
        cluster_id = tag_labels[i]
        clusters[cluster_id]['tags'].append(tag_name)
        
        # 找出这个 Tag 出现在哪些游戏里
        # tag_vectors[i] 是第 i 个 Tag 的向量
        # nonzero()[1] 返回的是列索引，也就是 game_names 的索引
        game_indices = tag_vectors[i].nonzero()[1]
        
        for g_idx in game_indices:
            g_name = game_names[g_idx]
            clusters[cluster_id]['related_games'].add(g_name)

    # --- 步骤 6: 汇总计算 ---
    final_output = []
    
    for cid, data in clusters.items():
        # 计算该簇的总热度
        # 注意：这里使用了 set 来存储游戏名，所以如果一个游戏包含了该簇内的多个 Tag，
        # 它的热度只会被计算一次！(这是正确的，防止重复计算)
        current_heat_sum = 0
        for g_name in data['related_games']:
            current_heat_sum += game_heat_map.get(g_name, 0)
        
        # 选出代表性的 Tag (该簇内出现频次最高的 Tag)
        # 这里简单取列表第一个，优化的话可以按词频排序
        top_tags = data['tags'][:10] # 只保留前10个展示
        main_tag = top_tags[0] if top_tags else f"Group {cid}"

        final_output.append({
            "name": main_tag,         # 圆圈的名字 (取该类里一个Tag名)
            "value": round(current_heat_sum, 2), # 圆圈的大小 (热度)
            "detail_tags": top_tags,  # 鼠标放上去可以展示包含哪些Tag
            "game_count": len(data['related_games'])
        })

    # 按热度排序
    final_output.sort(key=lambda x: x['value'], reverse=True)

    # 包装成 D3.js 需要的格式
    d3_data = {
        "name": "root",
        "children": final_output
    }

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(d3_data, f, ensure_ascii=False, indent=2)
        
    print(f"完成！数据已保存至 {OUTPUT_FILE}")

if __name__ == "__main__":
    main()