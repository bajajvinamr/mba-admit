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

    # ── MBA Crystal Ball ──────────────────────────────────────────────────
    "mba_crystal_ball": {
        "name": "MBA Crystal Ball",
        "base_url": "https://www.mbacrystalball.com",
        "pages": [
            ("top_mba_programs", "/top-mba-programs/"),
            ("mba_rankings", "/mba-rankings/"),
            ("gmat_scores", "/gmat-scores-for-top-mba-programs/"),
            ("acceptance_rates", "/mba-acceptance-rates/"),
            ("deadlines", "/mba-application-deadlines/"),
            ("essays", "/mba-essay-questions/"),
            ("salary_roi", "/mba-salary/"),
            ("mba_india", "/mba-in-india/"),
            ("mba_usa", "/mba-in-usa/"),
            ("mba_europe", "/mba-in-europe/"),
            ("mba_canada", "/mba-in-canada/"),
            ("class_profiles", "/class-profile/"),
            ("scholarship", "/mba-scholarships/"),
            ("interview_tips", "/mba-interview/"),
        ],
    },

    # ── TopMBA (QS owned) ─────────────────────────────────────────────────
    "topmba": {
        "name": "TopMBA",
        "base_url": "https://www.topmba.com",
        "pages": [
            ("mba_rankings", "/mba-rankings"),
            ("emba_rankings", "/emba-rankings"),
            ("salary_stats", "/jobs/salary-trends"),
            ("mba_roi", "/mba-programs/mba-roi"),
            ("scholarships", "/student-info/mba-scholarships"),
            ("gmat_guide", "/gmat/gmat-prep"),
            ("career_guide", "/jobs/career-development"),
            ("mba_fairs", "/events"),
            ("school_profiles_us", "/mba-programs/united-states"),
            ("school_profiles_europe", "/mba-programs/europe"),
            ("school_profiles_asia", "/mba-programs/asia"),
        ],
    },

    # ── BusinessBecause ───────────────────────────────────────────────────
    "businessbecause": {
        "name": "BusinessBecause",
        "base_url": "https://www.businessbecause.com",
        "pages": [
            ("mba_rankings", "/rankings"),
            ("school_hbs", "/schools/harvard-business-school"),
            ("school_gsb", "/schools/stanford-graduate-school-of-business"),
            ("school_wharton", "/schools/wharton-school"),
            ("school_insead", "/schools/insead"),
            ("school_lbs", "/schools/london-business-school"),
            ("school_iese", "/schools/iese-business-school"),
            ("school_hec", "/schools/hec-paris"),
            ("school_cbs", "/schools/columbia-business-school"),
            ("mba_salaries", "/mba-salaries"),
            ("career_outcomes", "/mba-career-prospects"),
            ("application_advice", "/mba-applications"),
            ("essay_tips", "/mba-essay-tips"),
            ("scholarships", "/mba-scholarships"),
        ],
    },

    # ── Accepted.com ──────────────────────────────────────────────────────
    "accepted": {
        "name": "Accepted.com",
        "base_url": "https://www.accepted.com",
        "pages": [
            ("mba_overview", "/mba/"),
            ("school_hbs", "/mba/harvard-business-school/"),
            ("school_gsb", "/mba/stanford-gsb/"),
            ("school_wharton", "/mba/wharton/"),
            ("school_booth", "/mba/chicago-booth/"),
            ("school_kellogg", "/mba/kellogg/"),
            ("school_sloan", "/mba/mit-sloan/"),
            ("school_columbia", "/mba/columbia/"),
            ("deadlines", "/mba/mba-application-deadlines/"),
            ("essays", "/mba/mba-essay-tips/"),
            ("interview_guide", "/mba/mba-interview-guide/"),
            ("waitlist_guide", "/mba/mba-waitlist/"),
            ("reapplicant_guide", "/mba/reapplicant-guide/"),
        ],
    },

    # ── GMAT Club ─────────────────────────────────────────────────────────
    "gmat_club": {
        "name": "GMAT Club",
        "base_url": "https://gmatclub.com",
        "pages": [
            ("school_rankings", "/reviews/ranking"),
            ("school_reviews", "/reviews"),
            ("school_hbs", "/reviews/harvard-business-school-reviews-57"),
            ("school_gsb", "/reviews/stanford-graduate-school-of-business-reviews-58"),
            ("school_wharton", "/reviews/wharton-school-reviews-59"),
            ("school_booth", "/reviews/chicago-booth-reviews-56"),
            ("school_kellogg", "/reviews/kellogg-school-of-management-reviews-54"),
            ("school_insead", "/reviews/insead-reviews-62"),
            ("school_lbs", "/reviews/london-business-school-reviews-63"),
            ("decision_tracker", "/forum/pair-up-with-applicants-buddies-pair-up-tracker-324.html"),
            ("gmat_avg_scores", "/forum/gmat-scores-for-top-mba-programs-264.html"),
        ],
    },

    # ── Beat The GMAT ─────────────────────────────────────────────────────
    "beat_the_gmat": {
        "name": "Beat The GMAT",
        "base_url": "https://www.beatthegmat.com",
        "pages": [
            ("mba_rankings", "/mba-rankings/"),
            ("school_profiles", "/mba-programs/"),
            ("gmat_prep", "/gmat-prep/"),
            ("mba_admissions", "/mba-admissions/"),
            ("mba_essays", "/mba-essays/"),
            ("mba_interviews", "/mba-interview/"),
        ],
    },

    # ── Wall Street Oasis ─────────────────────────────────────────────────
    "wall_street_oasis": {
        "name": "Wall Street Oasis",
        "base_url": "https://www.wallstreetoasis.com",
        "pages": [
            ("mba_rankings", "/resources/mba-rankings"),
            ("school_reviews", "/forum/mba-applicants"),
            ("salary_data", "/resources/mba-salary"),
            ("consulting_salaries", "/resources/consulting-salaries"),
            ("ib_salaries", "/resources/investment-banking-salary"),
        ],
    },

    # ── FindMBA ───────────────────────────────────────────────────────────
    "findmba": {
        "name": "FindMBA",
        "base_url": "https://find-mba.com",
        "pages": [
            ("school_search", "/schools"),
            ("rankings", "/rankings"),
            ("usa_schools", "/schools/united-states"),
            ("uk_schools", "/schools/united-kingdom"),
            ("europe_schools", "/schools/europe"),
            ("asia_schools", "/schools/asia"),
            ("canada_schools", "/schools/canada"),
            ("scholarships", "/scholarships"),
            ("salary_stats", "/salary-statistics"),
        ],
    },

    # ── Studyportals / Mastersportal ──────────────────────────────────────
    "studyportals": {
        "name": "Studyportals (Mastersportal)",
        "base_url": "https://www.mastersportal.com",
        "pages": [
            ("mba_programs", "/study-options/268927835/mbas-business-administration.html"),
            ("mba_usa", "/study-options/268927835/mbas-business-administration-united-states.html"),
            ("mba_uk", "/study-options/268927835/mbas-business-administration-united-kingdom.html"),
            ("mba_europe", "/study-options/268927835/mbas-business-administration-europe.html"),
            ("mba_scholarships", "/scholarships/mba/"),
        ],
    },

    # ── Peterson's ────────────────────────────────────────────────────────
    "petersons": {
        "name": "Peterson's",
        "base_url": "https://www.petersons.com",
        "pages": [
            ("mba_programs", "/graduate-schools/mba-programs"),
            ("top_mba", "/graduate-schools/best-mba-programs"),
            ("online_mba", "/graduate-schools/online-mba-programs"),
            ("scholarship_search", "/scholarship-search"),
        ],
    },

    # ── Economist MBA Rankings ────────────────────────────────────────────
    "economist": {
        "name": "The Economist MBA Ranking",
        "base_url": "https://www.economist.com",
        "pages": [
            ("whichmba", "/whichmba"),
            ("mba_rankings", "/whichmba/mba-rankings"),
        ],
    },

    # ── Forbes MBA Rankings ───────────────────────────────────────────────
    "forbes_mba": {
        "name": "Forbes MBA Ranking",
        "base_url": "https://www.forbes.com",
        "pages": [
            ("best_business_schools", "/lists/best-business-schools/"),
            ("mba_roi", "/sites/business-school/"),
        ],
    },

    # ── InsideIIM ─────────────────────────────────────────────────────────
    "insideiim": {
        "name": "InsideIIM",
        "base_url": "https://insideiim.com",
        "pages": [
            ("top_mba_india", "/top-mba-colleges-in-india/"),
            ("iim_rankings", "/iim-rankings/"),
            ("placements", "/mba-placements/"),
            ("cat_colleges", "/top-mba-colleges-accepting-cat-score/"),
            ("salary_data", "/mba-salary/"),
            ("iim_ahmedabad", "/colleges/iim-ahmedabad/"),
            ("iim_bangalore", "/colleges/iim-bangalore/"),
            ("iim_calcutta", "/colleges/iim-calcutta/"),
            ("isb", "/colleges/isb/"),
            ("xlri", "/colleges/xlri-jamshedpur/"),
        ],
    },

    # ── Pagalguy ──────────────────────────────────────────────────────────
    "pagalguy": {
        "name": "Pagalguy",
        "base_url": "https://www.pagalguy.com",
        "pages": [
            ("mba_colleges", "/mba-colleges-india"),
            ("iim_rankings", "/iim-rankings"),
            ("cat_prep", "/cat"),
            ("placements", "/mba-placements"),
            ("top_50_india", "/top-50-mba-colleges-india"),
        ],
    },

    # ── Shiksha MBA ───────────────────────────────────────────────────────
    "shiksha": {
        "name": "Shiksha MBA",
        "base_url": "https://www.shiksha.com",
        "pages": [
            ("mba_colleges", "/mba/colleges"),
            ("mba_rankings", "/mba/ranking"),
            ("mba_placements", "/mba/placements"),
            ("mba_fees", "/mba/fees"),
            ("cat_colleges", "/mba/cat-colleges"),
            ("abroad_mba", "/studyabroad/mba"),
        ],
    },

    # ── Career Launcher / CL Education ────────────────────────────────────
    "career_launcher": {
        "name": "Career Launcher MBA",
        "base_url": "https://www.interscholar.com",
        "pages": [
            ("top_mba", "/mba-colleges"),
            ("mba_rankings", "/mba-rankings"),
            ("placements", "/mba-placements"),
        ],
    },

    # ── ApplicantLab ──────────────────────────────────────────────────────
    "applicantlab": {
        "name": "ApplicantLab",
        "base_url": "https://www.applicantlab.com",
        "pages": [
            ("blog", "/blog/"),
            ("essay_tips", "/blog/category/mba-essay-tips/"),
            ("interview_tips", "/blog/category/mba-interview/"),
            ("school_hbs", "/blog/tag/harvard-business-school/"),
            ("school_gsb", "/blog/tag/stanford-gsb/"),
            ("school_wharton", "/blog/tag/wharton/"),
            ("deadlines", "/blog/category/mba-application-deadlines/"),
            ("strategy", "/blog/category/mba-application-strategy/"),
        ],
    },

    # ── Unimy ─────────────────────────────────────────────────────────────
    "unimy": {
        "name": "Unimy",
        "base_url": "https://unimy.com",
        "pages": [
            ("mba_programs", "/mba"),
            ("mba_rankings", "/rankings/mba"),
            ("compare", "/compare/mba"),
        ],
    },

    # ── Fishbowl ──────────────────────────────────────────────────────────
    "fishbowl": {
        "name": "Fishbowl App",
        "base_url": "https://www.fishbowlapp.com",
        "pages": [
            ("mba_bowl", "/bowl/mba"),
            ("consulting", "/bowl/consulting"),
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
# Playwright crawl engine (for JS-heavy sites)
# ---------------------------------------------------------------------------

async def crawl_site_playwright(
    site_id: str,
    site_config: dict,
    resume: bool = True,
) -> dict[str, int]:
    """Crawl all pages for a single info site using Playwright headless Chromium.

    Designed for JS-heavy sites where httpx returns empty or broken content.
    Returns stats: {"crawled": N, "skipped": N, "failed": N}
    """
    from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout

    site_dir = INFO_SITES_DIR / site_id
    site_dir.mkdir(parents=True, exist_ok=True)
    base_url = site_config["base_url"]
    pages = site_config["pages"]
    stats = {"crawled": 0, "skipped": 0, "failed": 0}

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=_HEADERS["User-Agent"],
            locale="en-US",
            viewport={"width": 1280, "height": 720},
        )

        try:
            page = await context.new_page()

            for page_name, path in pages:
                # Resume support: skip already-crawled pages
                txt_path = site_dir / f"{page_name}.txt"
                if resume and txt_path.exists():
                    stats["skipped"] += 1
                    continue

                url = f"{base_url}{path}"
                try:
                    await asyncio.sleep(2)  # polite delay between pages
                    response = await page.goto(url, timeout=30_000, wait_until="networkidle")

                    if response is None or response.status >= 400:
                        status = response.status if response else "no response"
                        logger.debug("%s/%s: HTTP %s", site_id, page_name, status)
                        stats["failed"] += 1
                        continue

                    html = await page.content()
                    text = _html_to_text(html)

                    if len(text.strip()) < 100:
                        logger.debug(
                            "%s/%s: too little content (%d chars)",
                            site_id, page_name, len(text),
                        )
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
                    meta["crawler"] = "playwright"
                    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")

                    stats["crawled"] += 1
                    logger.info("  [pw] %s/%s: %d chars", site_id, page_name, len(text))

                except PlaywrightTimeout:
                    logger.warning("  [pw] %s/%s: timeout (30s)", site_id, page_name)
                    stats["failed"] += 1
                except Exception as exc:
                    logger.warning("  [pw] %s/%s: %s", site_id, page_name, exc)
                    stats["failed"] += 1

        finally:
            await browser.close()

    return stats


async def crawl_js_sites(
    sites: list[str] | None = None,
    resume: bool = True,
    max_concurrent: int = 3,
) -> None:
    """Crawl JS-heavy MBA info sites using Playwright.

    Args:
        sites: List of site IDs to crawl. If None, defaults to sites that
               yielded 0 pages from the httpx crawl (i.e. empty site dirs).
        resume: Skip already-crawled pages.
        max_concurrent: Max number of concurrent browser instances.
    """
    if sites is None:
        # Default: sites whose directories are missing or have zero .txt files
        sites = []
        for site_id in MBA_INFO_SITES:
            site_dir = INFO_SITES_DIR / site_id
            crawled = len(list(site_dir.glob("*.txt"))) if site_dir.exists() else 0
            if crawled == 0:
                sites.append(site_id)
        if not sites:
            logger.info("[pw] All sites already have content — nothing to crawl.")
            return
        logger.info(
            "[pw] Auto-detected %d sites with 0 pages: %s",
            len(sites), ", ".join(sites),
        )

    semaphore = asyncio.Semaphore(max_concurrent)

    async def _crawl_with_sem(site_id: str, config: dict) -> tuple[str, dict[str, int]]:
        async with semaphore:
            logger.info("[pw] Starting %s (%s)...", config["name"], site_id)
            stats = await crawl_site_playwright(site_id, config, resume=resume)
            return site_id, stats

    tasks = []
    for site_id in sites:
        config = MBA_INFO_SITES.get(site_id)
        if not config:
            logger.warning("Unknown site: %s", site_id)
            continue
        tasks.append(_crawl_with_sem(site_id, config))

    total_stats = {"crawled": 0, "skipped": 0, "failed": 0}
    results = await asyncio.gather(*tasks, return_exceptions=True)

    for result in results:
        if isinstance(result, Exception):
            logger.error("[pw] Task failed: %s", result)
            continue
        site_id, stats = result
        for k in total_stats:
            total_stats[k] += stats[k]
        logger.info(
            "  [pw] %s: crawled=%d, skipped=%d, failed=%d",
            site_id, stats["crawled"], stats["skipped"], stats["failed"],
        )

    logger.info(
        "[pw] Playwright crawl complete: crawled=%d, skipped=%d, failed=%d",
        total_stats["crawled"], total_stats["skipped"], total_stats["failed"],
    )


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
    parser.add_argument("--playwright", action="store_true",
                        help="Use Playwright (headless Chromium) instead of httpx for JS-heavy sites")
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
    if args.playwright:
        asyncio.run(crawl_js_sites(sites=sites, resume=not args.fresh))
    else:
        asyncio.run(crawl_all_sites(sites=sites, resume=not args.fresh))

    # Optional extraction
    if args.extract:
        target = sites or list(MBA_INFO_SITES.keys())
        for site_id in target:
            asyncio.run(extract_site_data(site_id))


if __name__ == "__main__":
    main()
