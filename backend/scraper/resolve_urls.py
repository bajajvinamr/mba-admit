"""Resolve missing website URLs for discovered schools via Google search."""
import asyncio
import re

from playwright.async_api import async_playwright

from scraper.config import CRAWL_DELAY_SEC, USER_AGENT


async def resolve_website_url(school_name: str, location: str = "") -> str | None:
    """Google '{school_name} MBA admissions official site' and return the first .edu/.ac link.

    Args:
        school_name: Full name of the business school.
        location: Optional location hint to improve search accuracy.

    Returns:
        URL string or None if nothing relevant found.
    """
    query = f"{school_name} MBA admissions official site"
    if location:
        query += f" {location}"

    search_url = f"https://www.google.com/search?q={query}"

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(user_agent=USER_AGENT)
        page = await context.new_page()

        try:
            await page.goto(search_url, timeout=15_000)
            await page.wait_for_load_state("domcontentloaded")

            # Grab all result links
            links = await page.eval_on_selector_all(
                "a[href]",
                "els => els.map(e => e.href)",
            )

            # Filter for .edu or .ac domains (official school sites)
            edu_pattern = re.compile(r"https?://[^/]*\.(edu|ac\.[a-z]{2,})/", re.IGNORECASE)
            for link in links:
                if edu_pattern.search(link) and "google" not in link:
                    return link

            # Fallback: return first non-Google HTTPS link from results
            for link in links:
                if (
                    link.startswith("https://")
                    and "google" not in link
                    and "youtube" not in link
                    and "wikipedia" not in link
                ):
                    return link

        except Exception as exc:
            print(f"  Failed to resolve URL for {school_name}: {exc}")
        finally:
            await browser.close()

    return None


async def resolve_missing_urls(
    schools: dict,
    max_resolve: int = 50,
) -> dict:
    """Resolve website URLs for schools that are missing them.

    Args:
        schools: Dict of school_id -> school_data.
        max_resolve: Cap on how many lookups to perform in one run.

    Returns:
        Updated schools dict (mutated in place and returned).
    """
    missing = [
        (sid, data)
        for sid, data in schools.items()
        if not data.get("website")
    ]

    if not missing:
        print("All schools already have website URLs.")
        return schools

    to_resolve = missing[:max_resolve]
    print(f"Resolving URLs for {len(to_resolve)} / {len(missing)} schools without websites...")

    resolved_count = 0
    for i, (school_id, data) in enumerate(to_resolve):
        name = data.get("name", school_id)
        location = data.get("location", "")
        print(f"  [{i + 1}/{len(to_resolve)}] {name}...")

        url = await resolve_website_url(name, location)
        if url:
            data["website"] = url
            resolved_count += 1
            print(f"    -> {url}")
        else:
            print(f"    -> not found")

        # Rate-limit between requests
        if i < len(to_resolve) - 1:
            await asyncio.sleep(CRAWL_DELAY_SEC)

    print(f"Resolved {resolved_count} / {len(to_resolve)} URLs.")
    return schools
