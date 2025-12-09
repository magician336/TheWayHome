import csv
import sys
import time
import random
import argparse
import os
from typing import Dict, List

import requests

API_URL_TEMPLATE = "https://store.steampowered.com/appreviews/{app_id}"

SUPPORTED_LANGS = {
    "schinese": "简体中文",
    "tchinese": "繁体中文",
    "english": "英语",
}


def _get_session() -> requests.Session:
    session = requests.Session()
    # Set headers to look like a normal browser session
    session.headers.update({
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/121.0.0.0 Safari/537.36"
        ),
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://store.steampowered.com/",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    })
    return session


def _safe_get(session: requests.Session, url: str, params: Dict, timeout: int = 20, max_retries: int = 2) -> Dict:
    """GET with retry/backoff handling common anti-scrape responses like 429."""
    attempt = 0
    while True:
        try:
            resp = session.get(url, params=params, timeout=timeout)
            # Handle rate limiting explicitly
            if resp.status_code == 429:
                # Faster backoff to speed up runtime
                wait = min(10, (1.5 ** attempt) + random.uniform(0.05, 0.3))
                time.sleep(wait)
                attempt += 1
                if attempt > max_retries:
                    resp.raise_for_status()
                continue
            resp.raise_for_status()
            return resp.json()
        except (requests.exceptions.ReadTimeout, requests.exceptions.ConnectTimeout):
            attempt += 1
            if attempt > max_retries:
                raise
            # increase timeout slightly and wait briefly
            timeout = min(60, int(timeout * 1.5))
            wait = min(6, (1.5 ** attempt) + random.uniform(0.05, 0.3))
            time.sleep(wait)
        except (requests.RequestException, ValueError):
            attempt += 1
            if attempt > max_retries:
                raise
            # Faster retry backoff
            wait = min(6, (1.5 ** attempt) + random.uniform(0.05, 0.3))
            time.sleep(wait)


def fetch_all_reviews(app_id: int, language: str = "all", filter_type: str = "all", purchase_type: str = "all", day_range: int | None = None, timeout: int = 30) -> List[Dict]:
    """
    Fetch all reviews for a given app using Steam Store AppReviews API, paging via cursor.

    Parameters:
    - app_id: Steam App ID
    - language: language code or 'all'
    - filter_type: 'all' | 'recent' | 'updated'
    - purchase_type: 'all' | 'steam' | 'non_steam'

    Returns:
    - List of review dicts
    """
    url = API_URL_TEMPLATE.format(app_id=app_id)
    cursor = "*"
    reviews: List[Dict] = []

    # Steam limits; be polite.
    params_base = {
        "json": 1,
        "num_per_page": 100,
        "language": language,
        "filter": filter_type,
        "purchase_type": purchase_type,
    }
    if day_range is not None:
        params_base["day_range"] = day_range

    session = _get_session()
    last_cursor = None
    while True:
        params = dict(params_base)
        params["cursor"] = cursor
        data = _safe_get(session, url, params=params, timeout=timeout)

        page_reviews = data.get("reviews", [])
        if not page_reviews:
            break

        reviews.extend(page_reviews)

        # Next cursor
        cursor = data.get("cursor")
        if not cursor:
            break
        # Detect cursor repetition to avoid infinite loop
        if last_cursor == cursor:
            break
        last_cursor = cursor

        # Faster pacing: minimal delay
        time.sleep(0.05)

    return reviews


def summarize_by_language(reviews: List[Dict]) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    for r in reviews:
        lang = r.get("language", "unknown")
        counts[lang] = counts.get(lang, 0) + 1
    return counts


def filter_reviews_by_lang(reviews: List[Dict], lang: str) -> List[Dict]:
    return [r for r in reviews if r.get("language") == lang]


def write_summary_csv(output_path: str, total_count: int, lang_counts: Dict[str, int]) -> None:
    # Ensure deterministic order: schinese, tchinese, english, then others
    ordered_langs = list(SUPPORTED_LANGS.keys()) + [l for l in lang_counts.keys() if l not in SUPPORTED_LANGS]
    rows = []
    rows.append({"metric": "total_reviews", "value": total_count})
    for l in ordered_langs:
        rows.append({"metric": f"lang_count_{l}", "value": lang_counts.get(l, 0)})

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["metric", "value"])
        writer.writeheader()
        writer.writerows(rows)


def write_reviews_csv(output_path: str, reviews: List[Dict]) -> None:
    # Typical fields present in Steam reviews
    fieldnames = [
        "review_id",
        "author_steamid",
        "language",
        "timestamp_created",
        "voted_up",
        "votes_up",
        "votes_funny",
        "weighted_vote_score",
        "comment_count",
        "steam_purchase",
        "received_for_free",
        "written_during_early_access",
        "review",
    ]

    def row_from_review(r: Dict) -> Dict:
        author = r.get("author", {})
        return {
            "review_id": r.get("recommendationid"),
            "author_steamid": author.get("steamid"),
            "language": r.get("language"),
            "timestamp_created": r.get("timestamp_created"),
            "voted_up": r.get("voted_up"),
            "votes_up": r.get("votes_up"),
            "votes_funny": r.get("votes_funny"),
            "weighted_vote_score": r.get("weighted_vote_score"),
            "comment_count": r.get("comment_count"),
            "steam_purchase": r.get("steam_purchase"),
            "received_for_free": r.get("received_for_free"),
            "written_during_early_access": r.get("written_during_early_access"),
            "review": r.get("review"),
        }

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in reviews:
            writer.writerow(row_from_review(r))


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(description="Fetch Steam game reviews and export CSVs.")
    parser.add_argument("appid", type=int, help="Steam AppID of the game")
    parser.add_argument("--out", dest="out_prefix", default="reviews", help="Output file prefix (default: reviews)")
    parser.add_argument("--day-range", dest="day_range", type=int, default=None, help="Limit review time range in days; default None for all available.")
    parser.add_argument("--timeout", dest="timeout", type=int, default=40, help="HTTP read timeout per request in seconds (default: 40)")
    args = parser.parse_args(argv)

    app_id = args.appid
    out_prefix = args.out_prefix

    # 1) Fetch all reviews across languages
    print(f"Fetching reviews for app {app_id} (all languages)...")
    all_reviews = fetch_all_reviews(app_id, language="all", filter_type="all", purchase_type="all", day_range=args.day_range, timeout=args.timeout)
    total_count = len(all_reviews)
    # Show API's query summary if present
    try:
        # Quick single call to get summary without pagination
        session = _get_session()
        summary_data = _safe_get(session, API_URL_TEMPLATE.format(app_id=app_id), params={
            "json": 1,
            "num_per_page": 1,
            "language": "all",
            "filter": "all",
            "purchase_type": "all",
        }, timeout=20)
        query_summary = summary_data.get("query_summary", {})
        api_total = query_summary.get("total_reviews") or query_summary.get("num_reviews")
        print(f"Fetched {total_count} reviews; API reports total={api_total}.")
    except Exception:
        print(f"Fetched {total_count} reviews.")

    # 2) Summarize counts per language
    lang_counts = summarize_by_language(all_reviews)

    # 3) Write summary CSV (ensure directory exists)
    # Fixed save directory per request
    save_dir = r"C:\Users\Clare\桌面\大二\数据可视化\大作业\数据集(偶数年)\2018"
    os.makedirs(save_dir, exist_ok=True)
    summary_csv = save_dir + f"\\summary_{app_id}.csv"
    write_summary_csv(summary_csv, total_count, lang_counts)
    print(f"Summary written: {summary_csv}")

    # 4) Write Simplified Chinese and English detail CSVs
    schinese_reviews = filter_reviews_by_lang(all_reviews, "schinese")
    english_reviews = filter_reviews_by_lang(all_reviews, "english")

    schinese_csv = save_dir + f"\\schinese_{app_id}.csv"
    english_csv = save_dir + f"\\english_{app_id}.csv"

    write_reviews_csv(schinese_csv, schinese_reviews)
    print(f"Simplified Chinese reviews written: {schinese_csv} ({len(schinese_reviews)})")

    write_reviews_csv(english_csv, english_reviews)
    print(f"English reviews written: {english_csv} ({len(english_reviews)})")

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
