"""Crawl engine — httpx-first with optional Playwright fallback for JS-heavy sites."""
import asyncio
import json
import logging
import random
import re
from pathlib import Path

import httpx

from scraper.config import (
    CRAWL_CONCURRENCY,
    CRAWL_DELAY_SEC,
    CRAWL_PAGE_PATTERNS,
    CRAWL_TIMEOUT_MS,
    PLAYWRIGHT_CONCURRENCY,
    PLAYWRIGHT_MAX_DELAY_SEC,
    PLAYWRIGHT_MIN_DELAY_SEC,
    PLAYWRIGHT_TIMEOUT_MS,
    PLAYWRIGHT_VIEWPORT,
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
# JS-heavy detection
# ---------------------------------------------------------------------------

_NOSCRIPT_JS_RE = re.compile(
    r"<noscript[^>]*>.*?(enable|activate|requires?)\s+javascript.*?</noscript>",
    re.DOTALL | re.IGNORECASE,
)

_JS_FRAMEWORK_MARKERS = [
    "window.__NEXT_DATA__",        # Next.js
    "window.__NUXT__",             # Nuxt.js
    '<div id="app"></div>',        # Vue SPA
    '<div id="root"></div>',       # React SPA
    "We're sorry but",             # Vue CLI default noscript
]


def _needs_js_rendering(html: str, text: str) -> bool:
    """Detect if the page likely requires JavaScript rendering.

    Returns True when:
    - Extracted text is very short (< 500 chars) — indicates content is
      rendered client-side.
    - A <noscript> tag tells the user to enable JavaScript.
    - The HTML contains SPA framework markers with little visible text.
    """
    # Very little text content after stripping tags
    if len(text.strip()) < 500:
        return True

    # Explicit "enable JavaScript" in <noscript>
    if _NOSCRIPT_JS_RE.search(html):
        return True

    # SPA shell with thin text
    if len(text.strip()) < 1500:
        for marker in _JS_FRAMEWORK_MARKERS:
            if marker in html:
                return True

    return False


# ---------------------------------------------------------------------------
# Playwright — JS-rendering fallback
# ---------------------------------------------------------------------------

async def _fetch_with_playwright(url: str, *, timeout_ms: int = PLAYWRIGHT_TIMEOUT_MS) -> tuple[str, str] | None:
    """Render a page with Playwright (Chromium) and return (html, text).

    Features:
    - Full JavaScript execution with ``networkidle`` wait
    - Realistic viewport and stealth headers to reduce bot detection
    - Random sub-second delay before extracting content
    - 30-second timeout per page (configurable)

    Returns None on failure or if the rendered page has < 200 chars of text.
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        logger.error(
            "playwright is not installed. "
            "Install it with: pip install playwright && python -m playwright install chromium"
        )
        return None

    try:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True)
            context = await browser.new_context(
                viewport=PLAYWRIGHT_VIEWPORT,
                user_agent=USER_AGENT,
                locale="en-US",
                extra_http_headers={
                    "Accept-Language": "en-US,en;q=0.9",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Sec-Fetch-Dest": "document",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Site": "none",
                    "Sec-Fetch-User": "?1",
                    "Upgrade-Insecure-Requests": "1",
                },
                ignore_https_errors=True,
            )
            page = await context.new_page()

            # Navigate and wait for network to settle
            response = await page.goto(
                url,
                wait_until="networkidle",
                timeout=timeout_ms,
            )
            if response is None or response.status >= 500:
                await browser.close()
                return None

            # Small random delay to let late-firing JS settle
            await asyncio.sleep(random.uniform(0.3, 1.0))

            html = await page.content()
            text = await page.inner_text("body")
            await browser.close()

            if len(text.strip()) < 200:
                return None
            return html, text

    except Exception as exc:
        logger.debug("Playwright fetch failed for %s: %s", url, exc)
        return None


# ---------------------------------------------------------------------------
# Per-URL fetch with automatic fallback
# ---------------------------------------------------------------------------

async def _fetch_with_fallback(
    client: httpx.AsyncClient,
    url: str,
    *,
    accept_soft_404: bool = False,
    use_playwright_fallback: bool = True,
) -> tuple[str, str, str] | None:
    """Try httpx first; fall back to Playwright if the page looks JS-heavy.

    Returns ``(html, text, method)`` where *method* is ``"httpx"`` or
    ``"playwright"``, or ``None`` on total failure.
    """
    result = await _fetch(client, url, accept_soft_404=accept_soft_404)
    if result is not None:
        html, text = result
        if not use_playwright_fallback or not _needs_js_rendering(html, text):
            return html, text, "httpx"
        # httpx succeeded but content looks JS-rendered — try Playwright
        logger.debug("JS-heavy page detected at %s — falling back to Playwright", url)
        pw_result = await _fetch_with_playwright(url)
        if pw_result is not None:
            return pw_result[0], pw_result[1], "playwright"
        # Playwright also failed; return the httpx result (better than nothing)
        return html, text, "httpx"

    # httpx completely failed — try Playwright as last resort
    if use_playwright_fallback:
        logger.debug("httpx failed for %s — attempting Playwright fallback", url)
        pw_result = await _fetch_with_playwright(url)
        if pw_result is not None:
            return pw_result[0], pw_result[1], "playwright"

    return None


# ---------------------------------------------------------------------------
# crawl_school — httpx-first with Playwright fallback
# ---------------------------------------------------------------------------

async def crawl_school(
    context,
    school: dict,
    resume: bool = True,
    output_dir: Path | None = None,
    use_playwright: bool = True,
) -> int:
    """Crawl all page types for a school. Uses httpx first, with optional
    Playwright fallback for JS-heavy pages.

    ``context`` is accepted for backward compatibility but unused (was the
    Playwright browser context in the legacy API).
    """
    school_id: str = school["id"]
    base_url: str = school["website"].rstrip("/")
    pages_crawled = 0

    async with httpx.AsyncClient(
        timeout=15.0,
        follow_redirects=True,
        headers=_HTTPX_HEADERS,
        verify=False,
    ) as client:
        # --- Homepage ---
        if not (resume and is_already_crawled(school_id, "homepage", output_dir)):
            await asyncio.sleep(CRAWL_DELAY_SEC * 0.5)
            result = await _fetch_with_fallback(
                client, base_url,
                accept_soft_404=True,
                use_playwright_fallback=use_playwright,
            )
            if result:
                html, text, method = result
                save_crawl_result(school_id, "homepage", html, text, base_url, output_dir)
                logger.debug("Homepage for %s fetched via %s", school_id, method)
                pages_crawled += 1
            else:
                logger.debug(
                    "Homepage failed for %s (%s) — skipping sub-pages",
                    school_id, base_url,
                )
                return 0

        # --- Sub-pages ---
        for page_name, suffixes in CRAWL_PAGE_PATTERNS:
            if resume and is_already_crawled(school_id, page_name, output_dir):
                pages_crawled += 1
                continue

            for suffix in suffixes:
                url = f"{base_url}{suffix}"
                await asyncio.sleep(CRAWL_DELAY_SEC * 0.3)
                result = await _fetch_with_fallback(
                    client, url,
                    use_playwright_fallback=use_playwright,
                )
                if result:
                    html, text, method = result
                    save_crawl_result(school_id, page_name, html, text, url, output_dir)
                    if method == "playwright":
                        logger.info(
                            "Page %s/%s fetched via Playwright (JS fallback)",
                            school_id, page_name,
                        )
                    pages_crawled += 1
                    break  # first working suffix wins

    return pages_crawled


# ---------------------------------------------------------------------------
# Playwright-only crawl for low-confidence re-crawl
# ---------------------------------------------------------------------------

async def crawl_school_playwright(
    school: dict,
    resume: bool = False,
    output_dir: Path | None = None,
) -> int:
    """Crawl a school using Playwright exclusively (no httpx).

    Used by the ``crawl-js`` CLI command to re-crawl JS-heavy sites that
    previously had low extraction confidence.
    """
    school_id: str = school["id"]
    base_url: str = school["website"].rstrip("/")
    pages_crawled = 0

    # --- Homepage ---
    if not (resume and is_already_crawled(school_id, "homepage", output_dir)):
        await asyncio.sleep(random.uniform(PLAYWRIGHT_MIN_DELAY_SEC, PLAYWRIGHT_MAX_DELAY_SEC))
        result = await _fetch_with_playwright(base_url)
        if result:
            html, text = result
            save_crawl_result(school_id, "homepage", html, text, base_url, output_dir)
            logger.info("Homepage for %s fetched via Playwright", school_id)
            pages_crawled += 1
        else:
            logger.debug("Playwright homepage failed for %s (%s)", school_id, base_url)
            return 0

    # --- Sub-pages ---
    for page_name, suffixes in CRAWL_PAGE_PATTERNS:
        if resume and is_already_crawled(school_id, page_name, output_dir):
            pages_crawled += 1
            continue

        for suffix in suffixes:
            url = f"{base_url}{suffix}"
            await asyncio.sleep(random.uniform(PLAYWRIGHT_MIN_DELAY_SEC, PLAYWRIGHT_MAX_DELAY_SEC))
            result = await _fetch_with_playwright(url)
            if result:
                html, text = result
                save_crawl_result(school_id, page_name, html, text, url, output_dir)
                logger.info("Page %s/%s fetched via Playwright", school_id, page_name)
                pages_crawled += 1
                break

    return pages_crawled


async def crawl_js_schools(schools: list[dict], resume: bool = False) -> None:
    """Crawl a list of schools using Playwright only. Used for re-crawling
    low-confidence JS-heavy sites.

    Uses lower concurrency than the httpx crawl since each page launches a
    browser instance.
    """
    valid = [s for s in schools if s.get("website")]
    if not valid:
        logger.warning("No schools with websites — nothing to crawl with Playwright.")
        return

    sem = asyncio.Semaphore(PLAYWRIGHT_CONCURRENCY)
    total = len(valid)
    done_count = 0
    success_count = 0

    async def _worker(school: dict) -> None:
        nonlocal done_count, success_count
        async with sem:
            sid = school["id"]
            try:
                pages = await crawl_school_playwright(school, resume=resume)
                done_count += 1
                if pages > 0:
                    success_count += 1
                    logger.info(
                        "[Playwright] [%d/%d] %s: %d pages",
                        done_count, total, sid, pages,
                    )
                else:
                    logger.info(
                        "[Playwright] [%d/%d] %s: failed", done_count, total, sid,
                    )
            except Exception as exc:
                done_count += 1
                logger.error("[Playwright] [%d/%d] %s error: %s", done_count, total, sid, exc)

    await asyncio.gather(*[_worker(s) for s in valid])
    logger.info(
        "Playwright crawl complete: %d/%d schools succeeded", success_count, total,
    )
