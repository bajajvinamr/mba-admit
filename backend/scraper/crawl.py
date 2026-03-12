"""Playwright-based crawl engine — visits each school's MBA pages and caches HTML + text."""
import asyncio
import json
import logging
from pathlib import Path

from playwright.async_api import async_playwright, BrowserContext, Page

from scraper.config import (
    CRAWL_CONCURRENCY,
    CRAWL_DELAY_SEC,
    CRAWL_PAGE_PATTERNS,
    CRAWL_TIMEOUT_MS,
    RAW_HTML_DIR,
    USER_AGENT,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# URL helpers
# ---------------------------------------------------------------------------

def build_page_urls(base_url: str) -> list[tuple[str, str]]:
    """Given a school's base website URL, generate candidate page URLs.

    Returns a list of (page_name, url) tuples — one per page pattern.
    Only the *first* suffix for each page type is returned (caller will try
    alternates inside ``_crawl_page`` via ``crawl_school``).
    """
    base = base_url.rstrip("/")
    results: list[tuple[str, str]] = []
    for page_name, suffixes in CRAWL_PAGE_PATTERNS:
        for suffix in suffixes:
            results.append((page_name, f"{base}{suffix}"))
    return results


# ---------------------------------------------------------------------------
# Filesystem helpers
# ---------------------------------------------------------------------------

def save_crawl_result(
    school_id: str,
    page_name: str,
    html: str,
    text: str,
    url: str,
    output_dir: Path | None = None,
) -> None:
    """Persist HTML and text to ``data/raw_html/{school_id}/``."""
    base = (output_dir or RAW_HTML_DIR) / school_id
    base.mkdir(parents=True, exist_ok=True)

    (base / f"{page_name}.html").write_text(html, encoding="utf-8")
    (base / f"{page_name}.txt").write_text(text, encoding="utf-8")

    # Append/update meta.json with the URL used
    meta_path = base / "meta.json"
    meta: dict = {}
    if meta_path.exists():
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
    meta.setdefault("urls", {})
    meta["urls"][page_name] = url
    meta_path.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")


def is_already_crawled(
    school_id: str,
    page_name: str,
    output_dir: Path | None = None,
) -> bool:
    """Check if a .txt file exists for resume support."""
    base = (output_dir or RAW_HTML_DIR) / school_id
    return (base / f"{page_name}.txt").exists()


# ---------------------------------------------------------------------------
# Single-page fetch
# ---------------------------------------------------------------------------

async def _crawl_page(page: Page, url: str) -> tuple[str, str] | None:
    """Fetch a single page via Playwright.

    Returns ``(html, text)`` or ``None`` if the page failed, returned a 404,
    or had too little content (< 200 chars of visible text).
    """
    try:
        response = await page.goto(url, wait_until="domcontentloaded", timeout=CRAWL_TIMEOUT_MS)
        if response is None or response.status >= 400:
            return None
        html = await page.content()
        text = await page.inner_text("body")
        if len(text.strip()) < 200:
            return None
        return html, text
    except Exception as exc:
        logger.debug("Failed to crawl %s: %s", url, exc)
        return None


# ---------------------------------------------------------------------------
# Per-school crawl
# ---------------------------------------------------------------------------

async def crawl_school(
    context: BrowserContext,
    school: dict,
    resume: bool = True,
    output_dir: Path | None = None,
) -> int:
    """Crawl all page types for one school.

    Also crawls the homepage (page_name ``"homepage"``).
    Returns the number of pages successfully crawled.
    """
    school_id: str = school["id"]
    base_url: str = school["website"].rstrip("/")
    pages_crawled = 0
    page = await context.new_page()

    try:
        # --- Homepage -------------------------------------------------------
        if not (resume and is_already_crawled(school_id, "homepage", output_dir)):
            await asyncio.sleep(CRAWL_DELAY_SEC)
            result = await _crawl_page(page, base_url)
            if result:
                save_crawl_result(school_id, "homepage", result[0], result[1], base_url, output_dir)
                pages_crawled += 1

        # --- Pattern pages --------------------------------------------------
        for page_name, suffixes in CRAWL_PAGE_PATTERNS:
            if resume and is_already_crawled(school_id, page_name, output_dir):
                continue

            found = False
            for suffix in suffixes:
                url = f"{base_url}{suffix}"
                await asyncio.sleep(CRAWL_DELAY_SEC)
                result = await _crawl_page(page, url)
                if result:
                    save_crawl_result(school_id, page_name, result[0], result[1], url, output_dir)
                    pages_crawled += 1
                    found = True
                    break  # first working suffix wins
            if not found:
                logger.debug("No page found for %s / %s", school_id, page_name)
    finally:
        await page.close()

    return pages_crawled


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

async def crawl_all(schools: list[dict], resume: bool = True) -> None:
    """Async orchestrator — crawl all schools with semaphore-based concurrency."""
    # Filter schools that have a website
    valid = [s for s in schools if s.get("website")]
    if not valid:
        logger.warning("No schools with 'website' field found — nothing to crawl.")
        return

    sem = asyncio.Semaphore(CRAWL_CONCURRENCY)

    async def _worker(school: dict) -> None:
        async with sem:
            sid = school["id"]
            logger.info("Crawling %s (%s)...", sid, school.get("name", "?"))
            async with async_playwright() as pw:
                browser = await pw.chromium.launch(headless=True)
                context = await browser.new_context(user_agent=USER_AGENT)
                try:
                    pages = await crawl_school(context, school, resume=resume)
                    logger.info("\u2705 %s: %d pages crawled", sid, pages)
                finally:
                    await context.close()
                    await browser.close()

    await asyncio.gather(*[_worker(s) for s in valid])
