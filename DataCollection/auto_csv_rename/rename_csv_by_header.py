import sys
import os
import re
import csv
from typing import Optional, Tuple, List

# Patterns for recognizing header sets
PLAYERS_HEADERS = {
    "DateTime": {"DateTime", "Players", "Average Players"},
}
DISCOUNTS_HEADERS = {
    "DateTime": {"DateTime", "Final price", "Historical Low"},
}

# Accept common delimiters
POSSIBLE_DELIMITERS = [",", ";", "\t", "|"]


def detect_delimiter(sample_line: str) -> str:
    counts = {d: sample_line.count(d) for d in POSSIBLE_DELIMITERS}
    # choose delimiter with max occurrences; fallback to comma
    delimiter = max(counts, key=counts.get) if any(counts.values()) else ","
    return delimiter


def read_csv_header(file_path: str) -> Optional[List[str]]:
    try:
        with open(file_path, "r", encoding="utf-8-sig", newline="") as f:
            # sniff delimiter from first non-empty line
            pos = f.tell()
            first_line = f.readline()
            while first_line and not first_line.strip():
                first_line = f.readline()
            if not first_line:
                return None
            delimiter = detect_delimiter(first_line)
            f.seek(pos)
            reader = csv.reader(f, delimiter=delimiter)
            header = next(reader, None)
            if header is None:
                return None
            # strip whitespace around header names
            return [h.strip() for h in header]
    except Exception:
        # retry with cp1252 in case of ANSI files
        try:
            with open(file_path, "r", encoding="cp1252", newline="") as f:
                pos = f.tell()
                first_line = f.readline()
                while first_line and not first_line.strip():
                    first_line = f.readline()
                if not first_line:
                    return None
                delimiter = detect_delimiter(first_line)
                f.seek(pos)
                reader = csv.reader(f, delimiter=delimiter)
                header = next(reader, None)
                if header is None:
                    return None
                return [h.strip() for h in header]
        except Exception:
            return None


def extract_appid_from_filename(filename: str) -> Optional[str]:
    # Examples: steamdb_chart_838350.csv, something_12345.csv
    m = re.search(r"(\d{3,})", filename)
    return m.group(1) if m else None


def classify_header(header: List[str]) -> Optional[str]:
    header_set = set(header)
    # players set
    if PLAYERS_HEADERS["DateTime"].issubset(header_set):
        return "players"
    # discounts set
    if DISCOUNTS_HEADERS["DateTime"].issubset(header_set):
        return "discounts"
    return None


def make_new_name(kind: str, appid: str) -> str:
    return f"{kind}_{appid}.csv"


def process_csv(file_path: str) -> Tuple[bool, str]:
    dirname, filename = os.path.dirname(file_path), os.path.basename(file_path)
    name_no_ext, ext = os.path.splitext(filename)
    if ext.lower() != ".csv":
        return False, "skip: not a csv"

    header = read_csv_header(file_path)
    if not header:
        return False, "skip: cannot read header"

    kind = classify_header(header)
    if not kind:
        return False, "skip: header pattern not matched"

    appid = extract_appid_from_filename(name_no_ext)
    if not appid:
        return False, "skip: cannot find appid in filename"

    new_name = make_new_name(kind, appid)
    new_path = os.path.join(dirname, new_name)

    if os.path.abspath(new_path) == os.path.abspath(file_path):
        return False, "skip: already correct name"

    # If target exists, append index to avoid overwrite
    if os.path.exists(new_path):
        base, ext2 = os.path.splitext(new_name)
        idx = 1
        while True:
            candidate = os.path.join(dirname, f"{base}_{idx}{ext2}")
            if not os.path.exists(candidate):
                new_path = candidate
                break
            idx += 1

    os.replace(file_path, new_path)
    return True, f"renamed to {os.path.basename(new_path)}"


def traverse_and_rename(root: str) -> Tuple[int, int, int]:
    total, renamed, skipped = 0, 0, 0
    for dirpath, _, filenames in os.walk(root):
        for fn in filenames:
            if fn.lower().endswith(".csv"):
                total += 1
                ok, msg = process_csv(os.path.join(dirpath, fn))
                if ok:
                    renamed += 1
                else:
                    skipped += 1
                print(f"[{'OK' if ok else 'SKIP'}] {fn}: {msg}")
    return total, renamed, skipped


def main(argv: List[str]) -> int:
    if len(argv) < 2:
        print("Usage: python rename_csv_by_header.py <folder>")
        return 2
    root = argv[1]
    if not os.path.isdir(root):
        print(f"Error: '{root}' is not a folder")
        return 2
    total, renamed, skipped = traverse_and_rename(root)
    print(f"Done. Total CSV: {total}, Renamed: {renamed}, Skipped: {skipped}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
