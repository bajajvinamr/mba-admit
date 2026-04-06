"""GMAT Club Decision Tracker scraper.

Scrapes decision tracker data from gmatclub.com using Playwright
(non-headless, to bypass Cloudflare). Data is server-rendered HTML tables.

Usage:
    python -m scraper.gmatclub [--schools harvard,wharton] [--max-pages 50] [--fresh]
"""

import asyncio
import json
import logging
import re
import time
from pathlib import Path
from datetime import datetime

from playwright.async_api import async_playwright

logger = logging.getLogger("scraper.gmatclub")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
OUTPUT_FILE = DATA_DIR / "gmatclub_decisions.json"

# School slug → forum_id mapping for per-school tracker pages.
# URL pattern: https://gmatclub.com/forum/{slug}-{forum_id}/decision-tracker.html
# Discovered via GMAT Club business school discussions + decision tracker dropdown.
SCHOOL_FORUMS: dict[str, int] = {
    # M7
    "harvard": 184,
    "stanford-gsb": 186,
    "wharton": 188,
    "booth": 189,
    "kellogg": 191,
    "sloan": 185,
    "columbia": 190,
    # T15
    "tuck": 194,
    "haas": 195,
    "ross": 196,
    "fuqua": 193,
    "darden": 197,
    "stern": 199,
    "yale": 200,
    "johnson": 198,
    # T25
    "kenan-flagler": 206,
    "ucla-anderson": 187,
    "kelley": 212,
    "goizueta": 210,
    "tepper": 205,
    "mcdonough": 207,
    "marshall": 208,
    "jones-rice-university": 214,
    "owen-vanderbilt": 216,
    # International
    "lbs": 202,
    "insead": 201,
    "isb": 204,
    "hec-paris": 221,
    "judge-cambridge": 217,
    "said": 211,
    "rotman-toronto": 218,
    "nus": 209,
    "ntu-mba": 230,
    "iim-ahmedabad": 453,
    "iim-bangalore": 454,
    "iim-calcutta": 455,
    "imd": 244,
    "imperial": 258,
    "esade": 235,
    "iese": 238,
    "ie-business-school": 241,
    "essec": 263,
    "sda-bocconi": 250,
    "ceibs": 246,
    "hec-montreal": 260,
    "rotterdam": 264,
    # Other US
    "mccombs": 203,
    "mendoza": 222,
    "fisher": 227,
    "foster": 231,
    "broad": 252,
    "questrom": 254,
    "carlson": 256,
    "olin": 272,
    "scheller": 268,
    "terry": 274,
    "babson": 224,
    "simon-rochester": 232,
    "ucr-business": 394,
    # Canada
    "ivey": 248,
    "desautels": 261,
    "sauder": 266,
    "schulich": 270,
    "smith-queens": 276,
}

# Maps GMAT Club school slugs to our school DB IDs
GMATCLUB_TO_SCHOOL_ID: dict[str, str] = {
    "harvard": "hbs",
    "stanford-gsb": "gsb",
    "wharton": "wharton",
    "booth": "chicago_booth",
    "kellogg": "kellogg",
    "sloan": "mit_sloan",
    "columbia": "columbia_business_school",
    "tuck": "dartmouth_tuck",
    "haas": "uc_berkeley_haas",
    "ross": "michigan_ross",
    "fuqua": "duke_fuqua",
    "darden": "uva_darden",
    "stern": "nyu_stern",
    "yale": "yale_som",
    "johnson": "cornell_johnson",
    "kenan-flagler": "unc_kenanflagler",
    "ucla-anderson": "ucla_anderson",
    "kelley": "indiana_kelley",
    "goizueta": "emory_goizueta",
    "tepper": "cmu_tepper",
    "mcdonough": "georgetown_mcdonough",
    "marshall": "usc_marshall",
    "jones-rice-university": "rice_jones",
    "owen-vanderbilt": "vanderbilt_owen",
    "lbs": "london_business_school",
    "insead": "insead",
    "isb": "isb",
    "hec-paris": "hec_paris",
    "judge-cambridge": "cambridge_judge",
    "said": "oxford_said",
    "rotman-toronto": "toronto_rotman",
    "nus": "nus_business",
    "ntu-mba": "ntu_business",
    "iim-ahmedabad": "iima",
    "iim-bangalore": "iimb",
    "iim-calcutta": "iimc",
    "imd": "imd",
    "imperial": "imperial_college",
    "esade": "esade",
    "iese": "iese",
    "ie-business-school": "ie_business",
    "essec": "essec",
    "sda-bocconi": "sda_bocconi",
    "ceibs": "ceibs",
    "hec-montreal": "hec_montreal",
    "rotterdam": "erasmus_rotterdam",
    "mccombs": "texas_mccombs",
    "mendoza": "notre_dame_mendoza",
    "fisher": "ohio_state_fisher",
    "foster": "washington_foster",
    "broad": "michigan_state_broad",
    "questrom": "bu_questrom",
    "carlson": "minnesota_carlson",
    "olin": "wustl_olin",
    "scheller": "gatech_scheller",
    "terry": "uga_terry",
    "babson": "babson_olin",
    "simon-rochester": "rochester_simon",
    "ucr-business": "ucr_business",
    "ivey": "ivey_western",
    "desautels": "mcgill_desautels",
    "sauder": "ubc_sauder",
    "schulich": "york_schulich",
    "smith-queens": "queens_smith",
}


async def _create_browser(pw):
    """Create a stealth browser context that bypasses Cloudflare."""
    browser = await pw.chromium.launch(
        headless=False,
        args=["--disable-blink-features=AutomationControlled"],
    )
    ctx = await browser.new_context(
        viewport={"width": 1920, "height": 1080},
        user_agent=(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/131.0.0.0 Safari/537.36"
        ),
    )
    await ctx.add_init_script(
        'Object.defineProperty(navigator, "webdriver", {get: () => undefined})'
    )
    return browser, ctx


def _parse_score(raw: str) -> dict:
    """Parse GMAT/GRE score string into structured data.

    Examples: '755 GMAT Focus', '720 GMAT Classic', '329 GRE', ''
    Some entries have multiple scores concatenated.
    """
    if not raw.strip():
        return {}

    # Take the last score (most recent) if multiple are concatenated
    parts = re.findall(r"(\d{3,4})\s*(GMAT Focus|GMAT Classic|GRE|GMAT)?", raw)
    if not parts:
        return {}

    score_str, test_type = parts[-1]  # take last
    score = int(score_str)

    if "Focus" in test_type:
        return {"gmat_focus": score}
    elif "Classic" in test_type or test_type == "GMAT":
        return {"gmat": score}
    elif "GRE" in test_type:
        return {"gre": score}
    else:
        # Guess based on range
        if score >= 260 and score <= 340:
            return {"gre": score}
        elif score >= 200 and score <= 800:
            return {"gmat": score}
    return {}


def _parse_date(raw: str) -> str:
    """Parse date from the noisy date cell.

    Input looks like: 'username\\n11 Mar 2026 10:43 AM'
    """
    # Find date pattern
    m = re.search(r"(\d{1,2})\s+(\w{3})\s+(\d{4})", raw.replace("\xa0", " "))
    if m:
        try:
            day, month_str, year = m.groups()
            dt = datetime.strptime(f"{day} {month_str} {year}", "%d %b %Y")
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            pass
    return ""


async def scrape_school_tracker(
    pw, slug: str, forum_id: int, max_pages: int = 200
) -> list[dict]:
    """Scrape all decision tracker entries for a single school.

    Creates a completely fresh browser for each page to bypass Cloudflare
    fingerprinting that blocks pagination within the same session.
    """
    base_url = f"https://gmatclub.com/forum/{slug}-{forum_id}/decision-tracker"
    entries = []
    consecutive_failures = 0

    for page_num in range(max_pages):
        offset = page_num * 20
        url = f"{base_url}.html" if offset == 0 else f"{base_url}-{offset}.html"

        browser, ctx = await _create_browser(pw)
        page = await ctx.new_page()
        try:
            resp = await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            if resp and resp.status != 200:
                consecutive_failures += 1
                logger.warning(f"  {slug} page {page_num+1}: HTTP {resp.status}")
                await browser.close()
                if consecutive_failures >= 3:
                    logger.warning(f"  {slug}: 3 consecutive failures, stopping")
                    break
                await asyncio.sleep(5)  # longer back off on failure
                continue
            consecutive_failures = 0

            await page.wait_for_timeout(2000)  # let table render

            # Extract rows from the decision tracker table
            result = await page.evaluate("""() => {
                const tables = document.querySelectorAll('table');
                let targetTable = null;
                for (const t of tables) {
                    const ths = t.querySelectorAll('th');
                    const h = Array.from(ths).map(th => th.textContent.trim()).join('|');
                    if (h.includes('Status') && h.includes('Round') && h.includes('GPA')) {
                        targetTable = t;
                        break;
                    }
                }
                if (!targetTable) return {rows: [], hasMore: false};

                const trs = targetTable.querySelectorAll('tbody tr');
                const rows = [];
                for (const tr of trs) {
                    const cells = tr.querySelectorAll('td');
                    if (cells.length >= 8) {
                        rows.push({
                            program: cells[0].textContent.trim(),
                            status: cells[1].textContent.trim(),
                            round: cells[2].textContent.trim(),
                            year: cells[3].textContent.trim(),
                            score_raw: cells[4].textContent.trim(),
                            gpa: cells[5].textContent.trim(),
                            yoe: cells[6].textContent.trim(),
                            industry: cells[7].textContent.trim(),
                            location: cells[8] ? cells[8].textContent.trim() : '',
                            date_raw: cells[9] ? cells[9].textContent.trim() : '',
                        });
                    }
                }

                // Check if there's a next page
                const allLinks = document.querySelectorAll('a[href]');
                let hasMore = false;
                const nextOffset = """ + str(offset + 20) + """;
                allLinks.forEach(a => {
                    if (a.href.includes('decision-tracker-' + nextOffset + '.html')) {
                        hasMore = true;
                    }
                });

                return {rows, hasMore};
            }""")

            if not result["rows"]:
                logger.info(f"  {slug} page {page_num+1}: no rows, stopping")
                await browser.close()
                break

            for row in result["rows"]:
                entry = {
                    "school_slug": slug,
                    "school_id": GMATCLUB_TO_SCHOOL_ID.get(slug, slug),
                    "program": row["program"],
                    "status": row["status"],
                    "round": row["round"],
                    "year": row["year"],
                    "gpa": float(row["gpa"]) if re.match(r"^\d+\.?\d*$", row["gpa"]) else None,
                    "yoe": int(row["yoe"]) if row["yoe"].isdigit() else None,
                    "industry": row["industry"] if row["industry"] else None,
                    "location": row["location"] if row["location"] else None,
                    "date": _parse_date(row["date_raw"]),
                }
                entry.update(_parse_score(row["score_raw"]))
                entries.append(entry)

            has_more = result["hasMore"]
            await browser.close()

            if page_num % 10 == 0 or not has_more:
                logger.info(f"  {slug} page {page_num+1}: {len(entries)} entries total")

            if not has_more:
                break

            # Rate limit: 2-4s between requests (fresh browser each time)
            await asyncio.sleep(2.5)

        except Exception as e:
            logger.error(f"  {slug} page {page_num+1}: {e}")
            try:
                await browser.close()
            except Exception:
                pass
            consecutive_failures += 1
            if consecutive_failures >= 3:
                break
            await asyncio.sleep(5)

    return entries


async def run(
    schools: list[str] | None = None,
    max_pages: int = 25,
    fresh: bool = False,
    min_entries: int = 500,
):
    """Run the GMAT Club scraper.

    Args:
        schools: Specific school slugs to scrape. None = all.
        max_pages: Max pages per school (25 pages = ~500 entries).
        fresh: Ignore existing data and start from scratch.
        min_entries: Skip schools that already have this many entries.
    """

    # Load existing data if not fresh
    existing = {}
    existing_by_school: dict[str, int] = {}
    if not fresh and OUTPUT_FILE.exists():
        with open(OUTPUT_FILE) as f:
            existing_list = json.load(f)
        for entry in existing_list:
            key = f"{entry.get('school_slug','')}_{entry.get('date','')}_{entry.get('status','')}_{entry.get('gpa','')}"
            existing[key] = entry
            slug = entry.get("school_slug", "")
            existing_by_school[slug] = existing_by_school.get(slug, 0) + 1
        logger.info(f"Loaded {len(existing)} existing entries")

    target_schools = schools or list(SCHOOL_FORUMS.keys())
    logger.info(f"Scraping {len(target_schools)} schools (max {max_pages} pages each, skip if >= {min_entries} entries)")

    async with async_playwright() as pw:
        all_entries = list(existing.values()) if existing else []

        for i, slug in enumerate(target_schools):
            forum_id = SCHOOL_FORUMS.get(slug)
            if not forum_id:
                logger.warning(f"Unknown school slug: {slug}")
                continue

            # Skip schools with enough data
            current_count = existing_by_school.get(slug, 0)
            if current_count >= min_entries and not fresh:
                logger.info(f"[{i+1}/{len(target_schools)}] Skipping {slug} — already has {current_count} entries")
                continue

            logger.info(f"[{i+1}/{len(target_schools)}] Scraping {slug} (forum_id={forum_id}, existing={current_count})")

            entries = await scrape_school_tracker(pw, slug, forum_id, max_pages)
            logger.info(f"  {slug}: {len(entries)} entries scraped")

            # Merge with existing (dedup by key)
            for entry in entries:
                key = f"{entry['school_slug']}_{entry.get('date','')}_{entry.get('status','')}_{entry.get('gpa','')}"
                existing[key] = entry

            # Save after each school
            all_entries = list(existing.values())
            OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(OUTPUT_FILE, "w") as f:
                json.dump(all_entries, f, indent=2, ensure_ascii=False, default=str)

            # Pause between schools
            if i < len(target_schools) - 1:
                await asyncio.sleep(3)

    logger.info(f"Done. {len(all_entries)} total entries saved to {OUTPUT_FILE}")

    # Print summary
    from collections import Counter
    school_counts = Counter(e["school_slug"] for e in all_entries)
    status_counts = Counter(e["status"] for e in all_entries)

    logger.info("Per-school counts:")
    for school, count in school_counts.most_common():
        logger.info(f"  {school}: {count}")

    logger.info("Per-status counts:")
    for status, count in status_counts.most_common():
        logger.info(f"  {status}: {count}")


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Scrape GMAT Club Decision Tracker")
    parser.add_argument("--schools", type=str, help="Comma-separated school slugs")
    parser.add_argument("--max-pages", type=int, default=25, help="Max pages per school (25 = ~500 entries)")
    parser.add_argument("--min-entries", type=int, default=500, help="Skip schools with >= this many entries")
    parser.add_argument("--fresh", action="store_true", help="Ignore existing data")
    args = parser.parse_args()

    schools = args.schools.split(",") if args.schools else None
    asyncio.run(run(schools=schools, max_pages=args.max_pages, fresh=args.fresh, min_entries=args.min_entries))


if __name__ == "__main__":
    main()
