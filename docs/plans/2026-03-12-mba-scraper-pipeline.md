# MBA Scraper Pipeline — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a three-stage pipeline (discover → crawl → extract) that creates the world's most comprehensive MBA program database by scraping every accredited program's website.

**Architecture:** Python CLI tool with three independent stages. Stage 1 scrapes ranking sites to build a master list of ~600+ MBA programs with URLs. Stage 2 uses Playwright to render and cache each school's admissions pages. Stage 3 feeds cached page text to Claude API to extract structured data into a unified JSON schema.

**Tech Stack:** Python 3.11+, Playwright (browser automation), Anthropic SDK (Claude extraction), rapidfuzz (dedup), asyncio (concurrent crawling)

**Design doc:** `docs/plans/2026-03-12-mba-scraper-pipeline-design.md`

---

## Task 0: Project Setup

**Files:**
- Create: `backend/scraper/__init__.py`
- Create: `backend/scraper/config.py`
- Modify: `backend/requirements.txt`

**Step 1: Create scraper package directory**

```bash
mkdir -p backend/scraper
```

**Step 2: Install new dependency**

```bash
pip install rapidfuzz
```

**Step 3: Add to requirements.txt**

Append to `backend/requirements.txt`:
```
# Scraper pipeline
rapidfuzz>=3.0.0
```

**Step 4: Create `backend/scraper/__init__.py`**

```python
"""MBA Scraper Pipeline — discover, crawl, extract, merge."""
```

**Step 5: Create `backend/scraper/config.py`**

```python
"""Scraper configuration and constants."""
import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
DATA_DIR = BASE_DIR / "data"
RAW_HTML_DIR = DATA_DIR / "raw_html"
DISCOVERY_LIST_FILE = DATA_DIR / "discovery_list.json"
SCRAPED_DB_FILE = DATA_DIR / "school_db_scraped.json"
EXISTING_DB_FILE = DATA_DIR / "school_db_full.json"

# Crawl settings
CRAWL_DELAY_SEC = 2.0          # Delay between requests to same domain
CRAWL_CONCURRENCY = 3          # Max parallel browser contexts
CRAWL_TIMEOUT_MS = 30_000      # Page load timeout
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

# Extraction settings
ANTHROPIC_MODEL = "claude-sonnet-4-20250514"
EXTRACT_MAX_TOKENS = 4096
EXTRACT_BATCH_SIZE = 5         # Schools per batch for extraction

# Discovery: ranking source URLs
RANKING_SOURCES = {
    "ft_global": "https://rankings.ft.com/rankings/2862/global-mba-ranking-2025",
    "qs_global": "https://www.topuniversities.com/university-rankings/mba-rankings/global/2025",
    "us_news": "https://www.usnews.com/best-graduate-schools/top-business-schools/mba-rankings",
    "poets_quants": "https://poetsandquants.com/ranking/best-mba-programs-top-100-us-business-schools/",
    "aacsb": "https://www.aacsb.edu/accredited",
}

# Pages to crawl per school (URL suffixes to try)
CRAWL_PAGE_PATTERNS = [
    ("admissions", ["/admissions", "/mba/admissions", "/admission", "/apply", "/mba/apply"]),
    ("class_profile", ["/class-profile", "/mba/class-profile", "/student-profile", "/class", "/mba/students"]),
    ("essays", ["/essays", "/mba/essays", "/application-requirements", "/mba/application"]),
    ("employment", ["/employment", "/careers", "/employment-report", "/placement", "/mba/careers"]),
    ("tuition", ["/tuition", "/financial-aid", "/cost", "/mba/tuition", "/mba/financial-aid"]),
    ("deadlines", ["/deadlines", "/mba/deadlines", "/important-dates", "/application-deadlines"]),
]

# Ensure directories exist
RAW_HTML_DIR.mkdir(parents=True, exist_ok=True)
```

**Step 6: Commit**

```bash
git add backend/scraper/ backend/requirements.txt
git commit -m "chore: scaffold scraper pipeline package with config"
```

---

## Task 1: Discovery — Ranking Site Scraper

**Files:**
- Create: `backend/scraper/utils.py`
- Create: `backend/scraper/discover.py`
- Test: `backend/scraper/test_discover.py`

**Step 1: Create `backend/scraper/utils.py` — shared helpers**

```python
"""Shared utilities for scraper pipeline."""
import re
import json
from pathlib import Path
from rapidfuzz import fuzz


def normalize_school_name(name: str) -> str:
    """Normalize school name for dedup matching.
    'The Wharton School, University of Pennsylvania' -> 'wharton school university of pennsylvania'
    """
    name = name.lower().strip()
    name = re.sub(r"[^a-z0-9\s]", "", name)
    # Remove common prefixes/suffixes
    for prefix in ["the ", "school of "]:
        if name.startswith(prefix):
            name = name[len(prefix):]
    return " ".join(name.split())


def deduplicate_schools(schools: list[dict], threshold: int = 80) -> list[dict]:
    """Deduplicate school list using fuzzy matching on name + location.
    Returns list with duplicates merged (keeps entry with most data).
    """
    seen = []
    result = []

    for school in schools:
        norm = normalize_school_name(school["name"])
        is_dup = False
        for i, (existing_norm, existing_school) in enumerate(seen):
            # Fuzzy match on name
            score = fuzz.token_sort_ratio(norm, existing_norm)
            if score >= threshold:
                # Same city = definitely duplicate
                if school.get("location", "").split(",")[0].lower().strip() == \
                   existing_school.get("location", "").split(",")[0].lower().strip():
                    score = 100

                if score >= threshold:
                    # Merge: keep the one with more fields / higher ranking
                    if len(school) > len(existing_school):
                        seen[i] = (norm, school)
                        result[i] = school
                    # Merge rankings from both
                    for key in ["ft_rank", "qs_rank", "usn_rank", "pq_rank"]:
                        if key in school and key not in result[i]:
                            result[i][key] = school[key]
                    is_dup = True
                    break

        if not is_dup:
            seen.append((norm, school))
            result.append(school)

    return result


def slugify(name: str) -> str:
    """Convert school name to filesystem-safe ID.
    'Harvard Business School' -> 'harvard_business_school'
    """
    s = name.lower().strip()
    s = re.sub(r"[^a-z0-9\s]", "", s)
    s = re.sub(r"\s+", "_", s)
    return s[:60]


def save_json(data, path: Path):
    """Save data as formatted JSON."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  Saved {path} ({len(data) if isinstance(data, (list, dict)) else '?'} entries)")


def load_json(path: Path) -> dict | list:
    """Load JSON file, return empty dict if missing."""
    if not path.exists():
        return {}
    with open(path) as f:
        return json.load(f)
```

**Step 2: Write failing test for utils**

Create `backend/scraper/test_discover.py`:
```python
"""Tests for discovery and utility functions."""
from backend.scraper.utils import normalize_school_name, deduplicate_schools, slugify


def test_normalize_school_name():
    assert normalize_school_name("The Wharton School") == "wharton school"
    assert normalize_school_name("Harvard Business School") == "harvard business school"
    assert normalize_school_name("  MIT Sloan  ") == "mit sloan"
    assert normalize_school_name("IIM-Ahmedabad (IIMA)") == "iimahmedabad iima"


def test_slugify():
    assert slugify("Harvard Business School") == "harvard_business_school"
    assert slugify("IIM Ahmedabad") == "iim_ahmedabad"
    assert slugify("INSEAD") == "insead"


def test_deduplicate_schools():
    schools = [
        {"name": "Harvard Business School", "location": "Boston, MA", "ft_rank": 4},
        {"name": "HBS - Harvard Business School", "location": "Boston, MA", "qs_rank": 3},
        {"name": "Stanford GSB", "location": "Stanford, CA", "ft_rank": 1},
    ]
    result = deduplicate_schools(schools)
    assert len(result) == 2
    # Harvard should have both rankings merged
    harvard = [s for s in result if "Harvard" in s["name"]][0]
    assert "ft_rank" in harvard
    assert "qs_rank" in harvard
```

**Step 3: Run tests to verify they pass**

```bash
cd backend && python -m pytest scraper/test_discover.py -v
```

Expected: 3 tests PASS.

**Step 4: Create `backend/scraper/discover.py`**

This is the core discovery module. It uses Playwright to scrape ranking sites and builds the master list.

```python
"""Stage 1: Discover MBA programs from ranking sites and accreditation directories."""
import asyncio
import json
import re
from playwright.async_api import async_playwright, Page
from backend.scraper.config import (
    DISCOVERY_LIST_FILE, RANKING_SOURCES, CRAWL_TIMEOUT_MS, USER_AGENT,
)
from backend.scraper.utils import deduplicate_schools, slugify, save_json, load_json


async def _extract_schools_from_page(page: Page, source_name: str) -> list[dict]:
    """Generic extraction: get all text, find school-like entries."""
    text = await page.inner_text("body")
    # This will be enhanced per-source, but the generic approach:
    # Look for lines that look like school names (Title Case, contains "Business", "School", "MBA", etc.)
    schools = []
    lines = text.split("\n")
    for i, line in enumerate(lines):
        line = line.strip()
        if not line or len(line) < 5 or len(line) > 150:
            continue
        # Heuristic: school names are Title Case, contain keywords
        if any(kw in line for kw in ["Business School", "School of Business", "MBA", "Management",
                                      "Graduate School", "Business Administration"]):
            # Try to find a rank number nearby
            rank = None
            rank_match = re.search(r"^(\d{1,3})\s", line)
            if rank_match:
                rank = int(rank_match.group(1))
                line = line[rank_match.end():].strip()
            elif i > 0:
                prev_match = re.search(r"^(\d{1,3})$", lines[i-1].strip())
                if prev_match:
                    rank = int(prev_match.group(1))

            schools.append({
                "name": line[:120],
                "source": source_name,
                f"{source_name}_rank": rank,
            })
    return schools


async def scrape_us_news(page: Page) -> list[dict]:
    """Scrape US News MBA rankings."""
    print("  [US News] Scraping...")
    url = RANKING_SOURCES["us_news"]
    schools = []
    try:
        await page.goto(url, timeout=CRAWL_TIMEOUT_MS, wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)

        # US News uses specific markup — extract school names and ranks
        # Try to get all school entries
        entries = await page.query_selector_all("[class*='RankingItem'], [class*='ranking-item'], .school-name, h3 a")
        if entries:
            for entry in entries:
                text = (await entry.inner_text()).strip()
                if text and len(text) > 3:
                    schools.append({"name": text, "source": "us_news"})

        # Fallback: generic extraction
        if len(schools) < 10:
            schools = await _extract_schools_from_page(page, "usn")

        # Paginate: click "Load More" / next page if available
        for _ in range(5):  # Up to 5 pages
            load_more = await page.query_selector("button:has-text('Load More'), a:has-text('Next')")
            if load_more:
                await load_more.click()
                await page.wait_for_timeout(2000)
                more = await _extract_schools_from_page(page, "usn")
                schools.extend(more)

    except Exception as e:
        print(f"  [US News] Error: {e}")

    print(f"  [US News] Found {len(schools)} schools")
    return schools


async def scrape_ft_global(page: Page) -> list[dict]:
    """Scrape Financial Times Global MBA ranking."""
    print("  [FT] Scraping...")
    url = RANKING_SOURCES["ft_global"]
    schools = []
    try:
        await page.goto(url, timeout=CRAWL_TIMEOUT_MS, wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)
        schools = await _extract_schools_from_page(page, "ft")
    except Exception as e:
        print(f"  [FT] Error: {e}")
    print(f"  [FT] Found {len(schools)} schools")
    return schools


async def scrape_qs_global(page: Page) -> list[dict]:
    """Scrape QS Global MBA ranking."""
    print("  [QS] Scraping...")
    url = RANKING_SOURCES["qs_global"]
    schools = []
    try:
        await page.goto(url, timeout=CRAWL_TIMEOUT_MS, wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)

        # QS typically shows school name + location in rows
        entries = await page.query_selector_all("[class*='uni-link'], .university-name, td a")
        for entry in entries:
            text = (await entry.inner_text()).strip()
            href = await entry.get_attribute("href") or ""
            if text and len(text) > 3:
                schools.append({
                    "name": text,
                    "source": "qs",
                    "detail_url": href if href.startswith("http") else None,
                })

        if len(schools) < 10:
            schools = await _extract_schools_from_page(page, "qs")

    except Exception as e:
        print(f"  [QS] Error: {e}")
    print(f"  [QS] Found {len(schools)} schools")
    return schools


async def scrape_poets_quants(page: Page) -> list[dict]:
    """Scrape Poets&Quants MBA ranking."""
    print("  [P&Q] Scraping...")
    url = RANKING_SOURCES["poets_quants"]
    schools = []
    try:
        await page.goto(url, timeout=CRAWL_TIMEOUT_MS, wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)
        schools = await _extract_schools_from_page(page, "pq")
    except Exception as e:
        print(f"  [P&Q] Error: {e}")
    print(f"  [P&Q] Found {len(schools)} schools")
    return schools


# -- Hardcoded seed list for schools we know exist but may not appear in rankings --

SEED_SCHOOLS = [
    # IIMs (India)
    {"name": "IIM Ahmedabad", "location": "Ahmedabad, India", "country": "India", "website": "https://www.iima.ac.in"},
    {"name": "IIM Bangalore", "location": "Bangalore, India", "country": "India", "website": "https://www.iimb.ac.in"},
    {"name": "IIM Calcutta", "location": "Kolkata, India", "country": "India", "website": "https://www.iimcal.ac.in"},
    {"name": "IIM Lucknow", "location": "Lucknow, India", "country": "India", "website": "https://www.iiml.ac.in"},
    {"name": "IIM Indore", "location": "Indore, India", "country": "India", "website": "https://www.iimidr.ac.in"},
    {"name": "IIM Kozhikode", "location": "Kozhikode, India", "country": "India", "website": "https://www.iimk.ac.in"},
    {"name": "ISB Hyderabad", "location": "Hyderabad, India", "country": "India", "website": "https://www.isb.edu"},
    {"name": "XLRI Jamshedpur", "location": "Jamshedpur, India", "country": "India", "website": "https://www.xlri.ac.in"},
    {"name": "SP Jain (SPJIMR)", "location": "Mumbai, India", "country": "India", "website": "https://www.spjimr.org"},
    {"name": "MDI Gurgaon", "location": "Gurgaon, India", "country": "India", "website": "https://www.mdi.ac.in"},
    {"name": "FMS Delhi", "location": "New Delhi, India", "country": "India", "website": "https://fms.edu"},
    {"name": "IIFT Delhi", "location": "New Delhi, India", "country": "India", "website": "https://www.iift.ac.in"},
    {"name": "NITIE Mumbai", "location": "Mumbai, India", "country": "India", "website": "https://www.nitie.ac.in"},
    {"name": "IIM Shillong", "location": "Shillong, India", "country": "India", "website": "https://www.iimshillong.ac.in"},
    {"name": "IIM Trichy", "location": "Tiruchirappalli, India", "country": "India", "website": "https://www.iimtrichy.ac.in"},
    {"name": "IIM Udaipur", "location": "Udaipur, India", "country": "India", "website": "https://www.iimu.ac.in"},
    {"name": "IIM Ranchi", "location": "Ranchi, India", "country": "India", "website": "https://www.iimranchi.ac.in"},
    {"name": "IIM Raipur", "location": "Raipur, India", "country": "India", "website": "https://www.iimraipur.ac.in"},
    {"name": "IIM Kashipur", "location": "Kashipur, India", "country": "India", "website": "https://www.iimkashipur.ac.in"},
    {"name": "IIM Rohtak", "location": "Rohtak, India", "country": "India", "website": "https://www.iimrohtak.ac.in"},
    {"name": "Great Lakes Institute of Management", "location": "Chennai, India", "country": "India", "website": "https://www.greatlakes.edu.in"},
    {"name": "NMIMS Mumbai", "location": "Mumbai, India", "country": "India", "website": "https://www.nmims.edu"},
    # Top global programs that might not appear in US-focused rankings
    {"name": "CEIBS", "location": "Shanghai, China", "country": "China", "website": "https://www.ceibs.edu"},
    {"name": "HKUST Business School", "location": "Hong Kong", "country": "Hong Kong", "website": "https://www.bm.ust.hk"},
    {"name": "NUS Business School", "location": "Singapore", "country": "Singapore", "website": "https://bschool.nus.edu.sg"},
    {"name": "Melbourne Business School", "location": "Melbourne, Australia", "country": "Australia", "website": "https://mbs.edu"},
    {"name": "Schulich School of Business", "location": "Toronto, Canada", "country": "Canada", "website": "https://schulich.yorku.ca"},
    {"name": "Rotman School of Management", "location": "Toronto, Canada", "country": "Canada", "website": "https://www.rotman.utoronto.ca"},
    {"name": "Ivey Business School", "location": "London, Canada", "country": "Canada", "website": "https://www.ivey.uwo.ca"},
    {"name": "EGADE Business School", "location": "Monterrey, Mexico", "country": "Mexico", "website": "https://egade.tec.mx"},
    {"name": "Fundacao Getulio Vargas", "location": "Sao Paulo, Brazil", "country": "Brazil", "website": "https://portal.fgv.br"},
    {"name": "African Leadership University", "location": "Kigali, Rwanda", "country": "Rwanda", "website": "https://www.alueducation.com"},
    {"name": "Lagos Business School", "location": "Lagos, Nigeria", "country": "Nigeria", "website": "https://www.lbs.edu.ng"},
]


async def discover_all(use_cache: bool = True) -> list[dict]:
    """Run full discovery pipeline: scrape rankings + seed list → deduplicated master list.

    Args:
        use_cache: If True and discovery_list.json exists, load from cache instead of re-scraping.
    """
    if use_cache and DISCOVERY_LIST_FILE.exists():
        print(f"  Loading cached discovery list from {DISCOVERY_LIST_FILE}")
        return load_json(DISCOVERY_LIST_FILE)

    all_schools = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(user_agent=USER_AGENT)

        # Scrape each ranking source
        scrapers = [
            ("US News", scrape_us_news),
            ("FT Global", scrape_ft_global),
            ("QS Global", scrape_qs_global),
            ("Poets & Quants", scrape_poets_quants),
        ]

        for name, scraper_fn in scrapers:
            page = await context.new_page()
            try:
                schools = await scraper_fn(page)
                all_schools.extend(schools)
            except Exception as e:
                print(f"  [{name}] FAILED: {e}")
            finally:
                await page.close()

        await browser.close()

    # Add seed schools
    all_schools.extend(SEED_SCHOOLS)

    print(f"\n  Raw total: {len(all_schools)} entries from all sources")

    # Deduplicate
    deduped = deduplicate_schools(all_schools)
    print(f"  After dedup: {len(deduped)} unique schools")

    # Assign IDs
    for school in deduped:
        if "id" not in school:
            school["id"] = slugify(school["name"])

    # Save
    save_json(deduped, DISCOVERY_LIST_FILE)
    return deduped


# Also export our existing 254 schools from the current DB to merge with discovered
def load_existing_schools() -> list[dict]:
    """Load existing school_db_full.json and convert to discovery format."""
    from backend.scraper.config import EXISTING_DB_FILE
    db = load_json(EXISTING_DB_FILE)
    schools = []
    for school_id, data in db.items():
        # Skip synthetic hex-hash schools
        if len(school_id) > 20:
            continue
        schools.append({
            "id": school_id,
            "name": data["name"],
            "location": data.get("location", ""),
            "country": data.get("country", ""),
            "source": "existing_db",
        })
    return schools
```

**Step 5: Run tests again**

```bash
cd backend && python -m pytest scraper/test_discover.py -v
```

Expected: All PASS.

**Step 6: Commit**

```bash
git add backend/scraper/
git commit -m "feat: add discovery module with ranking scrapers and seed school list"
```

---

## Task 2: Crawl Engine — Playwright Page Scraper

**Files:**
- Create: `backend/scraper/crawl.py`
- Test: `backend/scraper/test_crawl.py`

**Step 1: Write failing test**

Create `backend/scraper/test_crawl.py`:
```python
"""Tests for crawl engine."""
import pytest
from pathlib import Path
from backend.scraper.crawl import (
    build_page_urls,
    save_crawl_result,
    is_already_crawled,
)


def test_build_page_urls():
    urls = build_page_urls("https://www.hbs.edu/mba")
    assert len(urls) > 0
    # Should include admissions, class profile, etc.
    assert any("admissions" in u[0] for u in urls)
    assert any("class" in u[0] or "profile" in u[0] for u in urls)


def test_save_and_check_crawl(tmp_path):
    save_crawl_result(
        school_id="test_school",
        page_name="admissions",
        html="<html><body>Hello</body></html>",
        text="Hello",
        url="https://example.com/admissions",
        output_dir=tmp_path,
    )
    assert is_already_crawled("test_school", "admissions", output_dir=tmp_path)
    assert not is_already_crawled("test_school", "essays", output_dir=tmp_path)
```

**Step 2: Run to verify fail**

```bash
cd backend && python -m pytest scraper/test_crawl.py -v
```

Expected: FAIL (import error).

**Step 3: Implement `backend/scraper/crawl.py`**

```python
"""Stage 2: Crawl each school's MBA pages using Playwright."""
import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright, Page, BrowserContext
from backend.scraper.config import (
    RAW_HTML_DIR, CRAWL_DELAY_SEC, CRAWL_CONCURRENCY,
    CRAWL_TIMEOUT_MS, USER_AGENT, CRAWL_PAGE_PATTERNS,
)
from backend.scraper.utils import load_json, save_json


def build_page_urls(base_url: str) -> list[tuple[str, str]]:
    """Build candidate page URLs for a school's MBA site.
    Returns list of (page_name, url) tuples.
    """
    # Normalize base URL
    base = base_url.rstrip("/")
    results = []
    for page_name, suffixes in CRAWL_PAGE_PATTERNS:
        for suffix in suffixes:
            results.append((page_name, f"{base}{suffix}"))
    return results


def save_crawl_result(
    school_id: str,
    page_name: str,
    html: str,
    text: str,
    url: str,
    output_dir: Path | None = None,
):
    """Save crawled HTML and extracted text to disk."""
    out = (output_dir or RAW_HTML_DIR) / school_id
    out.mkdir(parents=True, exist_ok=True)

    (out / f"{page_name}.html").write_text(html, encoding="utf-8")
    (out / f"{page_name}.txt").write_text(text, encoding="utf-8")

    # Save metadata
    meta_file = out / "meta.json"
    meta = json.loads(meta_file.read_text()) if meta_file.exists() else {}
    meta[page_name] = {"url": url, "chars": len(text)}
    meta_file.write_text(json.dumps(meta, indent=2))


def is_already_crawled(
    school_id: str,
    page_name: str,
    output_dir: Path | None = None,
) -> bool:
    """Check if a page was already crawled."""
    out = (output_dir or RAW_HTML_DIR) / school_id
    return (out / f"{page_name}.txt").exists()


async def _crawl_page(page: Page, url: str) -> tuple[str, str] | None:
    """Fetch a single page, return (html, text) or None on failure."""
    try:
        response = await page.goto(url, timeout=CRAWL_TIMEOUT_MS, wait_until="domcontentloaded")
        if response is None or response.status >= 400:
            return None
        await page.wait_for_timeout(1500)  # Let JS render

        html = await page.content()
        text = await page.inner_text("body")

        # Skip if page is too short (likely 404 page or redirect)
        if len(text.strip()) < 200:
            return None

        return html, text
    except Exception:
        return None


async def crawl_school(
    context: BrowserContext,
    school: dict,
    resume: bool = True,
) -> dict:
    """Crawl all pages for a single school.
    Returns dict of {page_name: {url, chars}} for successfully crawled pages.
    """
    school_id = school["id"]
    website = school.get("website", "")
    if not website:
        return {}

    results = {}
    page = await context.new_page()

    try:
        candidate_urls = build_page_urls(website)

        for page_name, url in candidate_urls:
            # Skip if already crawled (and resume mode)
            if resume and is_already_crawled(school_id, page_name):
                continue

            # Skip if we already found this page type
            if page_name in results:
                continue

            result = await _crawl_page(page, url)
            if result:
                html, text = result
                save_crawl_result(school_id, page_name, html, text, url)
                results[page_name] = {"url": url, "chars": len(text)}
                await asyncio.sleep(CRAWL_DELAY_SEC)

        # Also crawl the base website as "homepage"
        if not is_already_crawled(school_id, "homepage") or not resume:
            result = await _crawl_page(page, website)
            if result:
                html, text = result
                save_crawl_result(school_id, page_name="homepage", html=html, text=text, url=website)
                results["homepage"] = {"url": website, "chars": len(text)}

    finally:
        await page.close()

    return results


async def crawl_all(schools: list[dict], resume: bool = True) -> dict:
    """Crawl all schools with concurrency control.
    Returns dict of {school_id: {page_name: {url, chars}}}.
    """
    all_results = {}
    sem = asyncio.Semaphore(CRAWL_CONCURRENCY)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(user_agent=USER_AGENT)

        async def crawl_with_sem(school: dict):
            async with sem:
                sid = school["id"]
                print(f"  Crawling {sid} ({school.get('name', '?')})...")
                try:
                    results = await crawl_school(context, school, resume=resume)
                    all_results[sid] = results
                    pages = len(results)
                    print(f"    ✅ {sid}: {pages} pages crawled")
                except Exception as e:
                    print(f"    ❌ {sid}: {e}")

        # Filter to schools with websites
        with_urls = [s for s in schools if s.get("website")]
        without = len(schools) - len(with_urls)
        if without:
            print(f"  ⚠️ {without} schools have no website URL, skipping")

        print(f"  Crawling {len(with_urls)} schools ({CRAWL_CONCURRENCY} concurrent)...")

        tasks = [crawl_with_sem(s) for s in with_urls]
        await asyncio.gather(*tasks)

        await browser.close()

    return all_results
```

**Step 4: Run tests**

```bash
cd backend && python -m pytest scraper/test_crawl.py -v
```

Expected: All PASS.

**Step 5: Commit**

```bash
git add backend/scraper/crawl.py backend/scraper/test_crawl.py
git commit -m "feat: add Playwright crawl engine with resume support"
```

---

## Task 3: Claude Extraction Pipeline

**Files:**
- Create: `backend/scraper/extract.py`
- Test: `backend/scraper/test_extract.py`

**Step 1: Write failing test**

Create `backend/scraper/test_extract.py`:
```python
"""Tests for extraction module."""
from backend.scraper.extract import build_extraction_prompt, parse_extraction_response


def test_build_extraction_prompt():
    prompt = build_extraction_prompt("Harvard Business School", "This is page text about admissions...")
    assert "Harvard Business School" in prompt
    assert "essay_prompts" in prompt
    assert "JSON" in prompt


def test_parse_extraction_response_valid():
    raw = '```json\n{"essay_prompts": ["Why MBA?"], "tuition_usd": 74000}\n```'
    parsed = parse_extraction_response(raw)
    assert parsed["essay_prompts"] == ["Why MBA?"]
    assert parsed["tuition_usd"] == 74000


def test_parse_extraction_response_no_codeblock():
    raw = '{"essay_prompts": null, "tuition_usd": 50000}'
    parsed = parse_extraction_response(raw)
    assert parsed["tuition_usd"] == 50000


def test_parse_extraction_response_garbage():
    parsed = parse_extraction_response("I couldn't find any data")
    assert parsed == {}
```

**Step 2: Run to verify fail**

```bash
cd backend && python -m pytest scraper/test_extract.py -v
```

**Step 3: Implement `backend/scraper/extract.py`**

```python
"""Stage 3: Extract structured data from crawled pages using Claude API."""
import json
import re
import os
from pathlib import Path
from anthropic import Anthropic
from backend.scraper.config import (
    RAW_HTML_DIR, SCRAPED_DB_FILE, ANTHROPIC_MODEL,
    EXTRACT_MAX_TOKENS, DATA_DIR,
)
from backend.scraper.utils import save_json, load_json


client = Anthropic()  # Uses ANTHROPIC_API_KEY env var


EXTRACTION_SCHEMA = """\
{
  "essay_prompts": ["exact essay question text for current admissions cycle"],
  "admission_deadlines": [{"round": "R1", "deadline": "YYYY-MM-DD", "decision": "YYYY-MM-DD"}],
  "tuition_usd": 74000,
  "class_profile": {
    "avg_gmat": 730,
    "avg_gpa": 3.7,
    "class_size": 945,
    "avg_age": 28,
    "pct_female": 42,
    "pct_international": 37,
    "countries_represented": 65
  },
  "scholarships": [{"name": "Fellowship Name", "amount": "$50,000/year", "criteria": "merit/need-based"}],
  "placement_stats": {
    "employment_rate_3_months": 93,
    "median_base_salary": 175000,
    "median_signing_bonus": 30000,
    "top_recruiters": ["McKinsey", "Google", "Goldman Sachs"],
    "industry_breakdown": [{"industry": "Consulting", "percentage": 25}]
  },
  "interview_format": {
    "type": "blind/informed",
    "duration_minutes": 30,
    "format": "behavioral + case"
  },
  "application_url": "https://...",
  "application_fee_usd": 250,
  "accreditations": ["AACSB", "EQUIS"],
  "stem_designated": true,
  "program_duration_months": 24,
  "start_dates": ["August", "January"],
  "gmat_range": "690-760",
  "gpa_range": "3.4-3.9",
  "work_exp_range": "3-8 years",
  "acceptance_rate": 12.5,
  "confidence": 0.85
}"""


def build_extraction_prompt(school_name: str, page_text: str) -> str:
    """Build the Claude extraction prompt."""
    # Truncate page text to ~15K chars to stay within context
    truncated = page_text[:15000]

    return f"""\
You are extracting structured MBA admissions data from a school's website.

SCHOOL: {school_name}

PAGE TEXT:
---
{truncated}
---

Extract the following information as a JSON object. Rules:
1. Use null for any field not found in the text. NEVER guess or fabricate data.
2. Essay prompts must be the EXACT text from the page — do not paraphrase.
3. Dates should be in YYYY-MM-DD format when possible.
4. Salary/tuition as integers (no $ or commas).
5. Percentages as numbers (42 not "42%").
6. Set "confidence" from 0.0 to 1.0 based on how much data you found.

Return ONLY valid JSON matching this schema:
{EXTRACTION_SCHEMA}

If the page has no relevant MBA admissions data, return {{"confidence": 0.0}}."""


def parse_extraction_response(raw: str) -> dict:
    """Parse Claude's response, extracting JSON from markdown code blocks if needed."""
    # Try to find JSON in code block
    code_match = re.search(r"```(?:json)?\s*\n(.*?)\n```", raw, re.DOTALL)
    if code_match:
        raw = code_match.group(1)

    # Try direct JSON parse
    try:
        return json.loads(raw.strip())
    except json.JSONDecodeError:
        pass

    # Try to find first { ... } block
    brace_match = re.search(r"\{.*\}", raw, re.DOTALL)
    if brace_match:
        try:
            return json.loads(brace_match.group())
        except json.JSONDecodeError:
            pass

    return {}


def extract_school(school_id: str, school_name: str) -> dict:
    """Extract structured data for a single school from its cached pages."""
    school_dir = RAW_HTML_DIR / school_id
    if not school_dir.exists():
        return {"id": school_id, "name": school_name, "data_quality": {"confidence": 0.0}}

    # Combine all crawled page texts
    combined_text = ""
    source_urls = []
    for txt_file in sorted(school_dir.glob("*.txt")):
        page_text = txt_file.read_text(encoding="utf-8", errors="ignore")
        combined_text += f"\n\n=== {txt_file.stem.upper()} PAGE ===\n\n{page_text}"

        # Get URL from meta
        meta_file = school_dir / "meta.json"
        if meta_file.exists():
            meta = json.loads(meta_file.read_text())
            if txt_file.stem in meta:
                source_urls.append(meta[txt_file.stem].get("url", ""))

    if not combined_text.strip():
        return {"id": school_id, "name": school_name, "data_quality": {"confidence": 0.0}}

    # Call Claude for extraction
    prompt = build_extraction_prompt(school_name, combined_text)

    try:
        response = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=EXTRACT_MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_text = response.content[0].text
        extracted = parse_extraction_response(raw_text)
    except Exception as e:
        print(f"    ❌ Claude API error for {school_id}: {e}")
        extracted = {}

    # Build final school record
    result = {
        "id": school_id,
        "name": school_name,
        "data_quality": {
            "last_scraped": __import__("datetime").date.today().isoformat(),
            "source_urls": source_urls,
            "verified_fields": [k for k, v in extracted.items() if v is not None and k != "confidence"],
            "estimated_fields": [],
            "confidence": extracted.get("confidence", 0.0),
        },
        **{k: v for k, v in extracted.items() if k != "confidence"},
    }

    return result


def extract_all(schools: list[dict], resume: bool = True) -> dict:
    """Extract structured data for all schools.
    Returns dict of {school_id: extracted_data}.
    """
    # Load existing scraped data for resume support
    existing = load_json(SCRAPED_DB_FILE) if resume else {}

    results = dict(existing)
    to_extract = []

    for school in schools:
        sid = school["id"]
        if resume and sid in existing and existing[sid].get("data_quality", {}).get("confidence", 0) > 0:
            continue
        school_dir = RAW_HTML_DIR / sid
        if school_dir.exists() and any(school_dir.glob("*.txt")):
            to_extract.append(school)

    print(f"  {len(to_extract)} schools to extract ({len(existing)} already done)")

    for i, school in enumerate(to_extract):
        sid = school["id"]
        name = school.get("name", sid)
        print(f"  [{i+1}/{len(to_extract)}] Extracting {name}...")

        data = extract_school(sid, name)
        results[sid] = data

        # Save incrementally every 10 schools
        if (i + 1) % 10 == 0:
            save_json(results, SCRAPED_DB_FILE)

    save_json(results, SCRAPED_DB_FILE)
    return results
```

**Step 4: Run tests**

```bash
cd backend && python -m pytest scraper/test_extract.py -v
```

Expected: All PASS (tests only test prompt building and parsing, no API calls).

**Step 5: Commit**

```bash
git add backend/scraper/extract.py backend/scraper/test_extract.py
git commit -m "feat: add Claude extraction pipeline with structured prompts"
```

---

## Task 4: Merge Logic + Website URL Resolution

**Files:**
- Create: `backend/scraper/merge.py`
- Create: `backend/scraper/resolve_urls.py`
- Test: `backend/scraper/test_merge.py`

**Step 1: Write failing test**

Create `backend/scraper/test_merge.py`:
```python
"""Tests for merge logic."""
from backend.scraper.merge import merge_school_data


def test_merge_overwrites_with_scraped():
    existing = {
        "hbs": {
            "name": "Harvard Business School",
            "gmat_avg": 730,
            "essay_prompts": ["generic prompt"],
            "placement_stats": {"top_recruiters": ["Flipkart"]},
        }
    }
    scraped = {
        "hbs": {
            "name": "Harvard Business School",
            "essay_prompts": ["Real HBS prompt here"],
            "tuition_usd": 74910,
            "data_quality": {"confidence": 0.9, "verified_fields": ["essay_prompts", "tuition_usd"]},
        }
    }
    merged = merge_school_data(existing, scraped)
    # Scraped data overwrites existing
    assert merged["hbs"]["essay_prompts"] == ["Real HBS prompt here"]
    assert merged["hbs"]["tuition_usd"] == 74910
    # Existing data preserved when not in scraped
    assert merged["hbs"]["gmat_avg"] == 730
    # data_quality added
    assert merged["hbs"]["data_quality"]["confidence"] == 0.9


def test_merge_adds_new_schools():
    existing = {"hbs": {"name": "HBS"}}
    scraped = {"new_school": {"name": "New School", "tuition_usd": 50000}}
    merged = merge_school_data(existing, scraped)
    assert "new_school" in merged
    assert "hbs" in merged


def test_merge_skips_null_scraped_fields():
    existing = {"hbs": {"name": "HBS", "gmat_avg": 730}}
    scraped = {"hbs": {"name": "HBS", "gmat_avg": None, "tuition_usd": 74000}}
    merged = merge_school_data(existing, scraped)
    # null scraped value should NOT overwrite existing
    assert merged["hbs"]["gmat_avg"] == 730
    assert merged["hbs"]["tuition_usd"] == 74000
```

**Step 2: Implement `backend/scraper/merge.py`**

```python
"""Stage 4: Merge scraped data into existing school_db_full.json."""
from pathlib import Path
from backend.scraper.config import EXISTING_DB_FILE, SCRAPED_DB_FILE
from backend.scraper.utils import load_json, save_json


def merge_school_data(existing: dict, scraped: dict) -> dict:
    """Merge scraped school data into existing database.

    Rules:
    - Scraped non-null values overwrite existing values
    - Existing values preserved when scraped value is null
    - New schools from scraping are added
    - data_quality metadata is always from scraped
    """
    merged = dict(existing)  # Start with all existing schools

    for school_id, scraped_data in scraped.items():
        if school_id in merged:
            # Merge: scraped overwrites existing, but nulls don't overwrite
            for key, value in scraped_data.items():
                if value is not None:
                    merged[school_id][key] = value
        else:
            # New school — add entirely
            merged[school_id] = scraped_data

    return merged


def run_merge(output_path: Path | None = None) -> dict:
    """Load existing + scraped, merge, save result."""
    existing = load_json(EXISTING_DB_FILE)
    scraped = load_json(SCRAPED_DB_FILE)

    if not scraped:
        print("  ⚠️ No scraped data found. Run extract first.")
        return existing

    print(f"  Existing: {len(existing)} schools")
    print(f"  Scraped: {len(scraped)} schools")

    merged = merge_school_data(existing, scraped)

    # Stats
    new_count = len(set(scraped.keys()) - set(existing.keys()))
    updated_count = len(set(scraped.keys()) & set(existing.keys()))
    print(f"  Updated: {updated_count}, New: {new_count}, Total: {len(merged)}")

    out = output_path or EXISTING_DB_FILE
    save_json(merged, out)
    return merged
```

**Step 3: Implement `backend/scraper/resolve_urls.py`**

This module adds website URLs to discovered schools that don't have them.

```python
"""Resolve MBA program website URLs for discovered schools."""
import asyncio
from playwright.async_api import async_playwright
from backend.scraper.config import USER_AGENT, CRAWL_TIMEOUT_MS


async def resolve_website_url(school_name: str, location: str = "") -> str | None:
    """Google the school's MBA page and return the first result URL."""
    query = f"{school_name} MBA admissions official site"
    if location:
        query += f" {location}"

    search_url = f"https://www.google.com/search?q={query.replace(' ', '+')}"

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(user_agent=USER_AGENT)
        try:
            await page.goto(search_url, timeout=CRAWL_TIMEOUT_MS)
            await page.wait_for_timeout(2000)

            # Get first organic result link
            links = await page.query_selector_all("a[href*='http']")
            for link in links:
                href = await link.get_attribute("href") or ""
                # Skip Google's own links
                if "google.com" in href or "youtube.com" in href:
                    continue
                # Look for .edu or known business school domains
                if any(tld in href for tld in [".edu", ".ac.", ".org", "business", "mba", "school"]):
                    return href.split("&")[0]  # Strip tracking params

            # Fallback: first non-Google link
            for link in links:
                href = await link.get_attribute("href") or ""
                if "google.com" not in href and href.startswith("http"):
                    return href.split("&")[0]

        except Exception:
            pass
        finally:
            await browser.close()

    return None


async def resolve_missing_urls(schools: list[dict], max_resolve: int = 50) -> list[dict]:
    """Add website URLs to schools that don't have them."""
    missing = [s for s in schools if not s.get("website")]
    print(f"  {len(missing)} schools missing website URLs (resolving up to {max_resolve})")

    for i, school in enumerate(missing[:max_resolve]):
        name = school.get("name", "")
        location = school.get("location", "")
        print(f"  [{i+1}/{min(len(missing), max_resolve)}] Resolving {name}...")
        url = await resolve_website_url(name, location)
        if url:
            school["website"] = url
            print(f"    → {url}")
        else:
            print(f"    → not found")
        await asyncio.sleep(1)  # Rate limit

    resolved = len([s for s in missing[:max_resolve] if s.get("website")])
    print(f"  Resolved {resolved}/{min(len(missing), max_resolve)} URLs")
    return schools
```

**Step 4: Run tests**

```bash
cd backend && python -m pytest scraper/test_merge.py -v
```

Expected: All PASS.

**Step 5: Commit**

```bash
git add backend/scraper/merge.py backend/scraper/resolve_urls.py backend/scraper/test_merge.py
git commit -m "feat: add merge logic and URL resolver for school data pipeline"
```

---

## Task 5: CLI Orchestrator

**Files:**
- Create: `backend/scraper/run.py`

**Step 1: Implement `backend/scraper/run.py`**

```python
"""CLI orchestrator for the MBA scraper pipeline."""
import asyncio
import argparse
import sys
import os

# Ensure backend is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.scraper.config import DISCOVERY_LIST_FILE, SCRAPED_DB_FILE, EXISTING_DB_FILE
from backend.scraper.discover import discover_all, load_existing_schools
from backend.scraper.crawl import crawl_all
from backend.scraper.extract import extract_all
from backend.scraper.merge import run_merge
from backend.scraper.resolve_urls import resolve_missing_urls
from backend.scraper.utils import load_json, save_json


def cmd_discover(args):
    """Stage 1: Discover schools from ranking sites."""
    print("=" * 60)
    print("🔍 Stage 1: DISCOVER — Scraping ranking sites")
    print("=" * 60)

    schools = asyncio.run(discover_all(use_cache=not args.fresh))

    # Merge with existing DB schools
    existing = load_existing_schools()
    print(f"\n  Merging {len(existing)} existing schools into discovery list...")

    from backend.scraper.utils import deduplicate_schools
    all_schools = schools + existing
    deduped = deduplicate_schools(all_schools)
    save_json(deduped, DISCOVERY_LIST_FILE)

    print(f"\n✅ Discovery complete: {len(deduped)} unique programs")
    return deduped


def cmd_resolve(args):
    """Resolve missing website URLs."""
    print("=" * 60)
    print("🌐 RESOLVE — Finding website URLs")
    print("=" * 60)

    schools = load_json(DISCOVERY_LIST_FILE)
    if not schools:
        print("  ❌ No discovery list found. Run 'discover' first.")
        return

    schools = asyncio.run(resolve_missing_urls(schools, max_resolve=args.limit))
    save_json(schools, DISCOVERY_LIST_FILE)
    print(f"\n✅ URL resolution complete")


def cmd_crawl(args):
    """Stage 2: Crawl each school's pages."""
    print("=" * 60)
    print("🕷️ Stage 2: CRAWL — Scraping school websites")
    print("=" * 60)

    schools = load_json(DISCOVERY_LIST_FILE)
    if not schools:
        print("  ❌ No discovery list found. Run 'discover' first.")
        return

    # Filter to specific schools if requested
    if args.schools:
        ids = set(args.schools.split(","))
        schools = [s for s in schools if s.get("id") in ids]
        print(f"  Filtering to {len(schools)} schools: {args.schools}")

    results = asyncio.run(crawl_all(schools, resume=not args.fresh))
    print(f"\n✅ Crawl complete: {len(results)} schools crawled")


def cmd_extract(args):
    """Stage 3: Extract structured data using Claude."""
    print("=" * 60)
    print("🧠 Stage 3: EXTRACT — Claude AI extraction")
    print("=" * 60)

    schools = load_json(DISCOVERY_LIST_FILE)
    if not schools:
        print("  ❌ No discovery list found. Run 'discover' first.")
        return

    if args.schools:
        ids = set(args.schools.split(","))
        schools = [s for s in schools if s.get("id") in ids]

    results = extract_all(schools, resume=not args.fresh)
    print(f"\n✅ Extraction complete: {len(results)} schools extracted")


def cmd_merge(args):
    """Stage 4: Merge scraped data into school_db_full.json."""
    print("=" * 60)
    print("🔗 Stage 4: MERGE — Combining data sources")
    print("=" * 60)

    merged = run_merge()
    print(f"\n✅ Merge complete: {len(merged)} total schools")


def cmd_all(args):
    """Run full pipeline."""
    print("🚀 FULL PIPELINE — Discover → Resolve → Crawl → Extract → Merge")
    print("=" * 60)
    cmd_discover(args)
    cmd_resolve(args)
    cmd_crawl(args)
    cmd_extract(args)
    cmd_merge(args)
    print("\n" + "=" * 60)
    print("🎉 PIPELINE COMPLETE")
    print("=" * 60)


def cmd_stats(args):
    """Show pipeline statistics."""
    from backend.scraper.config import RAW_HTML_DIR

    discovery = load_json(DISCOVERY_LIST_FILE)
    scraped = load_json(SCRAPED_DB_FILE)
    existing = load_json(EXISTING_DB_FILE)

    crawled_dirs = list(RAW_HTML_DIR.iterdir()) if RAW_HTML_DIR.exists() else []

    print(f"Discovered schools: {len(discovery) if isinstance(discovery, list) else 0}")
    print(f"Crawled schools:    {len(crawled_dirs)}")
    print(f"Extracted schools:  {len(scraped)}")
    print(f"Final DB schools:   {len(existing)}")

    if scraped:
        confidences = [v.get("data_quality", {}).get("confidence", 0) for v in scraped.values()]
        high = len([c for c in confidences if c >= 0.7])
        med = len([c for c in confidences if 0.3 <= c < 0.7])
        low = len([c for c in confidences if c < 0.3])
        print(f"\nExtraction quality: {high} high / {med} medium / {low} low confidence")


def main():
    parser = argparse.ArgumentParser(description="MBA Scraper Pipeline")
    sub = parser.add_subparsers(dest="command", required=True)

    # discover
    p = sub.add_parser("discover", help="Stage 1: Discover schools from ranking sites")
    p.add_argument("--fresh", action="store_true", help="Ignore cache, re-scrape everything")
    p.set_defaults(func=cmd_discover)

    # resolve
    p = sub.add_parser("resolve", help="Resolve missing website URLs")
    p.add_argument("--limit", type=int, default=50, help="Max URLs to resolve")
    p.set_defaults(func=cmd_resolve)

    # crawl
    p = sub.add_parser("crawl", help="Stage 2: Crawl school websites")
    p.add_argument("--schools", help="Comma-separated school IDs to crawl")
    p.add_argument("--fresh", action="store_true", help="Re-crawl even if cached")
    p.set_defaults(func=cmd_crawl)

    # extract
    p = sub.add_parser("extract", help="Stage 3: Extract with Claude")
    p.add_argument("--schools", help="Comma-separated school IDs to extract")
    p.add_argument("--fresh", action="store_true", help="Re-extract even if cached")
    p.set_defaults(func=cmd_extract)

    # merge
    p = sub.add_parser("merge", help="Stage 4: Merge scraped data into DB")
    p.set_defaults(func=cmd_merge)

    # all
    p = sub.add_parser("all", help="Run full pipeline")
    p.add_argument("--fresh", action="store_true")
    p.add_argument("--schools", default=None)
    p.add_argument("--limit", type=int, default=50)
    p.set_defaults(func=cmd_all)

    # stats
    p = sub.add_parser("stats", help="Show pipeline statistics")
    p.set_defaults(func=cmd_stats)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
```

**Step 2: Test CLI works**

```bash
cd backend && python -m scraper.run stats
```

Expected: Shows current counts (0 discovered, 0 crawled, etc.).

**Step 3: Commit**

```bash
git add backend/scraper/run.py
git commit -m "feat: add CLI orchestrator for scraper pipeline"
```

---

## Task 6: Smoke Test — Run Pipeline on 5 Schools

**Step 1: Test discovery**

```bash
cd backend && python -m scraper.run discover
```

Expected: Discovers schools from ranking sites + seed list, saves to `data/discovery_list.json`.

**Step 2: Test crawl on 5 known schools**

```bash
cd backend && python -m scraper.run crawl --schools hbs,gsb,wharton,insead,iima
```

Expected: Crawls pages for each school, saves HTML+text to `data/raw_html/{id}/`.

**Step 3: Test extraction on 5 schools**

```bash
cd backend && python -m scraper.run extract --schools hbs,gsb,wharton,insead,iima
```

Expected: Claude extracts structured data, saves to `data/school_db_scraped.json`.

**Step 4: Test merge**

```bash
cd backend && python -m scraper.run merge
```

Expected: Merges scraped data into `school_db_full.json`, real data replaces generated data.

**Step 5: Validate output**

```bash
python3 -c "
import json
with open('data/school_db_full.json') as f:
    db = json.load(f)
hbs = db.get('hbs', {})
print('HBS essay prompts:', hbs.get('essay_prompts', [])[:1])
print('HBS deadlines:', hbs.get('admission_deadlines', [])[:1])
print('HBS data quality:', hbs.get('data_quality', {}))
print('Top recruiters:', hbs.get('placement_stats', {}).get('top_recruiters', [])[:5])
"
```

Expected: Real data (not "Flipkart" in HBS recruiters).

**Step 6: Commit**

```bash
git add backend/data/discovery_list.json backend/data/school_db_scraped.json
git commit -m "feat: validated scraper pipeline with 5-school smoke test"
```

---

## Task 7: Full Pipeline Run

**Step 1: Run full pipeline**

```bash
cd backend && python -m scraper.run all --limit 100
```

This will:
1. Discover ~600+ schools from rankings + seed list
2. Resolve up to 100 missing website URLs
3. Crawl all schools with websites
4. Extract structured data via Claude
5. Merge everything into school_db_full.json

Expected runtime: 2-3 hours. Expected cost: ~$20-40 in Claude API.

**Step 2: Check stats**

```bash
cd backend && python -m scraper.run stats
```

**Step 3: Final commit**

```bash
git add backend/data/
git commit -m "feat: full scraper pipeline run — enriched MBA database"
```
