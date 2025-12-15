import json
import pandas as pd
import os
import numpy as np
from datetime import datetime, timedelta

# --- 配置项 ---
GAMES_JSON_PATH = 'dataset/games.json'
OUTPUT_JSON_PATH = 'dataset/new_processed_games.json'
SAMPLE_STEP = 7 

def process_data():
    print("🚀 开始数据预处理 (含时间归一化修正)...")
    
    if not os.path.exists(GAMES_JSON_PATH):
        print(f"❌ 错误: 找不到 {GAMES_JSON_PATH}")
        return

    with open(GAMES_JSON_PATH, 'r', encoding='utf-8') as f:
        games = json.load(f)

    processed_list = []
    current_time = datetime.now() # 获取当前时间用于计算总时长

    for game in games:
        game_name = game.get('name', 'Unknown')
        print(f"正在处理: {game_name}...")

        item = {
            'name': game_name,
            'year': game.get('yearForSale'),
            'original_price': game.get('price'),
            'favorable_rate': game.get('favorableRate'),
            'total_comments': game.get('totalComments'),
            
            'max_players': 0,
            'retention_days': 0,
            'discount_count': 0,
            'avg_discount_rate': 0.0,
            'discount_strength': 0.0, # 最终指标
            'main_tag': 'Indie',
            'years_since_release': 0.0 # 新增：上市年数
        }

        # --- 0. 确定发售日期 (Release Date) ---
        # 默认发售日为当年的1月1日
        release_date = datetime(int(item['year']), 1, 1)
        
        # 尝试从CSV中获取更精确的最早时间
        found_precise_date = False
        potential_dates = []

        # --- 1. 处理在线人数 (Players) ---
        p_path = game.get('players', '').replace('\\', '/')
        if os.path.exists(p_path):
            try:
                df_p = pd.read_csv(p_path)
                if 'DateTime' in df_p.columns and 'Players' in df_p.columns:
                    df_p['DateTime'] = pd.to_datetime(df_p['DateTime'])
                    
                    # 收集最早时间
                    if not df_p.empty:
                        potential_dates.append(df_p['DateTime'].min())

                    max_val = df_p['Players'].max()
                    item['max_players'] = int(max_val)

                    if max_val > 0:
                        peak_idx = df_p['Players'].idxmax()
                        peak_date = df_p.loc[peak_idx, 'DateTime']
                        df_sampled = df_p.iloc[peak_idx:].iloc[::SAMPLE_STEP]
                        threshold = max_val * 0.10
                        drop_rows = df_sampled[df_sampled['Players'] < threshold]
                        
                        if not drop_rows.empty:
                            item['retention_days'] = int((drop_rows.iloc[0]['DateTime'] - peak_date).days)
                        else:
                            item['retention_days'] = int((df_sampled.iloc[-1]['DateTime'] - peak_date).days)
            except Exception as e:
                print(f"  ⚠️ Players error: {e}")

        # --- 2. 处理折扣 (Discounts) ---
        d_path = game.get('discounts', '').replace('\\', '/')
        if os.path.exists(d_path):
            try:
                df_d = pd.read_csv(d_path)
                if 'DateTime' in df_d.columns and 'Final price' in df_d.columns:
                    df_d['DateTime'] = pd.to_datetime(df_d['DateTime'])
                    df_d.sort_values('DateTime', inplace=True)
                    
                    # 收集最早时间
                    if not df_d.empty:
                        potential_dates.append(df_d['DateTime'].min())

                    original_price = game.get('price', 0)
                    if original_price > 0:
                        df_d['discount_rate'] = (original_price - df_d['Final price']) / original_price
                        valid_discounts = df_d[df_d['discount_rate'] > 0.01].copy()
                        
                        if not valid_discounts.empty:
                            # 计算真实的打折活动次数（间隔 > 2天）
                            valid_discounts['time_diff'] = valid_discounts['DateTime'].diff()
                            real_discount_count = (valid_discounts['time_diff'] > pd.Timedelta(days=2)).sum() + 1
                            item['discount_count'] = int(real_discount_count)
                            
                            # 计算平均折扣率
                            avg_rate = valid_discounts['discount_rate'].mean()
                            item['avg_discount_rate'] = round(avg_rate, 2)
            except Exception as e:
                print(f"  ⚠️ Discounts error: {e}")

        # --- 3. 计算时间归一化的打折力度 ---
        # 确定最终发售日：取 CSV 中最早的日期，如果没有CSV则用年份
        if potential_dates:
            release_date = min(potential_dates)
        
        # 计算上市时长 (年)
        days_since = (current_time - release_date).days
        years_since = days_since / 365.25
        
        # 【保护机制】防止刚发售的游戏分母过小导致数据爆炸
        # 设定最小时长为 0.1 年 (约36天)
        years_since = max(years_since, 0.1)
        item['years_since_release'] = round(years_since, 1)

        # 【核心公式修正】
        # (次数 * 平均折扣率 * 100) / 上市年数
        # 结果代表：平均每年的打折强度积分
        raw_score = item['discount_count'] * (item['avg_discount_rate'] * 100)
        item['discount_strength'] = round(raw_score / years_since, 2)

        # --- 4. 处理标签 ---
        t_path = game.get('tags', '').replace('\\', '/')
        if os.path.exists(t_path):
            try:
                df_t = pd.read_csv(t_path, header=None)
                if not df_t.empty:
                    tag = str(df_t.iloc[0, 0])
                    if tag.lower() in ['tag', 'name', 'tags'] and len(df_t) > 1:
                        tag = str(df_t.iloc[1, 0])
                    item['main_tag'] = tag
            except: pass

        processed_list.append(item)

    # 5. 保存结果
    with open(OUTPUT_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(processed_list, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 处理完成！已生成时间归一化数据。")

if __name__ == '__main__':
    process_data()