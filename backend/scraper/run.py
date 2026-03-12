"""CLI orchestrator for the MBA scraper pipeline.

Usage:
    cd backend && python -m scraper.run <command> [options]

Commands:
    discover   Stage 1: discover schools from ranking sites
    resolve    Resolve missing website URLs via Google search
    crawl      Stage 2: crawl school websites with Playwright
    extract    Stage 3: extract structured data with Claude
    merge      Stage 4: merge scraped data into the main DB
    all        Run the full pipeline end-to-end
    stats      Show pipeline statistics
"""
import argparse
import asyncio
import logging
import sys
from collections import Counter

from scraper.config import (
    DISCOVERY_LIST_FILE,
    EXISTING_DB_FILE,
    RAW_HTML_DIR,
    SCRAPED_DB_FILE,
)
from scraper.utils import load_json, save_json, deduplicate_schools


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _header(title: str) -> None:
    """Print a formatted stage header."""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")


def _schools_list_to_dict(schools: list[dict]) -> dict:
    """Convert a list of school dicts (with 'id' key) to {id: data} dict."""
    return {s["id"]: s for s in schools if "id" in s}


def _schools_dict_to_list(schools: dict) -> list[dict]:
    """Convert {id: data} dict back to list, ensuring each entry has 'id'."""
    result = []
    for sid, data in schools.items():
        entry = {**data}
        entry.setdefault("id", sid)
        entry.setdefault("name", sid)
        result.append(entry)
    return result


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_discover(args: argparse.Namespace) -> list[dict]:
    """Stage 1: Discover MBA programs from ranking sites + seeds + existing DB."""
    from scraper.discover import discover_all, load_existing_schools

    _header("Stage 1: Discovery")

    fresh = getattr(args, "fresh", False)

    # If not fresh and cache exists, load from cache
    if not fresh and DISCOVERY_LIST_FILE.exists():
        cached = load_json(DISCOVERY_LIST_FILE)
        if cached:
            print(f"Loaded {len(cached)} schools from cache: {DISCOVERY_LIST_FILE}")
            print("  (use --fresh to re-scrape ranking sites)")
            return cached

    schools = asyncio.run(discover_all(scrape_rankings=True))

    # Merge with existing DB entries and deduplicate
    existing = load_existing_schools()
    if existing:
        combined = schools + existing
        schools = deduplicate_schools(combined)
        save_json(schools, DISCOVERY_LIST_FILE)

    print(f"\nDiscovery complete: {len(schools)} unique MBA programs")
    return schools


def cmd_resolve(args: argparse.Namespace) -> None:
    """Resolve missing website URLs for discovered schools."""
    from scraper.resolve_urls import resolve_missing_urls

    _header("URL Resolution")

    discovery = load_json(DISCOVERY_LIST_FILE)
    if not discovery:
        print("No discovery list found. Run 'discover' first.")
        sys.exit(1)

    # Convert list -> dict for resolve_missing_urls
    if isinstance(discovery, list):
        schools_dict = _schools_list_to_dict(discovery)
    else:
        schools_dict = discovery

    limit = getattr(args, "limit", 50)
    updated = asyncio.run(resolve_missing_urls(schools_dict, max_resolve=limit))

    # Save back as list
    updated_list = _schools_dict_to_list(updated)
    save_json(updated_list, DISCOVERY_LIST_FILE)
    print(f"Updated discovery list saved with {len(updated_list)} schools.")


def cmd_crawl(args: argparse.Namespace) -> None:
    """Stage 2: Crawl school websites with Playwright."""
    from scraper.crawl import crawl_all

    _header("Stage 2: Crawl")

    discovery = load_json(DISCOVERY_LIST_FILE)
    if not discovery:
        print("No discovery list found. Run 'discover' first.")
        sys.exit(1)

    if isinstance(discovery, dict):
        schools = _schools_dict_to_list(discovery)
    else:
        schools = discovery

    # Filter by --schools if provided
    school_ids = getattr(args, "schools", None)
    if school_ids:
        ids = {s.strip() for s in school_ids.split(",")}
        schools = [s for s in schools if s.get("id") in ids]
        if not schools:
            print(f"No matching schools found for IDs: {school_ids}")
            sys.exit(1)

    fresh = getattr(args, "fresh", False)
    resume = not fresh

    with_website = [s for s in schools if s.get("website")]
    print(f"Schools to crawl: {len(with_website)} (of {len(schools)} total, {len(schools) - len(with_website)} missing website)")

    asyncio.run(crawl_all(with_website, resume=resume))
    print("\nCrawl complete.")


def cmd_extract(args: argparse.Namespace) -> None:
    """Stage 3: Extract structured data using Claude."""
    from scraper.extract import extract_all

    _header("Stage 3: Extract")

    discovery = load_json(DISCOVERY_LIST_FILE)
    if not discovery:
        print("No discovery list found. Run 'discover' first.")
        sys.exit(1)

    if isinstance(discovery, dict):
        schools = _schools_dict_to_list(discovery)
    else:
        schools = discovery

    # Filter by --schools if provided
    school_ids = getattr(args, "schools", None)
    if school_ids:
        ids = {s.strip() for s in school_ids.split(",")}
        schools = [s for s in schools if s.get("id") in ids]
        if not schools:
            print(f"No matching schools found for IDs: {school_ids}")
            sys.exit(1)

    fresh = getattr(args, "fresh", False)
    resume = not fresh

    # Only extract schools that have crawled data
    with_data = [s for s in schools if (RAW_HTML_DIR / s["id"]).exists()]
    print(f"Schools to extract: {len(with_data)} (of {len(schools)} total)")

    extract_all(with_data, resume=resume)
    print("\nExtraction complete.")


def cmd_merge(args: argparse.Namespace) -> None:
    """Stage 4: Merge scraped data into the main database."""
    from scraper.merge import run_merge

    _header("Stage 4: Merge")

    merged = run_merge()
    print(f"\nFinal database: {len(merged)} schools -> {EXISTING_DB_FILE}")


def cmd_all(args: argparse.Namespace) -> None:
    """Run the full pipeline: discover -> resolve -> crawl -> extract -> merge."""
    _header("Full Pipeline")
    print("Running all stages sequentially...\n")

    # Stage 1: Discover
    schools = cmd_discover(args)

    # Stage 1.5: Resolve missing URLs
    cmd_resolve(args)

    # Reload discovery list (may have been updated by resolve)
    discovery = load_json(DISCOVERY_LIST_FILE)
    if isinstance(discovery, dict):
        schools = _schools_dict_to_list(discovery)
    else:
        schools = discovery

    # Stage 2: Crawl
    cmd_crawl(args)

    # Stage 3: Extract
    cmd_extract(args)

    # Stage 4: Merge
    cmd_merge(args)

    _header("Pipeline Complete")
    print("All stages finished successfully.")


def cmd_stats(args: argparse.Namespace) -> None:
    """Show pipeline statistics."""
    _header("Pipeline Statistics")

    # --- Discovery ---
    discovery = load_json(DISCOVERY_LIST_FILE)
    if isinstance(discovery, list):
        disc_count = len(discovery)
        with_website = sum(1 for s in discovery if s.get("website"))
        sources = Counter(s.get("source", "unknown") for s in discovery)
    elif isinstance(discovery, dict):
        disc_count = len(discovery)
        with_website = sum(1 for s in discovery.values() if s.get("website"))
        sources = Counter(s.get("source", "unknown") for s in discovery.values())
    else:
        disc_count = 0
        with_website = 0
        sources = Counter()

    print(f"Discovered schools: {disc_count}")
    print(f"  With website URL: {with_website}")
    print(f"  Missing website:  {disc_count - with_website}")
    if sources:
        print(f"  By source:")
        for src, count in sources.most_common():
            print(f"    {src}: {count}")

    # --- Crawled ---
    crawled_dirs = [d for d in RAW_HTML_DIR.iterdir() if d.is_dir()] if RAW_HTML_DIR.exists() else []
    total_pages = 0
    for d in crawled_dirs:
        total_pages += len(list(d.glob("*.txt")))
    print(f"\nCrawled schools:    {len(crawled_dirs)}")
    print(f"  Total pages:      {total_pages}")

    # --- Extracted ---
    scraped = load_json(SCRAPED_DB_FILE)
    scraped_count = len(scraped) if isinstance(scraped, dict) else 0
    print(f"\nExtracted schools:  {scraped_count}")

    # Confidence distribution
    if scraped and isinstance(scraped, dict):
        confidences = []
        errors = 0
        for sid, data in scraped.items():
            meta = data.get("_meta", {})
            if meta.get("error"):
                errors += 1
                continue
            conf = data.get("confidence") or meta.get("confidence")
            if conf is not None:
                confidences.append(float(conf))

        if confidences:
            print(f"  Confidence distribution:")
            low = sum(1 for c in confidences if c < 0.3)
            mid = sum(1 for c in confidences if 0.3 <= c < 0.7)
            high = sum(1 for c in confidences if c >= 0.7)
            print(f"    Low  (< 0.3):   {low}")
            print(f"    Mid  (0.3-0.7): {mid}")
            print(f"    High (>= 0.7):  {high}")
            avg = sum(confidences) / len(confidences)
            print(f"    Average:        {avg:.2f}")
        if errors:
            print(f"  Extraction errors: {errors}")

    # --- Final DB ---
    final = load_json(EXISTING_DB_FILE)
    final_count = len(final) if isinstance(final, (dict, list)) else 0
    print(f"\nFinal database:     {final_count} schools")
    print(f"\nPaths:")
    print(f"  Discovery list:   {DISCOVERY_LIST_FILE}")
    print(f"  Raw HTML:         {RAW_HTML_DIR}")
    print(f"  Scraped DB:       {SCRAPED_DB_FILE}")
    print(f"  Final DB:         {EXISTING_DB_FILE}")


# ---------------------------------------------------------------------------
# Argument parser
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="scraper",
        description="MBA Admissions AI — Scraper Pipeline CLI",
    )
    parser.add_argument(
        "-v", "--verbose", action="store_true", help="Enable debug logging"
    )
    sub = parser.add_subparsers(dest="command", help="Pipeline stage to run")

    # discover
    p_disc = sub.add_parser("discover", help="Stage 1: discover schools from ranking sites")
    p_disc.add_argument("--fresh", action="store_true", help="Ignore cache, re-scrape rankings")

    # resolve
    p_res = sub.add_parser("resolve", help="Resolve missing website URLs")
    p_res.add_argument("--limit", type=int, default=50, help="Max URLs to resolve (default: 50)")

    # crawl
    p_crawl = sub.add_parser("crawl", help="Stage 2: crawl school websites")
    p_crawl.add_argument("--schools", type=str, help="Comma-separated school IDs to crawl")
    p_crawl.add_argument("--fresh", action="store_true", help="Re-crawl all pages (ignore cache)")

    # extract
    p_ext = sub.add_parser("extract", help="Stage 3: extract data with Claude")
    p_ext.add_argument("--schools", type=str, help="Comma-separated school IDs to extract")
    p_ext.add_argument("--fresh", action="store_true", help="Re-extract all (ignore cache)")

    # merge
    sub.add_parser("merge", help="Stage 4: merge scraped data into DB")

    # all
    p_all = sub.add_parser("all", help="Run full pipeline")
    p_all.add_argument("--fresh", action="store_true", help="Ignore all caches")
    p_all.add_argument("--schools", type=str, help="Comma-separated school IDs")
    p_all.add_argument("--limit", type=int, default=50, help="Max URLs to resolve (default: 50)")

    # stats
    sub.add_parser("stats", help="Show pipeline statistics")

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()

    # Logging setup
    level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(levelname)-8s %(name)s: %(message)s",
    )

    commands = {
        "discover": cmd_discover,
        "resolve": cmd_resolve,
        "crawl": cmd_crawl,
        "extract": cmd_extract,
        "merge": cmd_merge,
        "all": cmd_all,
        "stats": cmd_stats,
    }

    if not args.command:
        parser.print_help()
        sys.exit(1)

    handler = commands.get(args.command)
    if not handler:
        parser.print_help()
        sys.exit(1)

    handler(args)


if __name__ == "__main__":
    main()
