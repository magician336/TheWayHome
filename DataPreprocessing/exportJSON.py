import json
from pathlib import Path
from typing import Dict, Any, List

import pandas as pd


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
	"""Normalize column names to lower snake-case for robust access."""
	df = df.copy()
	df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]
	return df


def find_column(df: pd.DataFrame, candidates: List[str], required: bool = True) -> str | None:
	cols = set(df.columns)
	for c in candidates:
		if c in cols:
			return c
	if required:
		missing = ", ".join(candidates)
		raise KeyError(f"Missing required column. Tried: {missing}; available: {list(df.columns)}")
	return None


def build_relative_paths(base_dir: Path, year: str, appid: str) -> Dict[str, str]:
	# Paths relative to DataPreprocessing directory
	rel_root = Path("dataset") / str(year)
	return {
		"tags": str(rel_root / f"tags_{appid}.csv"),
		"discounts": str(rel_root / f"discounts_{appid}.csv"),
		"players": str(rel_root / f"players_{appid}.csv"),
	}


def export_games_json() -> None:
	base_dir = Path(__file__).resolve().parent
	dataset_dir = base_dir / "dataset"
	odd_xlsx = base_dir / "dataset" /"数据表.xlsx"

	if not odd_xlsx.exists():
		raise FileNotFoundError(f"未找到 数据表.xlsx: {odd_xlsx}")
	if not dataset_dir.exists():
		raise FileNotFoundError(f"未找到数据目录: {dataset_dir}")

	excel = pd.ExcelFile(odd_xlsx)

	games: List[Dict[str, Any]] = []

	for sheet in excel.sheet_names:
		# Expect sheet name to be the release year, e.g., "2018"
		year = str(sheet).strip()
		df = pd.read_excel(excel, sheet_name=sheet)
		df = normalize_columns(df)

		# Column candidates (case-insensitive, flexible)
		name_col = find_column(df, ["游戏名称", "name", "title"])
		appid_col = find_column(df, ["appid", "app_id", "id"])
		price_col = find_column(df, ["售价"])
		favor_col = find_column(df, ["好评率"], required=False)
		comments_col = find_column(df, ["总评论数"], required=False)

		for _, row in df.iterrows():
			try:
				name = str(row[name_col]).strip()
				appid = str(row[appid_col]).strip()
				year_for_sale = int(year)
			except Exception as e:
				raise ValueError(f"行解析失败 (sheet={sheet}): {e}")

			price_val = None
			if pd.notna(row[price_col]):
				try:
					price_val = float(row[price_col])
				except Exception:
					# 保留原始字符串以避免丢失信息
					price_val = str(row[price_col]).strip()

			favorable_rate = None
			if favor_col and pd.notna(row[favor_col]):
				try:
					favorable_rate = float(row[favor_col])
				except Exception:
					favorable_rate = str(row[favor_col]).strip()

			total_comments = None
			if comments_col and pd.notna(row[comments_col]):
				try:
					total_comments = int(float(row[comments_col]))
				except Exception:
					total_comments = str(row[comments_col]).strip()

			paths = build_relative_paths(base_dir, year, appid)

			games.append(
				{
					"name": name,
					"appid": appid,
					"yearForSale": year_for_sale,
					"price": price_val,
					"favorableRate": favorable_rate,
					"tags": paths["tags"],
					"discounts": paths["discounts"],
					"players": paths["players"],
					"totalComments": total_comments,
				}
			)

	output_path = base_dir / "games.json"
	with output_path.open("w", encoding="utf-8") as f:
		json.dump(games, f, ensure_ascii=False, indent=2)

	print(f"导出完成: {output_path}，共 {len(games)} 条记录")


if __name__ == "__main__":
	export_games_json()

