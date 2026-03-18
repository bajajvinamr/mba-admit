"""MBA information site scrapers — httpx-based, no browser overhead.

Scrapes the top 10 MBA information sites for rankings, school profiles,
deadlines, salary data, and application tips. Uses Claude API for
structured extraction from raw HTML.

Usage:
    python -m scraper.info_sites [--sites poets_quants,clear_admit] [--extract]
"""
import asyncio
import json
import logging
import re
from datetime import datetime
from pathlib import Path

import httpx

logger = logging.getLogger("scraper.info_sites")
logging.getLogger("httpx").setLevel(logging.WARNING)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
INFO_SITES_DIR = DATA_DIR / "info_sites"
INFO_SITES_DIR.mkdir(parents=True, exist_ok=True)

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
}

_TAG_RE = re.compile(r"<script[^>]*>.*?</script>|<style[^>]*>.*?</style>", re.DOTALL)
_WS_RE = re.compile(r"\s+")


def _html_to_text(html: str) -> str:
    """Strip scripts/styles, then tags, to get visible text."""
    clean = _TAG_RE.sub("", html)
    clean = re.sub(r"<[^>]+>", " ", clean)
    return _WS_RE.sub(" ", clean).strip()


# ---------------------------------------------------------------------------
# Site-specific URL generators
# ---------------------------------------------------------------------------

# Each site returns: list of (page_name, url) tuples to crawl.
# After crawling, the raw HTML is saved and optionally extracted via Claude API.

MBA_INFO_SITES: dict[str, dict] = {
    "poets_quants": {
        "name": "Poets & Quants",
        "base_url": "https://poetsandquants.com",
        "pages": [
            ("rankings_2025", "/ranking/best-mba-programs-top-100-us-business-schools/"),
            ("rankings_intl", "/ranking/best-international-mba-programs/"),
            ("rankings_online", "/ranking/best-online-mba-programs/"),
            # School profiles — top 25
            ("profile_hbs", "/school-profiles/harvard-business-school/"),
            ("profile_gsb", "/school-profiles/stanford-gsb/"),
            ("profile_wharton", "/school-profiles/wharton-school/"),
            ("profile_booth", "/school-profiles/booth-school-of-business/"),
            ("profile_kellogg", "/school-profiles/kellogg-school-of-management/"),
            ("profile_sloan", "/school-profiles/mit-sloan-school-of-management/"),
            ("profile_columbia", "/school-profiles/columbia-business-school/"),
            ("profile_haas", "/school-profiles/haas-school-of-business/"),
            ("profile_tuck", "/school-profiles/tuck-school-of-business/"),
            ("profile_ross", "/school-profiles/ross-school-of-business/"),
            ("profile_fuqua", "/school-profiles/fuqua-school-of-business/"),
            ("profile_darden", "/school-profiles/darden-school-of-business/"),
            ("profile_stern", "/school-profiles/stern-school-of-business/"),
            ("profile_yale", "/school-profiles/yale-school-of-management/"),
            ("profile_anderson", "/school-profiles/anderson-school-of-management/"),
            ("profile_johnson", "/school-profiles/johnson-graduate-school-of-management/"),
            ("profile_tepper", "/school-profiles/tepper-school-of-business/"),
            ("profile_mccombs", "/school-profiles/mccombs-school-of-business/"),
            ("profile_marshall", "/school-profiles/marshall-school-of-business/"),
            ("profile_kelley", "/school-profiles/kelley-school-of-business/"),
            # Application tips
            ("essay_tips", "/category/essays/"),
            ("interview_tips", "/category/interview/"),
            ("deadlines", "/category/mba-admissions/deadlines/"),
        ],
    },

    "clear_admit": {
        "name": "Clear Admit",
        "base_url": "https://www.clearadmit.com",
        "pages": [
            # School guides — most valuable pages
            ("guide_hbs", "/school-guides/harvard-business-school/"),
            ("guide_gsb", "/school-guides/stanford-gsb/"),
            ("guide_wharton", "/school-guides/wharton/"),
            ("guide_booth", "/school-guides/chicago-booth/"),
            ("guide_kellogg", "/school-guides/kellogg/"),
            ("guide_sloan", "/school-guides/mit-sloan/"),
            ("guide_columbia", "/school-guides/columbia-business-school/"),
            ("guide_haas", "/school-guides/berkeley-haas/"),
            ("guide_tuck", "/school-guides/tuck/"),
            ("guide_ross", "/school-guides/michigan-ross/"),
            ("guide_fuqua", "/school-guides/duke-fuqua/"),
            ("guide_darden", "/school-guides/uva-darden/"),
            ("guide_stern", "/school-guides/nyu-stern/"),
            ("guide_yale", "/school-guides/yale-som/"),
            ("guide_anderson", "/school-guides/ucla-anderson/"),
            ("guide_lbs", "/school-guides/london-business-school/"),
            ("guide_insead", "/school-guides/insead/"),
            ("guide_hec", "/school-guides/hec-paris/"),
            ("guide_iese", "/school-guides/iese/"),
            ("guide_said", "/school-guides/oxford-said/"),
            # LiveWire (recent decisions)
            ("livewire", "/livewire/"),
            # Rankings
            ("rankings", "/mba-rankings/"),
            # Interview reports
            ("interviews_hbs", "/school-guides/harvard-business-school/interview-reports/"),
            ("interviews_gsb", "/school-guides/stanford-gsb/interview-reports/"),
            ("interviews_wharton", "/school-guides/wharton/interview-reports/"),
            ("interviews_booth", "/school-guides/chicago-booth/interview-reports/"),
        ],
    },

    "us_news": {
        "name": "US News MBA Rankings",
        "base_url": "https://www.usnews.com",
        "pages": [
            ("rankings_main", "/best-graduate-schools/top-business-schools/mba-rankings"),
            ("rankings_parttime", "/best-graduate-schools/top-business-schools/part-time-rankings"),
            ("rankings_online", "/best-graduate-schools/top-business-schools/online-mba-rankings"),
            ("methodology", "/education/best-graduate-schools/articles/business-school-rankings-methodology"),
        ],
    },

    "financial_times": {
        "name": "Financial Times MBA Rankings",
        "base_url": "https://rankings.ft.com",
        "pages": [
            ("global_mba_2025", "/rankings/2862/global-mba-ranking-2025"),
            ("emba_2024", "/rankings/2799/executive-mba-ranking-2024"),
            ("mim_2024", "/rankings/2864/masters-in-management-2024"),
        ],
    },

    "qs_rankings": {
        "name": "QS Top Universities MBA Rankings",
        "base_url": "https://www.topuniversities.com",
        "pages": [
            ("global_mba", "/university-rankings/mba-rankings/global/2025"),
            ("us_canada", "/university-rankings/mba-rankings/north-america/2025"),
            ("europe", "/university-rankings/mba-rankings/europe/2025"),
            ("asia", "/university-rankings/mba-rankings/asia/2025"),
            ("roi", "/university-rankings/mba-rankings/return-on-investment/2025"),
            ("employability", "/university-rankings/mba-rankings/employability/2025"),
        ],
    },

    "mba_com": {
        "name": "MBA.com (GMAC)",
        "base_url": "https://www.mba.com",
        "pages": [
            ("find_programs", "/find-programs"),
            ("salary_data", "/explore-programs/salary-and-roi"),
            ("application_tips", "/explore-programs/admissions-tips"),
            ("gmat_overview", "/exams/gmat-exam"),
            ("school_search", "/find-programs/search"),
        ],
    },

    "menlo_coaching": {
        "name": "Menlo Coaching",
        "base_url": "https://menlocoaching.com",
        "pages": [
            # School profiles with detailed stats
            ("profile_hbs", "/mba-application/harvard-business-school/"),
            ("profile_gsb", "/mba-application/stanford-gsb/"),
            ("profile_wharton", "/mba-application/wharton/"),
            ("profile_booth", "/mba-application/chicago-booth/"),
            ("profile_kellogg", "/mba-application/kellogg/"),
            ("profile_sloan", "/mba-application/mit-sloan/"),
            ("profile_columbia", "/mba-application/columbia/"),
            ("profile_haas", "/mba-application/berkeley-haas/"),
            ("profile_tuck", "/mba-application/tuck/"),
            ("profile_ross", "/mba-application/michigan-ross/"),
            ("profile_fuqua", "/mba-application/duke-fuqua/"),
            ("profile_stern", "/mba-application/nyu-stern/"),
            ("profile_yale", "/mba-application/yale-som/"),
            ("profile_anderson", "/mba-application/ucla-anderson/"),
            # Deadlines
            ("deadlines_2025", "/mba-application/mba-application-deadlines/"),
            # Essays
            ("essays_2025", "/mba-application/mba-essay-questions/"),
            # Class profiles
            ("class_profiles", "/mba-application/class-profile-comparison/"),
            # Acceptance rates
            ("acceptance_rates", "/mba-application/mba-acceptance-rates/"),
            # GMAT scores
            ("gmat_scores", "/mba-application/average-gmat-scores/"),
        ],
    },

    "stacy_blackman": {
        "name": "Stacy Blackman Consulting",
        "base_url": "https://stacyblackman.com",
        "pages": [
            ("school_hbs", "/schools/harvard-business-school/"),
            ("school_gsb", "/schools/stanford-gsb/"),
            ("school_wharton", "/schools/wharton/"),
            ("school_booth", "/schools/chicago-booth/"),
            ("school_kellogg", "/schools/kellogg/"),
            ("school_sloan", "/schools/mit-sloan/"),
            ("school_columbia", "/schools/columbia-business-school/"),
            ("deadlines", "/mba-deadlines/"),
            ("essay_tips", "/mba-essay-tips/"),
            ("interview_guide", "/mba-interview-guide/"),
        ],
    },

    "fortuna": {
        "name": "Fortuna Admissions",
        "base_url": "https://www.fortunaadmissions.com",
        "pages": [
            ("school_hbs", "/business-school-profiles/harvard-business-school-hbs/"),
            ("school_gsb", "/business-school-profiles/stanford-graduate-school-of-business-gsb/"),
            ("school_wharton", "/business-school-profiles/wharton-school-university-of-pennsylvania/"),
            ("school_insead", "/business-school-profiles/insead/"),
            ("school_lbs", "/business-school-profiles/london-business-school-lbs/"),
            ("deadlines", "/deadlines/"),
            ("essays", "/essay-tips/"),
        ],
    },

    "bloomberg_bw": {
        "name": "Bloomberg Businessweek",
        "base_url": "https://www.bloomberg.com",
        "pages": [
            ("rankings", "/business-schools/rankings/"),
            ("best_bschools", "/business-schools/"),
        ],
    },
}


# ---------------------------------------------------------------------------
# Crawl engine
# ---------------------------------------------------------------------------

async def crawl_site(
    client: httpx.AsyncClient,
    site_id: str,
    site_config: dict,
    resume: bool = True,
) -> dict[str, int]:
    """Crawl all pages for a single info site.

    Returns stats: {"crawled": N, "skipped": N, "failed": N}
    """
    site_dir = INFO_SITES_DIR / site_id
    site_dir.mkdir(parents=True, exist_ok=True)
    base_url = site_config["base_url"]
    pages = site_config["pages"]
    stats = {"crawled": 0, "skipped": 0, "failed": 0}

    for page_name, path in pages:
        # Resume support: skip already-crawled pages
        txt_path = site_dir / f"{page_name}.txt"
        if resume and txt_path.exists():
            stats["skipped"] += 1
            continue

        url = f"{base_url}{path}"
        try:
            await asyncio.sleep(1.5)  # polite delay
            resp = await client.get(url)

            if resp.status_code >= 400:
                logger.debug("%s/%s: HTTP %d", site_id, page_name, resp.status_code)
                stats["failed"] += 1
                continue

            html = resp.text
            text = _html_to_text(html)

            if len(text.strip()) < 100:
                logger.debug("%s/%s: too little content (%d chars)", site_id, page_name, len(text))
                stats["failed"] += 1
                continue

            # Save HTML + text
            (site_dir / f"{page_name}.html").write_text(html, encoding="utf-8")
            txt_path.write_text(text, encoding="utf-8")

            # Save metadata
            meta_path = site_dir / "meta.json"
            meta: dict = {}
            if meta_path.exists():
                meta = json.loads(meta_path.read_text(encoding="utf-8"))
            meta.setdefault("urls", {})
            meta["urls"][page_name] = url
            meta["crawled_at"] = datetime.now().isoformat()
            meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")

            stats["crawled"] += 1
            logger.info("  ✅ %s/%s: %d chars", site_id, page_name, len(text))

        except Exception as exc:
            logger.warning("  ❌ %s/%s: %s", site_id, page_name, exc)
            stats["failed"] += 1

    return stats


async def crawl_all_sites(
    sites: list[str] | None = None,
    resume: bool = True,
) -> None:
    """Crawl all (or selected) MBA info sites."""
    target_sites = sites or list(MBA_INFO_SITES.keys())

    async with httpx.AsyncClient(
        timeout=20.0,
        follow_redirects=True,
        headers=_HEADERS,
        verify=False,
        limits=httpx.Limits(max_connections=5, max_keepalive_connections=3),
    ) as client:
        total_stats = {"crawled": 0, "skipped": 0, "failed": 0}

        for i, site_id in enumerate(target_sites):
            config = MBA_INFO_SITES.get(site_id)
            if not config:
                logger.warning("Unknown site: %s", site_id)
                continue

            logger.info("[%d/%d] Crawling %s (%s)...",
                        i + 1, len(target_sites), config["name"], site_id)

            stats = await crawl_site(client, site_id, config, resume=resume)

            for k in total_stats:
                total_stats[k] += stats[k]

            logger.info("  %s: crawled=%d, skipped=%d, failed=%d",
                        site_id, stats["crawled"], stats["skipped"], stats["failed"])

    logger.info("🏁 Info sites complete: crawled=%d, skipped=%d, failed=%d",
                total_stats["crawled"], total_stats["skipped"], total_stats["failed"])


# ---------------------------------------------------------------------------
# Extraction (Claude API)
# ---------------------------------------------------------------------------

EXTRACTION_PROMPTS: dict[str, str] = {
    "rankings": """Extract MBA school rankings from this page. For each school, extract:
- rank (integer)
- school_name (string)
- country (string)
- gmat_avg (integer, if available)
- salary_after_3_years (string, if available)
- acceptance_rate (string/percentage, if available)
- tuition (string, if available)
- program_duration (string, if available)

Return as JSON array. Include ALL schools listed.""",

    "school_profile": """Extract detailed MBA school profile data:
- school_name
- class_size
- avg_gmat (or gmat_range)
- avg_gpa (or gpa_range)
- avg_work_experience_years
- acceptance_rate
- yield_rate
- women_percentage
- international_percentage
- tuition_total
- mean_starting_salary
- median_signing_bonus
- top_industries (list)
- top_employers (list)
- essay_prompts (list of current year prompts)
- application_deadlines (list of {round, deadline_date})
- key_differentiators (2-3 sentences)

Return as JSON object. Only include fields you can find.""",

    "deadlines": """Extract MBA application deadlines. For each school, extract:
- school_name
- round_1_deadline (date string)
- round_2_deadline (date string)
- round_3_deadline (date string, if any)
- decision_date_r1
- decision_date_r2
- decision_date_r3
- year (application year/season)

Return as JSON array.""",

    "essay_prompts": """Extract MBA essay prompts/questions. For each school, extract:
- school_name
- year (e.g., "2025-2026")
- prompts: list of {prompt_text, word_limit, required (bool)}

Return as JSON array.""",

    "salary_data": """Extract post-MBA salary data. For each school (or overall), extract:
- school_name (or "overall" for aggregate data)
- median_base_salary
- mean_base_salary
- median_signing_bonus
- salary_range
- top_industries_by_salary (list)
- top_functions_by_salary (list)
- employment_rate_at_graduation
- employment_rate_3_months

Return as JSON array.""",

    "interview_report": """Extract MBA interview tips and reports. For each school, extract:
- school_name
- interview_format (e.g., "blind", "team-based", "behavioral")
- typical_length (minutes)
- common_questions (list of strings)
- tips (list of strings)
- difficulty_level (easy/medium/hard)

Return as JSON array.""",
}


async def extract_site_data(site_id: str, use_api: bool = True) -> dict:
    """Extract structured data from crawled info site pages using Claude API.

    Requires ANTHROPIC_API_KEY in environment.
    """
    site_dir = INFO_SITES_DIR / site_id
    if not site_dir.exists():
        logger.warning("No crawled data for %s — crawl first", site_id)
        return {}

    if not use_api:
        logger.info("Skipping extraction for %s (use_api=False)", site_id)
        return {}

    import os
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        logger.error("ANTHROPIC_API_KEY not set — cannot extract")
        return {}

    import anthropic
    client = anthropic.Anthropic(api_key=api_key)

    results = {}

    for txt_file in sorted(site_dir.glob("*.txt")):
        page_name = txt_file.stem
        text = txt_file.read_text(encoding="utf-8")

        # Determine extraction type based on page name
        if "ranking" in page_name:
            prompt_type = "rankings"
        elif "profile" in page_name or "guide" in page_name or "school" in page_name:
            prompt_type = "school_profile"
        elif "deadline" in page_name:
            prompt_type = "deadlines"
        elif "essay" in page_name:
            prompt_type = "essay_prompts"
        elif "salary" in page_name or "roi" in page_name:
            prompt_type = "salary_data"
        elif "interview" in page_name:
            prompt_type = "interview_report"
        else:
            prompt_type = "school_profile"  # default

        extraction_prompt = EXTRACTION_PROMPTS.get(prompt_type, EXTRACTION_PROMPTS["school_profile"])

        # Truncate text to fit context window (keep first 15K chars)
        truncated = text[:15000]

        try:
            logger.info("  Extracting %s/%s (type=%s)...", site_id, page_name, prompt_type)
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                messages=[{
                    "role": "user",
                    "content": f"{extraction_prompt}\n\n---\n\nPage content:\n{truncated}",
                }],
            )

            raw_text = response.content[0].text

            # Try to parse JSON from the response
            json_match = re.search(r"```json\s*(.*?)\s*```", raw_text, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group(1))
            else:
                # Try parsing the whole response as JSON
                parsed = json.loads(raw_text)

            results[page_name] = {
                "type": prompt_type,
                "data": parsed,
                "extracted_at": datetime.now().isoformat(),
            }

            # Save individual extraction
            out_path = site_dir / f"{page_name}_extracted.json"
            out_path.write_text(json.dumps(results[page_name], indent=2, ensure_ascii=False))

            logger.info("  ✅ %s/%s extracted successfully", site_id, page_name)

        except json.JSONDecodeError:
            logger.warning("  ⚠️ %s/%s: could not parse JSON from extraction", site_id, page_name)
            # Save raw response for debugging
            raw_path = site_dir / f"{page_name}_raw_extraction.txt"
            raw_path.write_text(raw_text, encoding="utf-8")

        except Exception as exc:
            logger.error("  ❌ %s/%s extraction failed: %s", site_id, page_name, exc)

    # Save combined results
    combined_path = site_dir / "extracted_combined.json"
    combined_path.write_text(json.dumps(results, indent=2, ensure_ascii=False))

    return results


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    import argparse
    logging.basicConfig(
        level=logging.INFO,
        format="%(levelname)-8s %(name)s: %(message)s",
    )

    parser = argparse.ArgumentParser(description="Scrape top MBA information sites")
    parser.add_argument("--sites", type=str, help="Comma-separated site IDs")
    parser.add_argument("--extract", action="store_true", help="Run Claude API extraction after crawl")
    parser.add_argument("--fresh", action="store_true", help="Re-crawl all pages (ignore cache)")
    parser.add_argument("--list", action="store_true", help="List available sites")
    args = parser.parse_args()

    if args.list:
        print("\nAvailable MBA info sites:")
        print("-" * 60)
        for site_id, config in MBA_INFO_SITES.items():
            pages_count = len(config["pages"])
            site_dir = INFO_SITES_DIR / site_id
            crawled = len(list(site_dir.glob("*.txt"))) if site_dir.exists() else 0
            print(f"  {site_id:20s} {config['name']:30s} {crawled}/{pages_count} pages")
        return

    sites = args.sites.split(",") if args.sites else None

    # Crawl
    asyncio.run(crawl_all_sites(sites=sites, resume=not args.fresh))

    # Optional extraction
    if args.extract:
        target = sites or list(MBA_INFO_SITES.keys())
        for site_id in target:
            asyncio.run(extract_site_data(site_id))


if __name__ == "__main__":
    main()
