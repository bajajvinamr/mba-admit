"""
Scrape MBA information aggregator sites for school profiles, rankings, and stats.
Saves raw text content to data/info_sites/{site_name}/*.txt for later extraction.

Usage:
    python scripts/scrape_aggregators.py --site gmatclub --limit 20
    python scripts/scrape_aggregators.py --site all --limit 20
    python scripts/scrape_aggregators.py --site mbacrystalball,fortuna --limit 15
"""

import argparse
import hashlib
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

# --- Configuration ---
BACKEND_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND_DIR / "data"
INFO_SITES_DIR = DATA_DIR / "info_sites"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
}

# Top MBA schools for constructing per-school URLs
TOP_SCHOOLS = [
    ("harvard-business-school", "Harvard Business School"),
    ("stanford-graduate-school-of-business", "Stanford GSB"),
    ("wharton-school", "Wharton"),
    ("chicago-booth", "Chicago Booth"),
    ("northwestern-kellogg", "Northwestern Kellogg"),
    ("columbia-business-school", "Columbia Business School"),
    ("mit-sloan", "MIT Sloan"),
    ("dartmouth-tuck", "Dartmouth Tuck"),
    ("uc-berkeley-haas", "UC Berkeley Haas"),
    ("michigan-ross", "Michigan Ross"),
    ("duke-fuqua", "Duke Fuqua"),
    ("uva-darden", "UVA Darden"),
    ("nyu-stern", "NYU Stern"),
    ("ucla-anderson", "UCLA Anderson"),
    ("yale-som", "Yale SOM"),
    ("cornell-johnson", "Cornell Johnson"),
    ("cmu-tepper", "Carnegie Mellon Tepper"),
    ("insead", "INSEAD"),
    ("london-business-school", "London Business School"),
    ("iese", "IESE Business School"),
    ("hec-paris", "HEC Paris"),
    ("indian-school-of-business", "ISB"),
    ("oxford-said", "Oxford Said"),
    ("cambridge-judge", "Cambridge Judge"),
    ("imd", "IMD"),
]


def fetch_page(url: str, client: httpx.Client, timeout: float = 15.0) -> Optional[str]:
    """Fetch a URL and return the response text, or None on failure."""
    try:
        resp = client.get(url, timeout=timeout, follow_redirects=True)
        if resp.status_code >= 400:
            print(f"  FAIL [HTTP {resp.status_code}]: {url}")
            return None
        return resp.text
    except (httpx.HTTPStatusError, httpx.RequestError, httpx.TimeoutException) as e:
        print(f"  FAIL [{type(e).__name__}]: {url}")
        return None


def html_to_text(html: str) -> str:
    """Strip HTML to clean text, removing scripts/styles/nav."""
    soup = BeautifulSoup(html, "lxml")
    # Remove noise elements
    for tag in soup.find_all(["script", "style", "nav", "footer", "header", "noscript", "iframe", "svg"]):
        tag.decompose()
    text = soup.get_text(separator="\n", strip=True)
    # Collapse blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def save_page(site_dir: Path, slug: str, text: str, url: str) -> Path:
    """Save text content to a file. Returns the file path."""
    site_dir.mkdir(parents=True, exist_ok=True)
    # Sanitize filename
    safe_slug = re.sub(r"[^a-zA-Z0-9_-]", "_", slug)[:120]
    filepath = site_dir / f"{safe_slug}.txt"
    # Prepend source URL as metadata
    content = f"SOURCE: {url}\nSCRAPED: {datetime.now(timezone.utc).isoformat()}\n{'=' * 60}\n\n{text}"
    filepath.write_text(content, encoding="utf-8")
    return filepath


def save_meta(site_dir: Path, stats: dict):
    """Save scraping metadata."""
    site_dir.mkdir(parents=True, exist_ok=True)
    meta_path = site_dir / "meta.json"
    meta_path.write_text(json.dumps(stats, indent=2), encoding="utf-8")


# ─── Site-specific scrapers ─────────────────────────────────────────────


def scrape_gmatclub(client: httpx.Client, limit: int) -> dict:
    """Scrape GMAT Club school profiles and rankings.

    GMAT Club blocks non-browser requests on /reviews/ paths.
    Use their public forum school pages and wiki instead.
    """
    site_dir = INFO_SITES_DIR / "gmatclub"
    stats = {"site": "gmatclub", "success": 0, "fail": 0, "pages": [], "scraped_at": datetime.now(timezone.utc).isoformat()}

    # GMAT Club forum school pages and wiki — these are more accessible
    pages = [
        ("rankings-composite", "https://gmatclub.com/forum/mba-rankings-composite-306802.html"),
        ("class-profile-stats", "https://gmatclub.com/forum/mba-class-profiles-and-statistics-311394.html"),
        ("hbs-profile", "https://gmatclub.com/forum/harvard-business-school-hbs-mba-305948.html"),
        ("stanford-gsb-profile", "https://gmatclub.com/forum/stanford-gsb-mba-305949.html"),
        ("wharton-profile", "https://gmatclub.com/forum/wharton-mba-305950.html"),
        ("booth-profile", "https://gmatclub.com/forum/chicago-booth-mba-305951.html"),
        ("kellogg-profile", "https://gmatclub.com/forum/kellogg-mba-305952.html"),
        ("columbia-profile", "https://gmatclub.com/forum/columbia-business-school-mba-305953.html"),
        ("mit-sloan-profile", "https://gmatclub.com/forum/mit-sloan-mba-305954.html"),
        ("tuck-profile", "https://gmatclub.com/forum/tuck-mba-305955.html"),
        ("haas-profile", "https://gmatclub.com/forum/uc-berkeley-haas-mba-305956.html"),
        ("ross-profile", "https://gmatclub.com/forum/michigan-ross-mba-305957.html"),
        ("fuqua-profile", "https://gmatclub.com/forum/duke-fuqua-mba-305958.html"),
        ("darden-profile", "https://gmatclub.com/forum/uva-darden-mba-305959.html"),
        ("stern-profile", "https://gmatclub.com/forum/nyu-stern-mba-305960.html"),
        ("anderson-profile", "https://gmatclub.com/forum/ucla-anderson-mba-305961.html"),
        ("yale-som-profile", "https://gmatclub.com/forum/yale-som-mba-305962.html"),
        ("johnson-profile", "https://gmatclub.com/forum/cornell-johnson-mba-305963.html"),
        ("tepper-profile", "https://gmatclub.com/forum/cmu-tepper-mba-305964.html"),
        ("insead-profile", "https://gmatclub.com/forum/insead-mba-305965.html"),
    ]

    # Also try the /reviews/ path with a first request to get cookies
    print("\n[gmatclub] Attempting cookie-primed session...")
    try:
        client.get("https://gmatclub.com/", timeout=10, follow_redirects=True)
        time.sleep(1)
    except Exception:
        pass

    # Try /reviews/ ranking first
    reviews_url = "https://gmatclub.com/reviews/ranking"
    print(f"  Trying reviews ranking...")
    html = fetch_page(reviews_url, client)
    if html and len(html_to_text(html)) > 500:
        text = html_to_text(html)
        fp = save_page(site_dir, "reviews_ranking", text, reviews_url)
        stats["success"] += 1
        stats["pages"].append(str(fp))
        print(f"  OK: reviews_ranking ({len(text)} chars)")
    else:
        print(f"  Reviews path blocked, using forum pages instead")

    time.sleep(1)

    # Scrape forum pages (more reliable)
    for slug, url in pages[:limit - 1]:
        print(f"  Fetching: {slug}...")
        html = fetch_page(url, client)
        if html:
            text = html_to_text(html)
            if len(text) > 200:
                fp = save_page(site_dir, slug, text, url)
                stats["success"] += 1
                stats["pages"].append(str(fp))
                print(f"  OK: {slug} ({len(text)} chars)")
            else:
                stats["fail"] += 1
                print(f"  SKIP: {slug} (too short: {len(text)} chars)")
        else:
            stats["fail"] += 1
        time.sleep(1.5)

    save_meta(site_dir, stats)
    return stats


def scrape_mbacrystalball(client: httpx.Client, limit: int) -> dict:
    """Scrape MBA Crystal Ball school profiles and rankings."""
    site_dir = INFO_SITES_DIR / "mbacrystalball"
    stats = {"site": "mbacrystalball", "success": 0, "fail": 0, "pages": [], "scraped_at": datetime.now(timezone.utc).isoformat()}

    # Key pages to scrape
    pages = [
        ("best-mba-programs-in-the-world", "https://www.mbacrystalball.com/best-mba-programs-in-the-world/"),
        ("best-mba-in-usa", "https://www.mbacrystalball.com/best-mba-in-usa/"),
        ("best-mba-in-india", "https://www.mbacrystalball.com/best-mba-in-india/"),
        ("best-mba-in-europe", "https://www.mbacrystalball.com/best-mba-in-europe/"),
        ("best-mba-in-canada", "https://www.mbacrystalball.com/best-mba-in-canada/"),
        ("mba-rankings", "https://www.mbacrystalball.com/mba-rankings/"),
        ("gmat-score-for-top-mba-programs", "https://www.mbacrystalball.com/gmat-score-for-top-mba-programs/"),
        ("mba-acceptance-rate", "https://www.mbacrystalball.com/mba-acceptance-rate/"),
        ("mba-class-profile", "https://www.mbacrystalball.com/mba-class-profile/"),
        ("mba-essay-tips", "https://www.mbacrystalball.com/mba-essay-tips/"),
    ]

    # School-specific pages
    school_pages = [
        ("harvard-business-school", "https://www.mbacrystalball.com/business-school/harvard-business-school/"),
        ("stanford-gsb", "https://www.mbacrystalball.com/business-school/stanford-gsb/"),
        ("wharton", "https://www.mbacrystalball.com/business-school/wharton/"),
        ("chicago-booth", "https://www.mbacrystalball.com/business-school/chicago-booth/"),
        ("kellogg", "https://www.mbacrystalball.com/business-school/kellogg/"),
        ("columbia-business-school", "https://www.mbacrystalball.com/business-school/columbia-business-school/"),
        ("mit-sloan", "https://www.mbacrystalball.com/business-school/mit-sloan/"),
        ("insead", "https://www.mbacrystalball.com/business-school/insead/"),
        ("london-business-school", "https://www.mbacrystalball.com/business-school/london-business-school/"),
        ("isb", "https://www.mbacrystalball.com/business-school/isb/"),
    ]

    all_pages = pages + school_pages
    for slug, url in all_pages[:limit]:
        print(f"  Fetching: {slug}...")
        html = fetch_page(url, client)
        if html:
            text = html_to_text(html)
            if len(text) > 200:
                fp = save_page(site_dir, slug, text, url)
                stats["success"] += 1
                stats["pages"].append(str(fp))
                print(f"  OK: {slug} ({len(text)} chars)")
            else:
                stats["fail"] += 1
                print(f"  SKIP: {slug} (too short: {len(text)} chars)")
        else:
            stats["fail"] += 1
        time.sleep(1.5)

    save_meta(site_dir, stats)
    return stats


def scrape_fortuna(client: httpx.Client, limit: int) -> dict:
    """Scrape Fortuna Admissions essay tips and deadline pages."""
    site_dir = INFO_SITES_DIR / "fortuna"
    stats = {"site": "fortuna", "success": 0, "fail": 0, "pages": [], "scraped_at": datetime.now(timezone.utc).isoformat()}

    # Fortuna has school-specific essay analysis and deadline pages
    pages = [
        ("mba-deadlines", "https://fortunaadmissions.com/mba-deadlines/"),
        ("mba-essay-tips", "https://fortunaadmissions.com/mba-essay-tips/"),
        ("hbs-essays", "https://fortunaadmissions.com/harvard-business-school-mba-essay/"),
        ("stanford-essays", "https://fortunaadmissions.com/stanford-gsb-mba-essay/"),
        ("wharton-essays", "https://fortunaadmissions.com/wharton-mba-essay/"),
        ("booth-essays", "https://fortunaadmissions.com/chicago-booth-mba-essay/"),
        ("kellogg-essays", "https://fortunaadmissions.com/kellogg-mba-essay/"),
        ("columbia-essays", "https://fortunaadmissions.com/columbia-business-school-mba-essay/"),
        ("mit-sloan-essays", "https://fortunaadmissions.com/mit-sloan-mba-essay/"),
        ("tuck-essays", "https://fortunaadmissions.com/tuck-mba-essay/"),
        ("haas-essays", "https://fortunaadmissions.com/berkeley-haas-mba-essay/"),
        ("ross-essays", "https://fortunaadmissions.com/michigan-ross-mba-essay/"),
        ("fuqua-essays", "https://fortunaadmissions.com/duke-fuqua-mba-essay/"),
        ("darden-essays", "https://fortunaadmissions.com/uva-darden-mba-essay/"),
        ("stern-essays", "https://fortunaadmissions.com/nyu-stern-mba-essay/"),
        ("yale-som-essays", "https://fortunaadmissions.com/yale-som-mba-essay/"),
        ("insead-essays", "https://fortunaadmissions.com/insead-mba-essay/"),
        ("lbs-essays", "https://fortunaadmissions.com/london-business-school-mba-essay/"),
        ("iese-essays", "https://fortunaadmissions.com/iese-mba-essay/"),
        ("hec-paris-essays", "https://fortunaadmissions.com/hec-paris-mba-essay/"),
    ]

    for slug, url in pages[:limit]:
        print(f"  Fetching: {slug}...")
        html = fetch_page(url, client)
        if html:
            text = html_to_text(html)
            if len(text) > 200:
                fp = save_page(site_dir, slug, text, url)
                stats["success"] += 1
                stats["pages"].append(str(fp))
                print(f"  OK: {slug} ({len(text)} chars)")
            else:
                stats["fail"] += 1
                print(f"  SKIP: {slug} (too short: {len(text)} chars)")
        else:
            stats["fail"] += 1
        time.sleep(1.5)

    save_meta(site_dir, stats)
    return stats


def scrape_mba_com(client: httpx.Client, limit: int) -> dict:
    """Scrape MBA.com (GMAC) program data and class profiles."""
    site_dir = INFO_SITES_DIR / "mba_com"
    stats = {"site": "mba_com", "success": 0, "fail": 0, "pages": [], "scraped_at": datetime.now(timezone.utc).isoformat()}

    # MBA.com program finder and stats pages
    pages = [
        ("program-finder", "https://www.mba.com/business-school-and-program-search"),
        ("why-mba", "https://www.mba.com/information-and-news/research-and-data/why-b-school"),
        ("gmat-scores", "https://www.mba.com/exams/gmat-exam/about-the-gmat-exam/gmat-scores"),
        ("application-process", "https://www.mba.com/explore-programs/how-to-apply-to-mba-programs"),
        ("mba-salary", "https://www.mba.com/information-and-news/research-and-data/mba-salary-and-roi"),
        ("class-of-2024", "https://www.mba.com/information-and-news/research-and-data"),
        ("gmat-prep", "https://www.mba.com/exams/gmat-exam/prepare-for-the-gmat-exam"),
        ("top-programs", "https://www.mba.com/explore-programs"),
        ("executive-mba", "https://www.mba.com/explore-programs/executive-mba-programs"),
        ("mba-rankings-guide", "https://www.mba.com/explore-programs/business-school-rankings"),
    ]

    # School-specific program pages on MBA.com
    school_pages = [
        ("harvard-hbs", "https://www.mba.com/business-school-and-program-search/harvard-business-school"),
        ("stanford-gsb", "https://www.mba.com/business-school-and-program-search/stanford-graduate-school-of-business"),
        ("wharton", "https://www.mba.com/business-school-and-program-search/the-wharton-school"),
        ("booth", "https://www.mba.com/business-school-and-program-search/chicago-booth-school-of-business"),
        ("kellogg", "https://www.mba.com/business-school-and-program-search/kellogg-school-of-management"),
        ("columbia", "https://www.mba.com/business-school-and-program-search/columbia-business-school"),
        ("sloan", "https://www.mba.com/business-school-and-program-search/mit-sloan-school-of-management"),
        ("insead", "https://www.mba.com/business-school-and-program-search/insead"),
        ("lbs", "https://www.mba.com/business-school-and-program-search/london-business-school"),
        ("iese", "https://www.mba.com/business-school-and-program-search/iese-business-school"),
    ]

    all_pages = pages + school_pages
    for slug, url in all_pages[:limit]:
        print(f"  Fetching: {slug}...")
        html = fetch_page(url, client)
        if html:
            text = html_to_text(html)
            if len(text) > 200:
                fp = save_page(site_dir, slug, text, url)
                stats["success"] += 1
                stats["pages"].append(str(fp))
                print(f"  OK: {slug} ({len(text)} chars)")
            else:
                stats["fail"] += 1
                print(f"  SKIP: {slug} (too short: {len(text)} chars)")
        else:
            stats["fail"] += 1
        time.sleep(1.5)

    save_meta(site_dir, stats)
    return stats


def scrape_accepted(client: httpx.Client, limit: int) -> dict:
    """Scrape Accepted.com school profiles with stats and deadlines."""
    site_dir = INFO_SITES_DIR / "accepted"
    stats = {"site": "accepted", "success": 0, "fail": 0, "pages": [], "scraped_at": datetime.now(timezone.utc).isoformat()}

    # Accepted.com school-specific admissions pages
    pages = [
        ("mba-admissions-guide", "https://www.accepted.com/mba/home"),
        ("hbs-admissions", "https://www.accepted.com/mba/harvard-business-school"),
        ("stanford-admissions", "https://www.accepted.com/mba/stanford-gsb"),
        ("wharton-admissions", "https://www.accepted.com/mba/wharton"),
        ("booth-admissions", "https://www.accepted.com/mba/chicago-booth"),
        ("kellogg-admissions", "https://www.accepted.com/mba/kellogg"),
        ("columbia-admissions", "https://www.accepted.com/mba/columbia-business-school"),
        ("mit-sloan-admissions", "https://www.accepted.com/mba/mit-sloan"),
        ("tuck-admissions", "https://www.accepted.com/mba/dartmouth-tuck"),
        ("haas-admissions", "https://www.accepted.com/mba/uc-berkeley-haas"),
        ("ross-admissions", "https://www.accepted.com/mba/michigan-ross"),
        ("fuqua-admissions", "https://www.accepted.com/mba/duke-fuqua"),
        ("darden-admissions", "https://www.accepted.com/mba/uva-darden"),
        ("stern-admissions", "https://www.accepted.com/mba/nyu-stern"),
        ("anderson-admissions", "https://www.accepted.com/mba/ucla-anderson"),
        ("yale-som-admissions", "https://www.accepted.com/mba/yale-som"),
        ("johnson-admissions", "https://www.accepted.com/mba/cornell-johnson"),
        ("tepper-admissions", "https://www.accepted.com/mba/cmu-tepper"),
        ("insead-admissions", "https://www.accepted.com/mba/insead"),
        ("lbs-admissions", "https://www.accepted.com/mba/london-business-school"),
    ]

    for slug, url in pages[:limit]:
        print(f"  Fetching: {slug}...")
        html = fetch_page(url, client)
        if html:
            text = html_to_text(html)
            if len(text) > 200:
                fp = save_page(site_dir, slug, text, url)
                stats["success"] += 1
                stats["pages"].append(str(fp))
                print(f"  OK: {slug} ({len(text)} chars)")
            else:
                stats["fail"] += 1
                print(f"  SKIP: {slug} (too short: {len(text)} chars)")
        else:
            stats["fail"] += 1
        time.sleep(1.5)

    save_meta(site_dir, stats)
    return stats


# ─── Registry ───────────────────────────────────────────────────────────

SCRAPERS = {
    "gmatclub": scrape_gmatclub,
    "mbacrystalball": scrape_mbacrystalball,
    "fortuna": scrape_fortuna,
    "mba_com": scrape_mba_com,
    "accepted": scrape_accepted,
}


def main():
    parser = argparse.ArgumentParser(description="Scrape MBA aggregator sites")
    parser.add_argument("--site", required=True, help="Site to scrape: gmatclub|mbacrystalball|fortuna|mba_com|accepted|all")
    parser.add_argument("--limit", type=int, default=20, help="Max pages per site (default: 20)")
    args = parser.parse_args()

    sites = list(SCRAPERS.keys()) if args.site == "all" else [s.strip() for s in args.site.split(",")]

    # Validate
    for site in sites:
        if site not in SCRAPERS:
            print(f"ERROR: Unknown site '{site}'. Available: {', '.join(SCRAPERS.keys())}")
            sys.exit(1)

    INFO_SITES_DIR.mkdir(parents=True, exist_ok=True)

    all_stats = []
    with httpx.Client(headers=HEADERS, http2=True) as client:
        for site in sites:
            print(f"\n{'=' * 60}")
            print(f"SCRAPING: {site} (limit={args.limit})")
            print(f"{'=' * 60}")
            stats = SCRAPERS[site](client, args.limit)
            all_stats.append(stats)

    # Summary
    print(f"\n{'=' * 60}")
    print("SUMMARY")
    print(f"{'=' * 60}")
    total_success = 0
    total_fail = 0
    for s in all_stats:
        print(f"  {s['site']:20s}  success={s['success']:3d}  fail={s['fail']:3d}")
        total_success += s["success"]
        total_fail += s["fail"]
        if s["pages"]:
            print(f"    Files saved to: {Path(s['pages'][0]).parent}")
    print(f"  {'TOTAL':20s}  success={total_success:3d}  fail={total_fail:3d}")


if __name__ == "__main__":
    main()
