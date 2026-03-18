"""Resolve missing website URLs using DuckDuckGo HTML search (no CAPTCHA).

Falls back to known URL patterns for common school naming conventions.
"""
import asyncio
import re
import urllib.parse

import httpx

from scraper.config import CRAWL_DELAY_SEC


# Known URL patterns for business schools — {name} is lowered + hyphenated
KNOWN_PATTERNS = [
    "https://{slug}.edu",
    "https://www.{slug}.edu",
    "https://{slug}.ac.uk",
    "https://www.{slug}.edu/mba",
]


def _build_search_query(school_name: str, location: str = "") -> str:
    """Build a program-aware search query (MBA vs MiM vs MSc vs Executive)."""
    name_lower = school_name.lower()

    # Detect program type from name
    if "mim" in name_lower or "master in management" in name_lower:
        suffix = "Master in Management program official site"
    elif "msc" in name_lower or "master of science" in name_lower:
        suffix = "Masters program official site"
    elif "executive" in name_lower or "emba" in name_lower:
        suffix = "Executive MBA program official site"
    elif "mba" in name_lower:
        suffix = "MBA program official site"
    else:
        # Generic — just search for the school + admissions
        suffix = "business school admissions official site"

    # Strip program type from name to reduce noise in query
    # e.g., "Copenhagen Business School MSc Management of Innovation..." → "Copenhagen Business School"
    clean_name = re.sub(
        r"\s+(MBA|MiM|MSc|EMBA|Executive MBA|Master in Management|Master of Science).*$",
        "",
        school_name,
        flags=re.IGNORECASE,
    ).strip()
    # If stripping removed everything or too much, use original
    if len(clean_name) < 10:
        clean_name = school_name

    query = f"{clean_name} {suffix}"
    if location:
        query += f" {location}"
    return query


async def resolve_via_duckduckgo(school_name: str, location: str = "") -> str | None:
    """Search DuckDuckGo HTML (no JS required, no CAPTCHA) for the school URL."""
    query = _build_search_query(school_name, location)

    url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"

    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        try:
            resp = await client.get(url, headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            })
            resp.raise_for_status()
            html = resp.text

            # Extract result URLs from DuckDuckGo HTML
            # DDG wraps results in uddg= params inside redirect URLs
            uddg_pattern = re.compile(r"uddg=([^&\"]+)")
            raw_urls = uddg_pattern.findall(html)

            # Decode and deduplicate
            seen = set()
            decoded_links = []
            for raw in raw_urls:
                decoded = urllib.parse.unquote(raw).replace("&amp;", "&")
                if decoded not in seen:
                    seen.add(decoded)
                    decoded_links.append(decoded)

            # Priority 1: .edu, .ac.xx, or common university TLDs
            edu_pattern = re.compile(
                r"https?://[^/]*\.(edu|ac\.[a-z]{2,}|uni-[a-z]+\.[a-z]{2,}|university\.[a-z]{2,})/",
                re.IGNORECASE,
            )
            for link in decoded_links:
                if edu_pattern.search(link) and "google" not in link:
                    return link

            # Priority 2: Any non-search-engine HTTPS link
            skip_domains = {"duckduckgo.com", "google.com", "youtube.com", "wikipedia.org",
                            "reddit.com", "quora.com", "facebook.com", "twitter.com", "linkedin.com"}
            for link in decoded_links:
                if link.startswith("https://"):
                    domain = urllib.parse.urlparse(link).hostname or ""
                    if not any(d in domain for d in skip_domains):
                        return link

        except Exception as exc:
            print(f"    DDG search failed for {school_name}: {exc}")

    return None


async def resolve_missing_urls(
    schools: dict,
    max_resolve: int = 50,
) -> dict:
    """Resolve website URLs for schools that are missing them.

    Uses DuckDuckGo HTML search (no Playwright, no CAPTCHA issues).
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
        print(f"  [{i + 1}/{len(to_resolve)}] {name}...", end="", flush=True)

        url = await resolve_via_duckduckgo(name, location)
        if url:
            data["website"] = url
            resolved_count += 1
            print(f" -> {url}")
        else:
            print(f" -> not found")

        # Rate-limit between requests
        if i < len(to_resolve) - 1:
            await asyncio.sleep(max(CRAWL_DELAY_SEC, 1.5))

    print(f"\nResolved {resolved_count} / {len(to_resolve)} URLs.")
    return schools
