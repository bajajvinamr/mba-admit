"""Discovery module — build the master list of MBA programs to scrape.

Combines:
1. Web-scraped rankings (FT, QS, US News, Poets&Quants) via Playwright
2. Hardcoded seed list of ~30+ schools underrepresented in US-centric rankings
3. Existing school_db_full.json entries (filtering out synthetic hex-hash IDs)

All sources are deduplicated and merged into data/discovery_list.json.
"""
import asyncio
import re
import logging
from pathlib import Path

from playwright.async_api import async_playwright, Page, TimeoutError as PlaywrightTimeout

from scraper.config import (
    RANKING_SOURCES,
    DISCOVERY_LIST_FILE,
    EXISTING_DB_FILE,
    CRAWL_TIMEOUT_MS,
    USER_AGENT,
)
from scraper.utils import (
    normalize_school_name,
    deduplicate_schools,
    slugify,
    save_json,
    load_json,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Seed schools: programs that may not appear in US-centric ranking pages
# ---------------------------------------------------------------------------
SEED_SCHOOLS: list[dict] = [
    # --- India: IIMs ---
    {"name": "IIM Ahmedabad", "location": "Ahmedabad, Gujarat", "country": "India", "website": "https://www.iima.ac.in"},
    {"name": "IIM Bangalore", "location": "Bangalore, Karnataka", "country": "India", "website": "https://www.iimb.ac.in"},
    {"name": "IIM Calcutta", "location": "Kolkata, West Bengal", "country": "India", "website": "https://www.iimcal.ac.in"},
    {"name": "IIM Lucknow", "location": "Lucknow, Uttar Pradesh", "country": "India", "website": "https://www.iiml.ac.in"},
    {"name": "IIM Indore", "location": "Indore, Madhya Pradesh", "country": "India", "website": "https://www.iimidr.ac.in"},
    {"name": "IIM Kozhikode", "location": "Kozhikode, Kerala", "country": "India", "website": "https://www.iimk.ac.in"},
    {"name": "IIM Shillong", "location": "Shillong, Meghalaya", "country": "India", "website": "https://www.iimshillong.ac.in"},
    {"name": "IIM Trichy", "location": "Tiruchirappalli, Tamil Nadu", "country": "India", "website": "https://www.iimtrichy.ac.in"},
    {"name": "IIM Udaipur", "location": "Udaipur, Rajasthan", "country": "India", "website": "https://www.iimu.ac.in"},
    {"name": "IIM Ranchi", "location": "Ranchi, Jharkhand", "country": "India", "website": "https://www.iimranchi.ac.in"},
    {"name": "IIM Raipur", "location": "Raipur, Chhattisgarh", "country": "India", "website": "https://www.iimraipur.ac.in"},
    {"name": "IIM Kashipur", "location": "Kashipur, Uttarakhand", "country": "India", "website": "https://www.iimkashipur.ac.in"},
    {"name": "IIM Rohtak", "location": "Rohtak, Haryana", "country": "India", "website": "https://www.iimrohtak.ac.in"},
    # --- India: other top programs ---
    {"name": "Indian School of Business", "location": "Hyderabad, Telangana", "country": "India", "website": "https://www.isb.edu"},
    {"name": "XLRI Jamshedpur", "location": "Jamshedpur, Jharkhand", "country": "India", "website": "https://www.xlri.ac.in"},
    {"name": "SP Jain Institute of Management and Research", "location": "Mumbai, Maharashtra", "country": "India", "website": "https://www.spjimr.org"},
    {"name": "Management Development Institute", "location": "Gurugram, Haryana", "country": "India", "website": "https://www.mdi.ac.in"},
    {"name": "Faculty of Management Studies, Delhi", "location": "New Delhi, Delhi", "country": "India", "website": "https://fms.edu"},
    {"name": "Indian Institute of Foreign Trade", "location": "New Delhi, Delhi", "country": "India", "website": "https://www.iift.ac.in"},
    {"name": "NITIE Mumbai", "location": "Mumbai, Maharashtra", "country": "India", "website": "https://www.nitie.ac.in"},
    {"name": "Great Lakes Institute of Management", "location": "Chennai, Tamil Nadu", "country": "India", "website": "https://www.greatlakes.edu.in"},
    {"name": "NMIMS School of Business Management", "location": "Mumbai, Maharashtra", "country": "India", "website": "https://www.nmims.edu"},
    # --- Asia-Pacific ---
    {"name": "CEIBS", "location": "Shanghai", "country": "China", "website": "https://www.ceibs.edu"},
    {"name": "HKUST Business School", "location": "Hong Kong", "country": "Hong Kong", "website": "https://www.bm.ust.hk"},
    {"name": "NUS Business School", "location": "Singapore", "country": "Singapore", "website": "https://bschool.nus.edu.sg"},
    {"name": "Melbourne Business School", "location": "Melbourne, Victoria", "country": "Australia", "website": "https://mbs.edu"},
    # --- Canada ---
    {"name": "Schulich School of Business", "location": "Toronto, Ontario", "country": "Canada", "website": "https://schulich.yorku.ca"},
    {"name": "Rotman School of Management", "location": "Toronto, Ontario", "country": "Canada", "website": "https://www.rotman.utoronto.ca"},
    {"name": "Ivey Business School", "location": "London, Ontario", "country": "Canada", "website": "https://www.ivey.uwo.ca"},
    {"name": "Desautels Faculty of Management", "location": "Montreal, Quebec", "country": "Canada", "website": "https://www.mcgill.ca/desautels"},
    {"name": "Sauder School of Business", "location": "Vancouver, BC", "country": "Canada", "website": "https://www.sauder.ubc.ca"},
    # --- Latin America ---
    {"name": "EGADE Business School", "location": "Monterrey, Nuevo Leon", "country": "Mexico", "website": "https://egade.tec.mx"},
    {"name": "FGV EAESP", "location": "Sao Paulo", "country": "Brazil", "website": "https://eaesp.fgv.br"},
    # --- Africa ---
    {"name": "African Leadership University School of Business", "location": "Kigali", "country": "Rwanda", "website": "https://www.alueducation.com"},
    {"name": "Lagos Business School", "location": "Lagos", "country": "Nigeria", "website": "https://www.lbs.edu.ng"},
]


# ---------------------------------------------------------------------------
# Generic text extraction helpers
# ---------------------------------------------------------------------------

# Keywords that signal a line contains a business-school name
_SCHOOL_KEYWORDS = re.compile(
    r"(business\s+school|school\s+of\s+business|mba|management|graduate\s+school"
    r"|gsb|som|sloan|wharton|booth|kellogg|stern|haas|tuck|fuqua|darden|ross"
    r"|insead|lbs|iese|hec|said|judge|iim|isb|ceibs|rotman|ivey|schulich)",
    re.IGNORECASE,
)

# Rank number preceding or following a school name
_RANK_PATTERN = re.compile(r"(?:^|\s)(\d{1,3})(?:\s|\.|\))")


def _extract_schools_from_text(text: str, source: str) -> list[dict]:
    """Extract school-like entries from raw page text.

    Strategy: split text by newlines, find lines containing business-school
    keywords, then look for a nearby rank number.  This is intentionally
    generic so it survives layout changes on ranking sites.
    """
    lines = text.split("\n")
    results = []
    seen_names: set[str] = set()

    for idx, line in enumerate(lines):
        line = line.strip()
        if not line or len(line) < 5 or len(line) > 200:
            continue
        if not _SCHOOL_KEYWORDS.search(line):
            continue

        # Try to pull a rank from this line or the line above
        rank = None
        rank_match = _RANK_PATTERN.search(line)
        if rank_match:
            rank = int(rank_match.group(1))
        elif idx > 0:
            prev_match = _RANK_PATTERN.search(lines[idx - 1].strip())
            if prev_match:
                rank = int(prev_match.group(1))

        # Clean up the name: remove leading rank digits, punctuation
        name = re.sub(r"^\d{1,3}[\.\)\s]+", "", line).strip()
        name = re.sub(r"\s{2,}", " ", name)

        # Skip if too short / already seen
        norm = normalize_school_name(name)
        if len(norm) < 4 or norm in seen_names:
            continue
        seen_names.add(norm)

        entry: dict = {"name": name, "source": source}
        rank_key = {
            "ft_global": "ft_rank",
            "qs_global": "qs_rank",
            "us_news": "usn_rank",
            "poets_quants": "pq_rank",
        }.get(source)
        if rank is not None and rank_key:
            entry[rank_key] = rank

        results.append(entry)

    return results


# ---------------------------------------------------------------------------
# Playwright-based scraper helpers
# ---------------------------------------------------------------------------

async def _click_load_more(page: Page, max_clicks: int = 5) -> None:
    """Try to expand the page by clicking 'Load More' / 'Show More' / 'Next'."""
    selectors = [
        "button:has-text('Load More')",
        "button:has-text('Show More')",
        "a:has-text('Load More')",
        "a:has-text('Show More')",
        "button:has-text('Next')",
        "a:has-text('Next')",
        "[class*='load-more']",
        "[class*='show-more']",
    ]
    for _ in range(max_clicks):
        clicked = False
        for sel in selectors:
            try:
                elem = page.locator(sel).first
                if await elem.is_visible(timeout=2000):
                    await elem.click()
                    await page.wait_for_timeout(1500)
                    clicked = True
                    break
            except (PlaywrightTimeout, Exception):
                continue
        if not clicked:
            break


async def _scrape_ranking_page(page: Page, url: str, source: str) -> list[dict]:
    """Navigate to a ranking URL, expand it, and extract schools from text."""
    try:
        await page.goto(url, timeout=CRAWL_TIMEOUT_MS, wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)  # let JS render
    except PlaywrightTimeout:
        logger.warning(f"Timeout loading {url}")
        return []
    except Exception as exc:
        logger.warning(f"Error loading {url}: {exc}")
        return []

    # Try to expand the full list
    await _click_load_more(page)

    # Get all visible text
    try:
        body_text = await page.inner_text("body", timeout=10_000)
    except Exception:
        body_text = ""

    schools = _extract_schools_from_text(body_text, source)
    logger.info(f"  {source}: extracted {len(schools)} schools from {url}")
    return schools


# ---------------------------------------------------------------------------
# Individual ranking scrapers (thin wrappers around _scrape_ranking_page)
# ---------------------------------------------------------------------------

async def scrape_us_news(page: Page) -> list[dict]:
    """Scrape US News MBA rankings."""
    return await _scrape_ranking_page(
        page, RANKING_SOURCES["us_news"], "us_news"
    )


async def scrape_ft_global(page: Page) -> list[dict]:
    """Scrape Financial Times Global MBA ranking."""
    return await _scrape_ranking_page(
        page, RANKING_SOURCES["ft_global"], "ft_global"
    )


async def scrape_qs_global(page: Page) -> list[dict]:
    """Scrape QS Global MBA ranking."""
    return await _scrape_ranking_page(
        page, RANKING_SOURCES["qs_global"], "qs_global"
    )


async def scrape_poets_quants(page: Page) -> list[dict]:
    """Scrape Poets&Quants MBA ranking."""
    return await _scrape_ranking_page(
        page, RANKING_SOURCES["poets_quants"], "poets_quants"
    )


# ---------------------------------------------------------------------------
# Existing-DB loader
# ---------------------------------------------------------------------------

def load_existing_schools(path: Path | None = None) -> list[dict]:
    """Load schools from the existing school_db_full.json.

    Skips synthetic entries whose IDs are hex-hash strings (10-12 hex chars)
    or longer than 20 characters.
    """
    path = path or EXISTING_DB_FILE
    db = load_json(path)
    if not isinstance(db, dict):
        return []

    _HEX_HASH = re.compile(r"^[0-9a-f]{10,12}$")
    schools = []
    for school_id, school_data in db.items():
        if len(school_id) > 20:
            continue
        if _HEX_HASH.match(school_id):
            continue
        entry = {
            "id": school_id,
            "name": school_data.get("name", school_id),
            "location": school_data.get("location", ""),
            "country": school_data.get("country", ""),
            "source": "existing_db",
        }
        if school_data.get("website"):
            entry["website"] = school_data["website"]
        schools.append(entry)

    logger.info(f"Loaded {len(schools)} existing schools (filtered from {len(db)})")
    return schools


# ---------------------------------------------------------------------------
# Main discovery orchestrator
# ---------------------------------------------------------------------------

async def discover_all(
    scrape_rankings: bool = True,
    include_seeds: bool = True,
    include_existing: bool = True,
) -> list[dict]:
    """Build the master discovery list of MBA programs.

    Args:
        scrape_rankings: If True, launch Playwright and scrape ranking sites.
        include_seeds: If True, add the hardcoded SEED_SCHOOLS list.
        include_existing: If True, merge in entries from school_db_full.json.

    Returns:
        Deduplicated list of school dicts, each with at least {name, id}.
    """
    all_schools: list[dict] = []

    # 1. Scrape ranking sites
    if scrape_rankings:
        logger.info("Scraping ranking sites...")
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True)
            context = await browser.new_context(user_agent=USER_AGENT)
            page = await context.new_page()

            scrapers = [
                scrape_us_news,
                scrape_ft_global,
                scrape_qs_global,
                scrape_poets_quants,
            ]
            for scraper_fn in scrapers:
                try:
                    schools = await scraper_fn(page)
                    all_schools.extend(schools)
                except Exception as exc:
                    logger.error(f"Error in {scraper_fn.__name__}: {exc}")

            await browser.close()

    # 2. Add seed schools
    if include_seeds:
        for seed in SEED_SCHOOLS:
            all_schools.append({**seed, "source": "seed"})

    # 3. Add existing DB schools
    if include_existing:
        existing = load_existing_schools()
        all_schools.extend(existing)

    # 4. Deduplicate
    logger.info(f"Total pre-dedup: {len(all_schools)}")
    unique = deduplicate_schools(all_schools)
    logger.info(f"After dedup: {len(unique)}")

    # 5. Assign IDs
    for school in unique:
        if "id" not in school:
            school["id"] = slugify(school["name"])

    # 6. Fill in missing URLs from hardcoded mapping
    from scraper.school_urls import match_school_url
    filled = 0
    for school in unique:
        if not school.get("website"):
            url = match_school_url(school["name"])
            if url:
                school["website"] = url
                filled += 1
    logger.info(f"Filled {filled} URLs from hardcoded mapping")

    # 7. Save
    save_json(unique, DISCOVERY_LIST_FILE)
    return unique


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main():
    """Run discovery from the command line."""
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    schools = asyncio.run(discover_all())
    print(f"\nDiscovery complete: {len(schools)} unique MBA programs")


if __name__ == "__main__":
    main()
