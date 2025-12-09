# auto_csv_rename

遍历文件夹中的所有 CSV 文件，通过表头来重命名：
- 表头含 `DateTime, Players, Average Players` → 重命名为 `players_{appid}.csv`
- 表头含 `DateTime, Final price, Historical Low` → 重命名为 `discounts_{appid}.csv`

`appid` 默认从原始文件名中提取首个 3 位以上的数字，例如 `steamdb_chart_838350.csv` → `838350`。

## 使用方法

在 Windows PowerShell 中执行：

```powershell
python .\rename_csv_by_header.py "D:\path\to\your\folder"
```

脚本会递归遍历该文件夹及其子文件夹，尝试根据表头识别类型并重命名。若目标文件名已存在，将自动追加序号避免覆盖。

## 兼容性说明
- 自动探测常见分隔符：`,`, `;`, `\t`, `|`
- 处理 `UTF-8 BOM` 与部分 `ANSI (cp1252)` 编码
- 表头匹配采用包含关系：只要包含对应三列即判定类型

## 注意事项
- 如果文件无法读取表头或表头不匹配，脚本会跳过并在控制台输出原因。
- 若原始文件名未包含 `appid` 数字，脚本也会跳过。
