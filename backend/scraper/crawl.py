"""Crawl engine — httpx-first with optional Playwright fallback for JS-heavy sites."""
import asyncio
import json
import logging
import re
from pathlib import Path

import httpx

from scraper.config import (
    CRAWL_CONCURRENCY,
    CRAWL_DELAY_SEC,
    CRAWL_PAGE_PATTERNS,
    CRAWL_TIMEOUT_MS,
    RAW_HTML_DIR,
    USER_AGENT,
)

logger = logging.getLogger(__name__)

# Suppress noisy httpx request logging
logging.getLogger("httpx").setLevel(logging.WARNING)


# ---------------------------------------------------------------------------
# httpx — primary crawl engine (fast, no browser overhead)
# ---------------------------------------------------------------------------

_HTTPX_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
}

_TAG_RE = re.compile(r"<script[^>]*>.*?</script>|<style[^>]*>.*?</style>|<[^>]+>", re.DOTALL)
_WS_RE = re.compile(r"\s+")


def _html_to_text(html: str) -> str:
    """Strip HTML tags to get visible text (good enough for extract stage)."""
    text = _TAG_RE.sub(" ", html)
    return _WS_RE.sub(" ", text).strip()


async def _fetch(client: httpx.AsyncClient, url: str, accept_soft_404: bool = False) -> tuple[str, str] | None:
    """Fetch a URL. Returns (html, text) or None if failed/empty.

    If ``accept_soft_404`` is True, we accept 404 responses that still have
    substantial content (many school sites serve useful pages at wrong paths).
    """
    try:
        resp = await client.get(url)
        # Hard failures: 5xx, 403 (bot block), etc.
        if resp.status_code >= 500:
            return None
        if resp.status_code == 403:
            return None
        # 404 with content: some schools serve useful pages even at wrong paths
        if resp.status_code == 404 and not accept_soft_404:
            return None
        if resp.status_code >= 400 and resp.status_code != 404:
            return None
        html = resp.text
        text = _html_to_text(html)
        if len(text.strip()) < 200:
            return None
        return html, text
    except Exception:
        return None


# ---------------------------------------------------------------------------
# URL helpers
# ---------------------------------------------------------------------------

def build_page_urls(base_url: str) -> list[tuple[str, str]]:
    """Given a school's base website URL, generate candidate page URLs."""
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
# Per-school crawl (httpx-first)
# ---------------------------------------------------------------------------

async def crawl_school_httpx(
    client: httpx.AsyncClient,
    school: dict,
    resume: bool = True,
    output_dir: Path | None = None,
) -> int:
    """Crawl all page types for one school using httpx (no browser needed).

    Strategy: try homepage first. If homepage fails → skip all sub-pages
    (the URL is probably wrong). This is the fast-fail optimization.
    """
    school_id: str = school["id"]
    base_url: str = school["website"].rstrip("/")
    pages_crawled = 0

    # --- Homepage ---
    if not (resume and is_already_crawled(school_id, "homepage", output_dir)):
        await asyncio.sleep(CRAWL_DELAY_SEC * 0.5)  # lighter delay for httpx
        # Accept soft 404s for homepages — many school URLs redirect to
        # useful pages even when the exact path doesn't exist
        result = await _fetch(client, base_url, accept_soft_404=True)
        if result:
            save_crawl_result(school_id, "homepage", result[0], result[1], base_url, output_dir)
            pages_crawled += 1
        else:
            # Homepage truly failed (5xx, 403, or empty). Skip sub-pages.
            logger.debug("Homepage failed for %s (%s) — skipping sub-pages", school_id, base_url)
            return 0

    # --- Sub-pages (only if homepage succeeded) ---
    for page_name, suffixes in CRAWL_PAGE_PATTERNS:
        if resume and is_already_crawled(school_id, page_name, output_dir):
            pages_crawled += 1  # count already-crawled pages too
            continue

        for suffix in suffixes:
            url = f"{base_url}{suffix}"
            await asyncio.sleep(CRAWL_DELAY_SEC * 0.3)  # sub-pages are same domain
            result = await _fetch(client, url)
            if result:
                save_crawl_result(school_id, page_name, result[0], result[1], url, output_dir)
                pages_crawled += 1
                break  # first working suffix wins

    return pages_crawled


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

async def crawl_all(schools: list[dict], resume: bool = True) -> None:
    """Async orchestrator — httpx-first crawl with high concurrency."""
    valid = [s for s in schools if s.get("website")]
    if not valid:
        logger.warning("No schools with 'website' field found — nothing to crawl.")
        return

    # Pre-filter: skip already-crawled schools
    if resume:
        needs_crawl = [
            s for s in valid
            if not is_already_crawled(s["id"], "homepage")
        ]
        skipped = len(valid) - len(needs_crawl)
        if skipped:
            logger.info("Skipping %d already-crawled schools (resume=True)", skipped)
        if not needs_crawl:
            logger.info("All %d schools already crawled — nothing to do.", len(valid))
            return
        valid = needs_crawl

    sem = asyncio.Semaphore(CRAWL_CONCURRENCY)
    total = len(valid)
    done_count = 0
    success_count = 0

    async with httpx.AsyncClient(
        timeout=15.0, follow_redirects=True, headers=_HTTPX_HEADERS,
        verify=False,  # Many .edu sites have broken/expired SSL certs
        limits=httpx.Limits(max_connections=CRAWL_CONCURRENCY * 2, max_keepalive_connections=CRAWL_CONCURRENCY),
    ) as client:

        async def _worker(idx: int, school: dict) -> None:
            nonlocal done_count, success_count
            async with sem:
                sid = school["id"]
                try:
                    pages = await crawl_school_httpx(client, school, resume=resume)
                    done_count += 1
                    if pages > 0:
                        success_count += 1
                        logger.info("✅ [%d/%d] %s: %d pages (%.0f%% success rate)",
                                    done_count, total, sid, pages,
                                    success_count / done_count * 100)
                    else:
                        logger.info("⏭️  [%d/%d] %s: homepage unreachable — skipped", done_count, total, sid)
                except Exception as exc:
                    done_count += 1
                    logger.error("❌ [%d/%d] %s failed: %s", done_count, total, sid, exc)

        await asyncio.gather(*[_worker(i, s) for i, s in enumerate(valid)])

    logger.info("🏁 Crawl complete: %d/%d schools crawled successfully", success_count, total)


# ---------------------------------------------------------------------------
# Legacy Playwright interface (kept for crawl_school backward compat)
# ---------------------------------------------------------------------------

async def _crawl_page_pw(page, url: str) -> tuple[str, str] | None:
    """Playwright-based page fetch — legacy, used for JS-heavy sites."""
    try:
        response = await page.goto(url, wait_until="domcontentloaded", timeout=CRAWL_TIMEOUT_MS)
        if response is None or response.status >= 400:
            return None
        html = await page.content()
        text = await page.inner_text("body")
        if len(text.strip()) < 200:
            return None
        return html, text
    except Exception:
        return None


async def crawl_school(context, school: dict, resume: bool = True, output_dir: Path | None = None) -> int:
    """Legacy Playwright-based crawl — wraps new httpx approach."""
    # Use httpx directly instead of Playwright
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, headers=_HTTPX_HEADERS, verify=False) as client:
        return await crawl_school_httpx(client, school, resume, output_dir)
