import json
import pandas as pd
import os
import numpy as np
from datetime import datetime

# --- 配置项 ---
GAMES_JSON_PATH = 'dataset/games.json'
OUTPUT_JSON_PATH = 'dataset/new_processed_games.json'
SAMPLE_STEP = 7 

def process_data():
    print("🚀 开始强力数据处理 (双基准动态折扣修正版)...")
    
    if not os.path.exists(GAMES_JSON_PATH):
        print(f"❌ 错误: 找不到 {GAMES_JSON_PATH}")
        return

    with open(GAMES_JSON_PATH, 'r', encoding='utf-8') as f:
        games = json.load(f)

    processed_list = []
    current_time = datetime.now() 

    for game in games:
        game_name = game.get('name', 'Unknown')
        print(f"--------------------------------------------------")
        print(f"正在处理: {game_name}")

        item = {
            'name': game_name,
            'year': game.get('yearForSale'),
            'original_price': float(game.get('price', 0)), # 确保是浮点数
            'favorable_rate': game.get('favorableRate'),
            'total_comments': game.get('totalComments'),
            
            'max_players': 0,
            'retention_days': 0,
            'discount_count': 0,
            'avg_discount_rate': 0.0,
            'discount_strength': 0.0, 
            'main_tag': 'Indie',
            'years_since_release': 0.0 
        }

        # 1. 计算发售时长 (用于分母)
        # -------------------------------------------------
        release_date = datetime(int(item['year']), 1, 1)
        potential_dates = []

        # --- Players 处理 (保持不变) ---
        p_path = game.get('players', '').replace('\\', '/')
        if os.path.exists(p_path):
            try:
                try:
                    df_p = pd.read_csv(p_path, encoding='utf-8')
                except:
                    df_p = pd.read_csv(p_path, encoding='gbk')
                
                df_p.columns = [c.strip() for c in df_p.columns]
                
                time_col = next((c for c in df_p.columns if 'date' in c.lower() or 'time' in c.lower()), None)
                player_col = next((c for c in df_p.columns if 'player' in c.lower()), None)

                if time_col and player_col:
                    df_p[time_col] = pd.to_datetime(df_p[time_col])
                    if not df_p.empty:
                        potential_dates.append(df_p[time_col].min())
                        max_val = df_p[player_col].max()
                        item['max_players'] = int(max_val)
                        
                        if max_val > 0:
                            peak_idx = df_p[player_col].idxmax()
                            peak_date = df_p.loc[peak_idx, time_col]
                            df_sampled = df_p.iloc[peak_idx:].iloc[::SAMPLE_STEP]
                            threshold = max_val * 0.12
                            drop_rows = df_sampled[df_sampled[player_col] < threshold]
                            if not drop_rows.empty:
                                item['retention_days'] = int((drop_rows.iloc[0][time_col] - peak_date).days)
                            else:
                                item['retention_days'] = int((df_sampled.iloc[-1][time_col] - peak_date).days)
            except Exception as e:
                pass 

        # -------------------------------------------------
        # 2. 强力处理 Discounts 数据 (核心修改区域)
        # -------------------------------------------------
        d_path = game.get('discounts', '').replace('\\', '/')
        has_discount_data = False
        
        if os.path.exists(d_path):
            try:
                # A. 读取 CSV
                try:
                    df_d = pd.read_csv(d_path, encoding='utf-8')
                except UnicodeDecodeError:
                    df_d = pd.read_csv(d_path, encoding='gbk')
                
                # B. 列名清洗
                df_d.columns = [str(c).strip() for c in df_d.columns]
                
                col_final = None
                col_hist = None
                col_date = df_d.columns[0]
                
                # 智能寻找列名
                for i, col in enumerate(df_d.columns):
                    if 'final' in col.lower() or 'price' in col.lower():
                        col_final = col
                        break
                if col_final is None and len(df_d.columns) >= 2:
                    col_final = df_d.columns[1]

                for i, col in enumerate(df_d.columns):
                    if 'hist' in col.lower() or 'low' in col.lower():
                        col_hist = col
                        break
                if col_hist is None and len(df_d.columns) >= 3:
                    col_hist = df_d.columns[2]

                print(f"  📂 读取成功. 列映射 -> 现价: [{col_final}], 史低: [{col_hist}]")

                # C. 数据转换
                if col_final:
                    df_d[col_final] = pd.to_numeric(df_d[col_final], errors='coerce')
                    df_d.dropna(subset=[col_final], inplace=True)
                    
                    if col_hist:
                        df_d[col_hist] = pd.to_numeric(df_d[col_hist], errors='coerce')

                    df_d[col_date] = pd.to_datetime(df_d[col_date])
                    df_d.sort_values(col_date, inplace=True)
                    if not df_d.empty:
                        potential_dates.append(df_d[col_date].min())

                    # =========================================================
                    # D. 核心计算逻辑 (双基准动态修正版)
                    # =========================================================
                    current_original_price = item['original_price']
                    row_count = len(df_d)

                    if current_original_price > 0 and row_count > 0:
                        # --- 1. 动态基准处理 (解决永降导致的负折扣) ---
                        # 找出历史最高价，防止当前原价过低导致计算溢出
                        historical_max = df_d[col_final].max()
                        baseline_max = max(current_original_price, historical_max)
                        
                        # 核心逻辑：如果某行价格 > 当前原价，说明是旧时代数据，用旧高价做分母
                        # 否则用当前原价做分母
                        dynamic_base = np.where(
                            df_d[col_final] > current_original_price, 
                            baseline_max, 
                            current_original_price
                        )
                        
                        # 计算每一行的折扣率：1 - (现价 / 动态基准)
                        # clip(lower=0) 再次确保万无一失
                        row_discount_rates = (1 - (df_d[col_final] / dynamic_base))
                        item['avg_discount_rate'] = round(row_discount_rates.clip(lower=0).mean(), 2)
                        
                        # --- 2. 史低次数 ---
                        if col_hist:
                            is_hist_low = df_d[col_final] <= (df_d[col_hist] + 0.1)
                            hist_low_count = is_hist_low.sum()
                            item['discount_count'] = int(hist_low_count)

                            # --- 3. 史低力度 (也应用动态基准) ---
                            if hist_low_count > 0:
                                # 筛选出达到史低的行
                                hist_rows_prices = df_d.loc[is_hist_low, col_final]
                                hist_rows_base = dynamic_base[is_hist_low] # 对应的基准价
                                
                                # 计算这些时刻的折扣深度
                                hist_strengths = 1 - (hist_rows_prices / hist_rows_base)
                                avg_hist_strength = hist_strengths.clip(lower=0).mean()
                            else:
                                avg_hist_strength = 0.0
                            
                            temp_hist_strength_val = avg_hist_strength
                        else:
                            item['discount_count'] = row_count
                            temp_hist_strength_val = item['avg_discount_rate']
                        
                        has_discount_data = True
                        print(f"  ✅ 计算完毕: 均折率 {item['avg_discount_rate']}, 史低次数 {item['discount_count']}")

            except Exception as e:
                print(f"  ⚠️ 折扣数据处理出错: {e}")
        else:
            print(f"  ❌ 找不到折扣文件: {d_path}") # 方便调试

        # -------------------------------------------------
        # 3. 最终综合指标计算
        # -------------------------------------------------
        if potential_dates:
            release_date = min(potential_dates)
        
        days_since = (current_time - release_date).days
        years_since = max(days_since / 365.25, 0.1)
        item['years_since_release'] = round(years_since, 1)

        if has_discount_data:
            if 'temp_hist_strength_val' in locals():
                strength = (item['discount_count'] * (temp_hist_strength_val * 100)) / years_since
            else:
                strength = (item['discount_count'] * (item['avg_discount_rate'] * 100)) / years_since
            item['discount_strength'] = round(strength, 2)
        
        # Tags 处理
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

    with open(OUTPUT_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(processed_list, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 处理完成！已生成 {OUTPUT_JSON_PATH}")

if __name__ == '__main__':
    process_data()