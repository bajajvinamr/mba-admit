"""MBA Essay Scraper — collects real applicant essays from public sources.

Sources:
1. GMAT Club essay review threads
2. Accepted.com sample essays
3. MBA Crystal Ball essay examples

Usage:
    python -m scraper.essay_scraper [--source gmatclub|accepted|all] [--max-pages 50]
"""

import asyncio
import json
import logging
import re
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Optional

from playwright.async_api import async_playwright, Page

logger = logging.getLogger("scraper.essays")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
OUTPUT_FILE = DATA_DIR / "scraped_essays_corpus.json"


async def _create_browser(pw):
    """Create a stealth browser context."""
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


def _hash_content(content: str) -> str:
    """Create a short hash for dedup."""
    return hashlib.sha256(content.encode()).hexdigest()[:12]


def _extract_school_from_text(text: str) -> Optional[str]:
    """Try to identify which school an essay is for based on text content."""
    text_lower = text.lower()
    school_patterns = {
        "hbs": r"harvard|hbs",
        "gsb": r"stanford gsb|stanford graduate school",
        "wharton": r"wharton",
        "chicago_booth": r"booth|chicago booth",
        "kellogg": r"kellogg|northwestern",
        "mit_sloan": r"sloan|mit sloan",
        "columbia_business_school": r"columbia business|cbs",
        "dartmouth_tuck": r"tuck|dartmouth",
        "uc_berkeley_haas": r"haas|berkeley",
        "michigan_ross": r"ross|michigan ross",
        "duke_fuqua": r"fuqua|duke",
        "uva_darden": r"darden|virginia",
        "nyu_stern": r"stern|nyu",
        "yale_som": r"yale som|yale school of management",
        "cornell_johnson": r"johnson|cornell",
        "insead": r"insead",
        "london_business_school": r"lbs|london business",
    }
    for school_id, pattern in school_patterns.items():
        if re.search(pattern, text_lower):
            return school_id
    return None


# ── GMAT Club Essay Threads ──────────────────────────────────────────────────


GMATCLUB_ESSAY_SEARCH_QUERIES = [
    "essay review HBS site:gmatclub.com/forum",
    "essay review Stanford GSB site:gmatclub.com/forum",
    "essay review Wharton site:gmatclub.com/forum",
    "essay review Booth site:gmatclub.com/forum",
    "essay review Kellogg site:gmatclub.com/forum",
    "MBA essay review site:gmatclub.com/forum",
    "essay feedback MBA site:gmatclub.com/forum",
    "please review my essay MBA site:gmatclub.com/forum",
]

# Known GMAT Club forum sections with essay content
GMATCLUB_ESSAY_FORUM_URLS = [
    # The B-School Application forum — where people post essays for review
    "https://gmatclub.com/forum/the-b-school-application-103/",
]


async def _scrape_gmatclub_essay_forum(
    pw, max_pages: int = 50
) -> list[dict]:
    """Scrape essay threads from GMAT Club's B-School Application forum."""
    essays = []

    browser, ctx = await _create_browser(pw)
    page = await ctx.new_page()

    try:
        for forum_url in GMATCLUB_ESSAY_FORUM_URLS:
            logger.info(f"Scraping forum: {forum_url}")

            for page_num in range(max_pages):
                # GMAT Club forum pagination: ?start=0, ?start=25, etc.
                offset = page_num * 25
                url = f"{forum_url}?start={offset}" if offset > 0 else forum_url

                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                await page.wait_for_timeout(2000)

                # Get all topic links from the forum listing
                topics = await page.evaluate("""() => {
                    const results = [];
                    // Forum topic links
                    const links = document.querySelectorAll('a.topictitle, a[class*="topic"]');
                    for (const a of links) {
                        const href = a.getAttribute('href') || '';
                        const title = a.textContent.trim();
                        // Filter for essay-related threads
                        const titleLower = title.toLowerCase();
                        if (titleLower.includes('essay') ||
                            titleLower.includes('review my') ||
                            titleLower.includes('please review') ||
                            titleLower.includes('feedback') ||
                            titleLower.includes('what more would you like') ||
                            titleLower.includes('matters most') ||
                            titleLower.includes('why mba') ||
                            titleLower.includes('career goals') ||
                            titleLower.includes('sop ') ||
                            titleLower.includes('statement of purpose')) {
                            results.push({href: href, title: title});
                        }
                    }
                    return results;
                }""")

                if not topics:
                    logger.info(f"  Page {page_num + 1}: no essay topics, checking for more pages")
                    # Check if there are more pages
                    has_next = await page.evaluate("""() => {
                        const links = document.querySelectorAll('a[href*="start="]');
                        return links.length > 0;
                    }""")
                    if not has_next:
                        break
                    continue

                logger.info(f"  Page {page_num + 1}: found {len(topics)} essay topics")

                # Visit each essay topic and extract content
                for topic in topics[:10]:  # Limit per page to avoid rate limiting
                    topic_url = topic["href"]
                    if not topic_url.startswith("http"):
                        topic_url = f"https://gmatclub.com{topic_url}"

                    try:
                        await page.goto(topic_url, wait_until="domcontentloaded", timeout=30000)
                        await page.wait_for_timeout(1500)

                        # Extract the first post (the essay)
                        post_data = await page.evaluate("""() => {
                            // Get the first post content
                            const posts = document.querySelectorAll('.post_body, .content, [class*="postcontent"], .postbody');
                            if (!posts.length) return null;

                            const firstPost = posts[0];
                            const text = firstPost.innerText.trim();

                            // Get metadata
                            const title = document.querySelector('h2.topic-title, h1')?.textContent?.trim() || '';
                            const date = document.querySelector('.author time, .postdetails time, [datetime]')?.getAttribute('datetime') || '';

                            return {
                                title: title,
                                content: text,
                                date: date,
                                url: window.location.href,
                                word_count: text.split(/\\s+/).length
                            };
                        }""")

                        if post_data and post_data["word_count"] >= 100:
                            # Try to identify the school
                            full_text = f"{post_data['title']} {post_data['content']}"
                            school = _extract_school_from_text(full_text)

                            essay = {
                                "id": f"gmatclub-{_hash_content(post_data['content'])}",
                                "source": "gmatclub",
                                "source_url": post_data["url"],
                                "title": post_data["title"],
                                "school": school,
                                "content": post_data["content"][:5000],  # Cap at 5k chars
                                "word_count": post_data["word_count"],
                                "date": post_data.get("date", ""),
                                "scraped_at": datetime.now().isoformat(),
                            }
                            essays.append(essay)

                    except Exception as e:
                        logger.warning(f"  Failed to scrape topic: {e}")
                        continue

                    await asyncio.sleep(1.5)  # Rate limit between topics

                if page_num % 5 == 0:
                    logger.info(f"  Progress: {len(essays)} essays collected so far")

                await asyncio.sleep(2)  # Rate limit between pages

    except Exception as e:
        logger.error(f"Forum scraping error: {e}")
    finally:
        await browser.close()

    return essays


# ── GMAT Club Search-based Discovery ─────────────────────────────────────────


async def _scrape_gmatclub_search(pw, max_pages: int = 20) -> list[dict]:
    """Use GMAT Club's internal search to find essay threads."""
    essays = []

    browser, ctx = await _create_browser(pw)
    page = await ctx.new_page()

    search_terms = [
        "essay review HBS",
        "essay review Stanford",
        "essay review Wharton",
        "essay review Booth",
        "essay review Kellogg",
        "essay review Columbia",
        "essay draft MBA",
        "please review my essay",
        "why MBA essay",
        "career goals essay",
        "essay feedback MBA application",
    ]

    try:
        for term in search_terms:
            logger.info(f"Searching GMAT Club for: {term}")

            search_url = f"https://gmatclub.com/forum/search.php?keywords={term.replace(' ', '+')}&fid[]=103"
            await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(3000)

            # Extract search results
            results = await page.evaluate("""() => {
                const items = [];
                // Search result links
                const links = document.querySelectorAll('a.topictitle, .search-result a, a[href*="viewtopic"]');
                for (const a of links) {
                    items.push({
                        href: a.getAttribute('href'),
                        title: a.textContent.trim()
                    });
                }
                return items;
            }""")

            logger.info(f"  Found {len(results)} search results")

            for result in results[:15]:  # Top 15 per search
                result_url = result["href"]
                if not result_url:
                    continue
                if not result_url.startswith("http"):
                    result_url = f"https://gmatclub.com{result_url}"

                try:
                    await page.goto(result_url, wait_until="domcontentloaded", timeout=30000)
                    await page.wait_for_timeout(1500)

                    post_data = await page.evaluate("""() => {
                        const posts = document.querySelectorAll('.post_body, .content, .postbody');
                        if (!posts.length) return null;
                        const text = posts[0].innerText.trim();
                        const title = document.querySelector('h2.topic-title, h1')?.textContent?.trim() || '';
                        const date = document.querySelector('[datetime]')?.getAttribute('datetime') || '';
                        return {title, content: text, date, url: window.location.href, word_count: text.split(/\\s+/).length};
                    }""")

                    if post_data and post_data["word_count"] >= 150:
                        school = _extract_school_from_text(
                            f"{post_data['title']} {post_data['content']}"
                        )
                        essay = {
                            "id": f"gmatclub-{_hash_content(post_data['content'])}",
                            "source": "gmatclub",
                            "source_url": post_data["url"],
                            "title": post_data["title"],
                            "school": school,
                            "content": post_data["content"][:5000],
                            "word_count": post_data["word_count"],
                            "date": post_data.get("date", ""),
                            "scraped_at": datetime.now().isoformat(),
                        }
                        essays.append(essay)

                except Exception as e:
                    logger.warning(f"  Failed: {e}")
                    continue

                await asyncio.sleep(1.5)

            await asyncio.sleep(3)  # Between searches

    except Exception as e:
        logger.error(f"Search scraping error: {e}")
    finally:
        await browser.close()

    return essays


# ── Accepted.com Sample Essays ────────────────────────────────────────────────


async def _scrape_accepted(pw, max_pages: int = 20) -> list[dict]:
    """Scrape sample essays from Accepted.com."""
    essays = []

    browser, ctx = await _create_browser(pw)
    page = await ctx.new_page()

    base_url = "https://www.accepted.com/mba/sample-essays"

    try:
        logger.info("Scraping Accepted.com sample essays...")
        await page.goto(base_url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(3000)

        # Get all essay links
        essay_links = await page.evaluate("""() => {
            const results = [];
            const links = document.querySelectorAll('a[href*="essay"], a[href*="sample"]');
            for (const a of links) {
                const href = a.getAttribute('href') || '';
                const text = a.textContent.trim();
                if (text.length > 10 && (href.includes('essay') || href.includes('sample'))) {
                    results.push({href: href, title: text});
                }
            }
            return results;
        }""")

        logger.info(f"  Found {len(essay_links)} essay links")

        for link in essay_links[:max_pages]:
            url = link["href"]
            if not url.startswith("http"):
                url = f"https://www.accepted.com{url}"

            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                await page.wait_for_timeout(2000)

                content = await page.evaluate("""() => {
                    // Try to find the essay content in the article body
                    const article = document.querySelector('article, .entry-content, .post-content, main');
                    if (!article) return null;
                    const text = article.innerText.trim();
                    const title = document.querySelector('h1')?.textContent?.trim() || '';
                    return {title, content: text, url: window.location.href, word_count: text.split(/\\s+/).length};
                }""")

                if content and content["word_count"] >= 100:
                    school = _extract_school_from_text(
                        f"{content['title']} {content['content']}"
                    )
                    essay = {
                        "id": f"accepted-{_hash_content(content['content'])}",
                        "source": "accepted.com",
                        "source_url": content["url"],
                        "title": content["title"],
                        "school": school,
                        "content": content["content"][:5000],
                        "word_count": content["word_count"],
                        "scraped_at": datetime.now().isoformat(),
                    }
                    essays.append(essay)

            except Exception as e:
                logger.warning(f"  Failed: {e}")
                continue

            await asyncio.sleep(2)

    except Exception as e:
        logger.error(f"Accepted.com error: {e}")
    finally:
        await browser.close()

    return essays


# ── Main ──────��───────────────────────────────────────────────────────────────


async def run(
    source: str = "all",
    max_pages: int = 50,
):
    """Run the essay scraper."""

    # Load existing
    existing: dict[str, dict] = {}
    if OUTPUT_FILE.exists():
        with open(OUTPUT_FILE) as f:
            for essay in json.load(f):
                existing[essay["id"]] = essay
        logger.info(f"Loaded {len(existing)} existing essays")

    all_essays: list[dict] = []

    async with async_playwright() as pw:
        if source in ("gmatclub", "all"):
            logger.info("=== GMAT Club Forum Scrape ===")
            forum_essays = await _scrape_gmatclub_essay_forum(pw, max_pages)
            all_essays.extend(forum_essays)
            logger.info(f"GMAT Club forum: {len(forum_essays)} essays")

            logger.info("=== GMAT Club Search Scrape ===")
            search_essays = await _scrape_gmatclub_search(pw, max_pages=20)
            all_essays.extend(search_essays)
            logger.info(f"GMAT Club search: {len(search_essays)} essays")

        if source in ("accepted", "all"):
            logger.info("=== Accepted.com Scrape ===")
            accepted_essays = await _scrape_accepted(pw, max_pages)
            all_essays.extend(accepted_essays)
            logger.info(f"Accepted.com: {len(accepted_essays)} essays")

    # Merge and dedup
    for essay in all_essays:
        existing[essay["id"]] = essay

    result = list(existing.values())

    # Save
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    logger.info(f"\nTotal: {len(result)} essays saved to {OUTPUT_FILE}")

    # Summary
    from collections import Counter
    source_counts = Counter(e["source"] for e in result)
    school_counts = Counter(e.get("school", "unknown") for e in result)

    logger.info("By source:")
    for src, count in source_counts.most_common():
        logger.info(f"  {src}: {count}")

    logger.info("By school (top 15):")
    for school, count in school_counts.most_common(15):
        logger.info(f"  {school}: {count}")


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Scrape MBA essays from public sources")
    parser.add_argument(
        "--source",
        choices=["gmatclub", "accepted", "all"],
        default="all",
        help="Source to scrape",
    )
    parser.add_argument("--max-pages", type=int, default=50, help="Max pages per source")
    args = parser.parse_args()

    asyncio.run(run(source=args.source, max_pages=args.max_pages))


if __name__ == "__main__":
    main()
