# 导出游戏信息到 JSON

本程序读取 `DataPreprocessing/dataset/odd.xlsx` 的各工作表（工作表名为发售年份），并生成 `DataPreprocessing/games.json`。每条记录包含：
- `name`、`appid`、`yearForSale`（来自工作表名）
- `price`、`favorableRate`、`totalComments`
- `tags`、`discounts`、`players`（指向 `dataset/<year>/` 下对应文件的相对路径）

## 前置条件
- 已安装 Python 3.9+（更高版本亦可）
- 安装依赖：`pandas`、`openpyxl`（读取 Excel 需要）

### 安装依赖（PowerShell）
```powershell
pip install pandas openpyxl
```

## 目录结构要求
> 注意：将来要和奇数年一起导出为一个json文件
- 代码文件：`DataPreprocessing/exportJSON.py`
- Excel 文件：`DataPreprocessing/dataset/odd.xlsx`
- CSV 目录：`DataPreprocessing/dataset/<year>/`
  - `players_<appid>.csv`
  - `discounts_<appid>.csv`
  - `tags_<appid>.csv`

## 运行
在 `DataPreprocessing` 目录下执行：
```powershell
python exportJSON.py
```
成功后会在 `DataPreprocessing/games.json` 生成输出，并在控制台打印导出条数。

## 输出示例（片段）
```json
[
  {
    "name": "示例游戏",
    "appid": "123456",
    "yearForSale": 2024,
    "price": 99.0,
    "favorableRate": 93.5,
    "tags": "dataset/2024/tags_123456.csv",
    "discounts": "dataset/2024/discounts_123456.csv",
    "players": "dataset/2024/players_123456.csv",
    "totalComments": 1200
  }
]
```

## 常见问题
- 找不到 `odd.xlsx`：请确认路径为 `DataPreprocessing/dataset/odd.xlsx`。
- 列名不匹配：程序已支持中英文字段（如 `游戏名称`、`app_id`），若仍报错可在代码中调整候选列集合。