"""Scrape real MBA essay examples from ARINGO (aringo.com).

ARINGO publishes 300-500 full example essays across 36 school pages + 6 topic pages.
No login required. Essays live in Bootstrap collapsed panels (div.panel-collapse)
but are present in raw HTML DOM.

Usage:
    python -m scraper.aringo_essays
"""

import asyncio
import hashlib
import json
import logging
import re
import time
from pathlib import Path

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger("scraper.aringo")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
OUTPUT_FILE = DATA_DIR / "aringo_essays.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

INDEX_URL = "https://aringo.com/mba-essay-examples/"

# School slug → our DB ID mapping
ARINGO_TO_DB_ID: dict[str, str] = {
    "harvard": "hbs", "stanford": "gsb", "wharton": "wharton",
    "booth": "chicago_booth", "kellogg": "kellogg", "mit": "mit_sloan",
    "sloan": "mit_sloan", "columbia": "columbia_business_school",
    "tuck": "dartmouth_tuck", "haas": "uc_berkeley_haas",
    "ross": "michigan_ross", "fuqua": "duke_fuqua", "darden": "uva_darden",
    "stern": "nyu_stern", "yale": "yale_som", "johnson": "cornell_johnson",
    "anderson": "ucla_anderson", "kelley": "indiana_kelley",
    "goizueta": "emory_goizueta", "tepper": "cmu_tepper",
    "mcdonough": "georgetown_mcdonough", "marshall": "usc_marshall",
    "kenan": "unc_kenanflagler", "owen": "vanderbilt_owen",
    "lbs": "london_business_school", "insead": "insead", "isb": "isb",
    "hec": "hec_paris", "iese": "iese", "esade": "esade",
    "cambridge": "cambridge_judge", "oxford": "oxford_said",
    "rotman": "toronto_rotman", "imd": "imd", "ceibs": "ceibs",
    "ie": "ie_business", "mendoza": "notre_dame_mendoza",
    "mccombs": "texas_mccombs",
}


def _identify_school(url: str, title: str) -> str | None:
    """Try to identify school from URL and page title."""
    text = f"{url} {title}".lower()
    for slug, db_id in ARINGO_TO_DB_ID.items():
        if slug in text:
            return db_id
    return None


def _identify_essay_type(title: str, prompt: str) -> str | None:
    """Categorize essay by type."""
    combined = f"{title} {prompt}".lower()
    if any(w in combined for w in ["goal", "career", "aspiration", "why mba"]):
        return "career_goals"
    if any(w in combined for w in ["leadership", "led", "team"]):
        return "leadership"
    if any(w in combined for w in ["failure", "setback", "challenge", "difficult"]):
        return "failure_challenge"
    if any(w in combined for w in ["community", "contribut", "impact"]):
        return "community_impact"
    if any(w in combined for w in ["matters most", "value", "important to you"]):
        return "personal_values"
    if any(w in combined for w in ["why", "fit", "why our"]):
        return "why_school"
    if any(w in combined for w in ["diversity", "background", "unique"]):
        return "diversity"
    if any(w in combined for w in ["ethic", "dilemma", "integrity"]):
        return "ethics"
    return "general"


async def discover_essay_pages() -> list[str]:
    """Find all essay example page URLs from the ARINGO index."""
    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=30) as client:
        resp = await client.get(INDEX_URL)
        resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    urls = set()

    for a in soup.find_all("a", href=True):
        href = a["href"]
        # Match essay example pages
        if "essay" in href.lower() and "aringo.com" in href:
            if "example" in href.lower() or "sample" in href.lower():
                urls.add(href.rstrip("/"))

    # Also add known topic pages
    topic_pages = [
        "https://aringo.com/free-mba-community-contribution-essay-samples",
        "https://aringo.com/free-mba-career-goals-essay-samples",
        "https://aringo.com/free-mba-leadership-essay-samples",
        "https://aringo.com/free-mba-failure-essay-samples",
        "https://aringo.com/free-mba-diversity-essay-samples",
        "https://aringo.com/free-mba-ethics-essay-samples",
    ]
    for url in topic_pages:
        urls.add(url)

    logger.info(f"Discovered {len(urls)} essay pages")
    return sorted(urls)


async def scrape_page(client: httpx.AsyncClient, url: str) -> list[dict]:
    """Scrape essays from a single ARINGO page."""
    try:
        resp = await client.get(url)
        if resp.status_code != 200:
            logger.warning(f"  {url}: HTTP {resp.status_code}")
            return []
    except Exception as e:
        logger.warning(f"  {url}: {e}")
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    page_title = soup.find("h1")
    page_title_text = page_title.get_text(strip=True) if page_title else ""

    school = _identify_school(url, page_title_text)
    essays = []

    # Method 1: Bootstrap accordion panels (primary structure)
    panels = soup.find_all("div", class_=re.compile(r"panel-collapse|collapse"))
    for panel in panels:
        # Get the panel heading (essay prompt/title)
        # Look for the preceding panel-heading
        heading_el = panel.find_previous_sibling(class_=re.compile(r"panel-heading"))
        if not heading_el:
            # Try parent's previous sibling
            parent = panel.parent
            if parent:
                heading_el = parent.find(class_=re.compile(r"panel-heading"))

        prompt = heading_el.get_text(strip=True) if heading_el else ""

        # Extract essay text
        text = panel.get_text(separator="\n", strip=True)

        # Clean up: remove navigation artifacts, extra whitespace
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = text.strip()

        if len(text) < 100:
            continue  # Too short to be a real essay

        word_count = len(text.split())
        if word_count < 50:
            continue

        content_hash = hashlib.sha256(text.encode()).hexdigest()[:12]
        essay_type = _identify_essay_type(page_title_text, prompt)

        essays.append({
            "id": f"aringo-{content_hash}",
            "source": "aringo",
            "source_url": url,
            "school_id": school,
            "prompt": prompt[:500] if prompt else None,
            "content": text[:8000],  # Cap at 8k chars
            "word_count": word_count,
            "essay_type": essay_type,
            "page_title": page_title_text,
        })

    # Method 2: If no panels found, try extracting from article body
    if not essays:
        article = soup.find("article") or soup.find("div", class_=re.compile(r"entry-content|post-content|content"))
        if article:
            # Look for blockquotes or specially formatted sections
            blockquotes = article.find_all("blockquote")
            for bq in blockquotes:
                text = bq.get_text(separator="\n", strip=True)
                if len(text) >= 100:
                    content_hash = hashlib.sha256(text.encode()).hexdigest()[:12]
                    essays.append({
                        "id": f"aringo-{content_hash}",
                        "source": "aringo",
                        "source_url": url,
                        "school_id": school,
                        "prompt": None,
                        "content": text[:8000],
                        "word_count": len(text.split()),
                        "essay_type": _identify_essay_type(page_title_text, ""),
                        "page_title": page_title_text,
                    })

    return essays


async def run():
    """Main entry point."""
    logger.info("Discovering ARINGO essay pages...")
    urls = await discover_essay_pages()

    all_essays: list[dict] = []
    seen_hashes: set[str] = set()

    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=30) as client:
        for i, url in enumerate(urls):
            logger.info(f"[{i+1}/{len(urls)}] {url}")
            essays = await scrape_page(client, url)

            for essay in essays:
                if essay["id"] not in seen_hashes:
                    seen_hashes.add(essay["id"])
                    all_essays.append(essay)

            if essays:
                logger.info(f"  Found {len(essays)} essays")

            await asyncio.sleep(1.5)  # Rate limit

    # Save
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(all_essays, f, indent=2, ensure_ascii=False)

    logger.info(f"\nDone. {len(all_essays)} essays saved to {OUTPUT_FILE}")

    # Summary
    from collections import Counter
    school_counts = Counter(e.get("school_id", "unknown") for e in all_essays)
    type_counts = Counter(e.get("essay_type", "unknown") for e in all_essays)

    logger.info("By school:")
    for s, c in school_counts.most_common(15):
        logger.info(f"  {s}: {c}")

    logger.info("By type:")
    for t, c in type_counts.most_common():
        logger.info(f"  {t}: {c}")


def main():
    asyncio.run(run())


if __name__ == "__main__":
    main()
