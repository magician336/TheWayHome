import re
import csv
import os
import sys


TAG_DIR = r"C:\Users\Clare\桌面\大二\数据可视化\大作业\数据集(偶数年)\2024"



def extract_tags(html: str) -> list[str]:
    """Extract tag texts from anchor lines like:
    <a class="btn btn-outline" href="/tag/122/">🎲 RPG</a>

    - Captures inner text between > and </a>
    - Strips leading emojis and spaces
    - Returns unique tags preserving order
    """
    # Find inner text of <a ...>TEXT</a>
    texts = re.findall(r"<a[^>]*>\s*([^<]+?)\s*</a>", html, flags=re.IGNORECASE)

    tags: list[str] = []
    seen = set()
    for t in texts:
        # Remove leading emoji/symbols and whitespace
        # Pattern: drop any leading non-letter/number characters
        cleaned = re.sub(r"^[^A-Za-z0-9]+", "", t).strip()
        # Also normalize internal extra spaces
        cleaned = re.sub(r"\s+", " ", cleaned)
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            tags.append(cleaned)
    return tags


def write_csv(appid: str, tags: list[str]) -> str:
    os.makedirs(TAG_DIR, exist_ok=True)
    filename = f"tags_{appid}.csv"
    out_path = os.path.join(TAG_DIR, filename)
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["tag"])  # header
        for tag in tags:
            writer.writerow([tag])
    return out_path


def main():
    print("请输入 APPID：", end="")
    appid = input().strip()
    if not appid:
        print("APPID 不能为空。")
        sys.exit(1)

    print("请粘贴包含 <a> 标签的多行文本，完成后按 Ctrl+Z 然后 Enter 结束输入：")
    try:
        html = sys.stdin.read()
    except KeyboardInterrupt:
        print("输入中断。")
        sys.exit(1)

    tags = extract_tags(html)
    if not tags:
        print("未提取到任何标签。请检查输入格式。")
        sys.exit(2)

    out_path = write_csv(appid, tags)
    print(f"已保存 {len(tags)} 个标签到: {out_path}")


if __name__ == "__main__":
    main()
