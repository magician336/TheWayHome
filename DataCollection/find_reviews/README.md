# Steam Reviews Fetcher

使用 Steam Store AppReviews API 抓取指定 APPID 的所有评价，并导出三份 CSV：

1. `APPID_summary.csv`：总评论数与各语言评论数（优先列出 `schinese/tchinese/english`）
2. `APPID_schinese.csv`：简体中文评论的详细内容
3. `APPID_english.csv`：英语评论的详细内容

## 安装依赖

```powershell
# 在项目目录下安装依赖
pip install -r requirements.txt
```

## 保存位置

所有 CSV 固定保存到：

`C:\Users\Clare\桌面\大二\数据可视化\大作业\数据集(偶数年)\2018`

请确保上述目录已存在；如不存在，请先创建。

## 使用方法

```powershell
# 基本用法：传入 Steam APPID（例如 570）
python .\steam_reviews.py 570
```

执行后会在保存目录生成：
- `570_summary.csv`
- `570_schinese.csv`
- `570_english.csv`

> 提示：抓取采用分页 cursor 循环，若评价量巨大，运行时间可能较长；脚本内加入了浏览器头、指数退避与随机抖动以降低被限流/反爬触发的概率。

## 其他说明
- 统计包含所有语言；仅输出简体中文与英语的详情。如果需要繁体中文详情（`tchinese`），可在脚本中按同样方式新增一个 CSV 导出。
