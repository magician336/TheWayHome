# find_tags 使用说明

## 需求
- 输入：APPID 和多行包含 `<a>` 标签的文本（例如从网页复制的片段）。
- 输出：将提取到的标签（去除前导 emoji/符号）保存到 CSV 文件：
  路径(自行更改) `C:\Users\Clare\桌面\大二\数据可视化\大作业\数据集(偶数年)\2018`，文件名 `tags_APPID.csv`。
- 在steamdb上，有标签页的网页按ctrl+u打开源码，ctrl+f搜索"store-tag"，然后把所有<\a>开头的行复制下来。

## 运行
在 PowerShell 中执行：

```powershell
python d:\code_warehouse\vs_code\python\find_tags\main.py
```

按提示：
1. 输入 APPID 并回车。
2. 粘贴多行文本（包含 `<a>` 标签）。
3. 完成后按 `Ctrl+Z`，再按 `Enter` 结束输入。

示例输入片段：
```html
<a class="btn btn-outline" href="/tag/122/">🎲 RPG</a>
<a class="btn btn-outline" href="/tag/6915/">🥋 Martial Arts</a>
<a class="btn btn-outline" href="/tag/3810/">🧱 Sandbox</a>
```

## 提取规则
- 使用正则 `"<a[^>]*>\s*([^<]+?)\s*</a>"` 捕获锚点的可见文本。
- 去除前导 emoji/符号：将开头的非字母数字字符去掉，然后再 `strip()`。
- 去重并保留出现顺序。

## 输出格式
CSV 第一行是表头 `tag`，其后每行一个标签，例如：
```
tag
RPG
Martial Arts
Sandbox
```

## 常见问题
- 没有提取到标签：请确认文本中有 `<a ...>文字</a>` 结构。
- 路径不存在：脚本会自动创建目标目录。