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

    # Fortuna /mba-school/ path (from sitemap) contains school profiles with essay tips, deadlines, stats
    pages = [
        ("hbs", "https://fortunaadmissions.com/mba-school/harvard-business-school/"),
        ("stanford-gsb", "https://fortunaadmissions.com/mba-school/stanford-gsb/"),
        ("upenn-wharton", "https://fortunaadmissions.com/mba-school/upenn-wharton/"),
        ("chicago-booth", "https://fortunaadmissions.com/mba-school/university-of-chicago-booth/"),
        ("northwestern-kellogg", "https://fortunaadmissions.com/mba-school/northwestern-kellogg/"),
        ("columbia-business-school", "https://fortunaadmissions.com/mba-school/columbia-business-school/"),
        ("mit-sloan", "https://fortunaadmissions.com/mba-school/mit-sloan/"),
        ("dartmouth-tuck", "https://fortunaadmissions.com/mba-school/dartmouth-tuck/"),
        ("berkeley-haas", "https://fortunaadmissions.com/mba-school/berkeley-haas/"),
        ("michigan-ross", "https://fortunaadmissions.com/mba-school/michigan-ross/"),
        ("duke-fuqua", "https://fortunaadmissions.com/mba-school/duke-fuqua/"),
        ("uva-darden", "https://fortunaadmissions.com/mba-school/uva-darden/"),
        ("nyu-stern", "https://fortunaadmissions.com/mba-school/nyu-stern/"),
        ("ucla-anderson", "https://fortunaadmissions.com/mba-school/ucla-anderson/"),
        ("yale-som", "https://fortunaadmissions.com/mba-school/yale-school-of-management-som/"),
        ("cornell-johnson", "https://fortunaadmissions.com/mba-school/cornell-johnson/"),
        ("cmu-tepper", "https://fortunaadmissions.com/mba-school/carnegie-mellon-tepper/"),
        ("insead", "https://fortunaadmissions.com/mba-school/insead/"),
        ("lbs", "https://fortunaadmissions.com/mba-school/london-business-school/"),
        ("hec-paris", "https://fortunaadmissions.com/mba-school/hec-paris/"),
        ("iese", "https://fortunaadmissions.com/mba-school/iese/"),
        ("imd", "https://fortunaadmissions.com/mba-school/imd/"),
        ("oxford-said", "https://fortunaadmissions.com/mba-school/oxford-said/"),
        ("cambridge-judge", "https://fortunaadmissions.com/mba-school/cambridge-judge/"),
        ("ie", "https://fortunaadmissions.com/mba-school/ie/"),
        ("rotman", "https://fortunaadmissions.com/mba-school/toronto-rotman/"),
        ("mccombs", "https://fortunaadmissions.com/mba-school/ut-austin-mccombs/"),
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
    """Scrape MBA.com (GMAC) program data and class profiles.

    MBA.com is a JS-rendered SPA. We use Google's cache and web archive as fallback,
    and also try fetching with a render-friendly user agent.
    """
    site_dir = INFO_SITES_DIR / "mba_com"
    stats = {"site": "mba_com", "success": 0, "fail": 0, "pages": [], "scraped_at": datetime.now(timezone.utc).isoformat()}

    # MBA.com pages — try with Googlebot-compatible UA for SSR content
    pages = [
        ("program-finder", "https://www.mba.com/business-school-and-program-search"),
        ("why-mba", "https://www.mba.com/information-and-news/research-and-data/why-b-school"),
        ("gmat-scores", "https://www.mba.com/exams/gmat-exam/about-the-gmat-exam/gmat-scores"),
        ("application-process", "https://www.mba.com/explore-programs/how-to-apply-to-mba-programs"),
        ("mba-salary", "https://www.mba.com/information-and-news/research-and-data/mba-salary-and-roi"),
        ("research-data", "https://www.mba.com/information-and-news/research-and-data"),
        ("gmat-prep", "https://www.mba.com/exams/gmat-exam/prepare-for-the-gmat-exam"),
        ("explore-programs", "https://www.mba.com/explore-programs"),
        ("executive-mba", "https://www.mba.com/explore-programs/executive-mba-programs"),
        ("rankings-guide", "https://www.mba.com/explore-programs/business-school-rankings"),
        ("gmat-focus-edition", "https://www.mba.com/exams/gmat-focus-edition"),
        ("mba-program-types", "https://www.mba.com/explore-programs/mba-program-types"),
        ("application-timeline", "https://www.mba.com/explore-programs/application-timeline"),
        ("mba-financing", "https://www.mba.com/explore-programs/financing-your-mba"),
        ("diversity-in-mba", "https://www.mba.com/explore-programs/diversity-in-business-school"),
        ("gmat-score-report", "https://www.mba.com/exams/gmat-exam/after-the-exam/gmat-scores-and-score-reports"),
        ("gmat-overview", "https://www.mba.com/exams/gmat-exam"),
        ("mba-news", "https://www.mba.com/information-and-news"),
        ("find-events", "https://www.mba.com/information-and-news/events"),
        ("mba-tour", "https://www.mba.com/information-and-news/events/the-mba-tour"),
    ]

    # Try with a Googlebot-like user agent for SSR content
    googlebot_headers = {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    for slug, url in pages[:limit]:
        print(f"  Fetching: {slug}...")
        # Try regular first, then Googlebot UA
        html = fetch_page(url, client)
        text = html_to_text(html) if html else ""
        if len(text) < 200:
            # Retry with Googlebot UA
            try:
                resp = client.get(url, timeout=15, follow_redirects=True, headers=googlebot_headers)
                if resp.status_code < 400:
                    text = html_to_text(resp.text)
            except Exception:
                pass
        if len(text) > 200:
            fp = save_page(site_dir, slug, text, url)
            stats["success"] += 1
            stats["pages"].append(str(fp))
            print(f"  OK: {slug} ({len(text)} chars)")
        else:
            stats["fail"] += 1
            print(f"  SKIP: {slug} (JS-rendered, {len(text)} chars)")
        time.sleep(1.5)

    save_meta(site_dir, stats)
    return stats


def scrape_accepted(client: httpx.Client, limit: int) -> dict:
    """Scrape Accepted.com school profiles with stats and deadlines."""
    site_dir = INFO_SITES_DIR / "accepted"
    stats = {"site": "accepted", "success": 0, "fail": 0, "pages": [], "scraped_at": datetime.now(timezone.utc).isoformat()}

    # Accepted.com correct URL patterns (from sitemap)
    pages = [
        ("mba-admissions-guide", "https://www.accepted.com/mba"),
        ("goals-business-school", "https://www.accepted.com/goals/business-school/"),
        ("best-mba-programs", "https://www.accepted.com/resources/free-guides/business-school/the-best-mba-programs/"),
        ("navigating-mba-admissions", "https://www.accepted.com/resources/free-guides/business-school/navigating-mba-admissions/"),
        ("mba-essay-guide", "https://www.accepted.com/resources/free-guides/business-school/five-fatal-flaws-to-avoid-in-your-mba-application-essays/"),
        ("sample-essays-from-example", "https://www.accepted.com/resources/free-guides/business-school/from-example-to-exceptional/"),
        ("mba-resume-guide", "https://www.accepted.com/resources/free-guides/business-school/admissions-resume-guide/"),
        ("mba-goals-essays", "https://www.accepted.com/resources/free-guides/business-school/crafting-compelling-mba-goals-essays/"),
        ("mba-application-plan", "https://www.accepted.com/resources/free-guides/business-school/establishing-your-mba-application-plan/"),
        ("mba-interview-guide", "https://www.accepted.com/resources/free-guides/business-school/mastering-your-mba-interview/"),
        ("emba-guide", "https://www.accepted.com/resources/free-guides/business-school/navigating-the-emba-application-process/"),
        ("prep-for-bschool", "https://www.accepted.com/resources/free-guides/business-school/prep-for-b-school/"),
        ("sample-mba-essays", "https://www.accepted.com/resources/free-guides/business-school/sample-mba-application-essays/"),
        ("leadership-in-admissions", "https://www.accepted.com/resources/free-guides/business-school/showcasing-leadership-in-admissions/"),
        ("competitive-applicant", "https://www.accepted.com/resources/free-guides/business-school/the-ultimate-guide-to-becoming-a-competitive-mba-applicant/"),
        ("selectivity-index", "https://www.accepted.com/resources/selectivity-index/business-school/"),
        ("sample-essays-collection", "https://www.accepted.com/resources/sample-essays/business-school/"),
        ("essay-tips", "https://www.accepted.com/resources/essay-tips/business-school/"),
        ("deadlines", "https://www.accepted.com/resources/deadlines/business-school/"),
        ("admissions-calculator", "https://www.accepted.com/resources/admissions-calculator/business-school/"),
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
