"""Scrape real MBA applicant data from community sources.

Sources:
- GMAT Club: Decision tracker, interview questions, school reviews
- Clear Admit: LiveWire decisions, DecisionWire, ApplyWire
- Reddit r/MBA: Profile reviews, decision threads

This scraper collects REAL applicant outcomes — accepted/rejected/waitlisted —
with stats (GMAT, GPA, work experience) and interview questions. No synthetic data.

Usage:
    python -m scraper.applicant_data [--source gmat_club|clear_admit|reddit] [--extract]
"""
import asyncio
import json
import logging
import os
import re
import time
from datetime import datetime
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=True)

logger = logging.getLogger("scraper.applicant_data")
logging.getLogger("httpx").setLevel(logging.WARNING)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
APPLICANT_DIR = DATA_DIR / "applicant_data"
APPLICANT_DIR.mkdir(parents=True, exist_ok=True)

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

_TAG_RE = re.compile(r"<script[^>]*>.*?</script>|<style[^>]*>.*?</style>", re.DOTALL)
_WS_RE = re.compile(r"\s+")


def _html_to_text(html: str) -> str:
    clean = _TAG_RE.sub("", html)
    clean = re.sub(r"<[^>]+>", " ", clean)
    return _WS_RE.sub(" ", clean).strip()


# ---------------------------------------------------------------------------
# GMAT Club scraper
# ---------------------------------------------------------------------------

# Top 30 schools on GMAT Club decision tracker
GMAT_CLUB_SCHOOLS = {
    "hbs": {"slug": "harvard-business-school", "forum_id": "2"},
    "gsb": {"slug": "stanford-graduate-school-of-business", "forum_id": "3"},
    "wharton": {"slug": "wharton-school-university-of-pennsylvania", "forum_id": "4"},
    "booth": {"slug": "booth-school-of-business", "forum_id": "5"},
    "kellogg": {"slug": "kellogg-school-of-management", "forum_id": "6"},
    "sloan": {"slug": "mit-sloan-school-of-management", "forum_id": "7"},
    "columbia": {"slug": "columbia-business-school", "forum_id": "8"},
    "haas": {"slug": "haas-school-of-business", "forum_id": "9"},
    "tuck": {"slug": "tuck-school-of-business", "forum_id": "10"},
    "ross": {"slug": "ross-school-of-business", "forum_id": "11"},
    "fuqua": {"slug": "fuqua-school-of-business", "forum_id": "12"},
    "darden": {"slug": "darden-school-of-business", "forum_id": "13"},
    "stern": {"slug": "nyu-stern-school-of-business", "forum_id": "14"},
    "yale": {"slug": "yale-school-of-management", "forum_id": "15"},
    "anderson": {"slug": "anderson-school-of-management", "forum_id": "16"},
    "johnson": {"slug": "samuel-curtis-johnson-graduate-school", "forum_id": "17"},
    "tepper": {"slug": "tepper-school-of-business", "forum_id": "18"},
    "mccombs": {"slug": "mccombs-school-of-business", "forum_id": "19"},
    "marshall": {"slug": "marshall-school-of-business", "forum_id": "20"},
    "kelley": {"slug": "kelley-school-of-business", "forum_id": "21"},
    "kenan_flagler": {"slug": "kenan-flagler-business-school", "forum_id": "22"},
    "olin": {"slug": "olin-business-school", "forum_id": "23"},
    "georgetown": {"slug": "mcdonough-school-of-business", "forum_id": "24"},
    "lbs": {"slug": "london-business-school", "forum_id": "25"},
    "insead": {"slug": "insead", "forum_id": "26"},
    "iese": {"slug": "iese-business-school", "forum_id": "27"},
    "hec": {"slug": "hec-paris", "forum_id": "28"},
    "said": {"slug": "said-business-school", "forum_id": "29"},
    "judge": {"slug": "judge-business-school", "forum_id": "30"},
    "imd": {"slug": "imd-business-school", "forum_id": "31"},
}


async def _fetch_page(client: httpx.AsyncClient, url: str) -> str | None:
    """Fetch a page, return text content or None on failure."""
    try:
        resp = await client.get(url, follow_redirects=True)
        if resp.status_code >= 400:
            logger.debug("HTTP %d for %s", resp.status_code, url)
            return None
        return resp.text
    except Exception as exc:
        logger.debug("Fetch failed for %s: %s", url, exc)
        return None


async def scrape_gmat_club_school(
    client: httpx.AsyncClient,
    school_id: str,
    school_info: dict,
    max_pages: int = 5,
) -> dict:
    """Scrape GMAT Club for a single school: decision tracker + interview Qs."""
    slug = school_info["slug"]
    school_dir = APPLICANT_DIR / "gmat_club" / school_id
    school_dir.mkdir(parents=True, exist_ok=True)

    result = {
        "school_id": school_id,
        "source": "gmat_club",
        "decisions": [],
        "interview_questions": [],
        "reviews": [],
        "pages_crawled": 0,
    }

    # 1. Decision tracker — school page
    # GMAT Club decision tracker URLs
    base_url = f"https://gmatclub.com/forum/{slug}-decision-tracker"
    for page_num in range(1, max_pages + 1):
        url = f"{base_url}?page={page_num}" if page_num > 1 else base_url
        html = await _fetch_page(client, url)
        if not html:
            break

        text = _html_to_text(html)
        if len(text.strip()) < 200:
            break

        out_file = school_dir / f"decisions_p{page_num}.txt"
        out_file.write_text(text, encoding="utf-8")
        result["pages_crawled"] += 1
        logger.info("  ✅ %s decisions page %d (%d chars)", school_id, page_num, len(text))

        # Stop if we don't see pagination indicators
        if "next page" not in text.lower() and "page " not in text.lower():
            break
        await asyncio.sleep(1.5)

    # 2. Interview questions page
    interview_url = f"https://gmatclub.com/forum/{slug}-interview-questions"
    html = await _fetch_page(client, interview_url)
    if html:
        text = _html_to_text(html)
        if len(text.strip()) > 200:
            (school_dir / "interview_questions.txt").write_text(text, encoding="utf-8")
            result["pages_crawled"] += 1
            logger.info("  ✅ %s interview questions (%d chars)", school_id, len(text))
    await asyncio.sleep(1)

    # 3. School reviews / admissions stats
    review_url = f"https://gmatclub.com/forum/{slug}-reviews"
    html = await _fetch_page(client, review_url)
    if html:
        text = _html_to_text(html)
        if len(text.strip()) > 200:
            (school_dir / "reviews.txt").write_text(text, encoding="utf-8")
            result["pages_crawled"] += 1
            logger.info("  ✅ %s reviews (%d chars)", school_id, len(text))
    await asyncio.sleep(1)

    # 4. Application tracker stats page
    tracker_url = f"https://gmatclub.com/forum/{slug}-application-tracker"
    html = await _fetch_page(client, tracker_url)
    if html:
        text = _html_to_text(html)
        if len(text.strip()) > 200:
            (school_dir / "application_tracker.txt").write_text(text, encoding="utf-8")
            result["pages_crawled"] += 1
            logger.info("  ✅ %s application tracker (%d chars)", school_id, len(text))

    return result


async def scrape_gmat_club(schools: list[str] | None = None, max_pages: int = 5):
    """Scrape GMAT Club for all (or specified) schools."""
    targets = {
        sid: info for sid, info in GMAT_CLUB_SCHOOLS.items()
        if schools is None or sid in schools
    }

    logger.info("Scraping GMAT Club for %d schools...", len(targets))
    results = []

    async with httpx.AsyncClient(timeout=20.0, headers=_HEADERS) as client:
        for i, (school_id, school_info) in enumerate(targets.items(), 1):
            logger.info("[%d/%d] GMAT Club: %s", i, len(targets), school_id)
            result = await scrape_gmat_club_school(client, school_id, school_info, max_pages)
            results.append(result)
            await asyncio.sleep(2)  # Be respectful

    # Save summary
    summary_file = APPLICANT_DIR / "gmat_club" / "_summary.json"
    summary_file.write_text(
        json.dumps(results, indent=2, default=str),
        encoding="utf-8",
    )
    total_pages = sum(r["pages_crawled"] for r in results)
    logger.info("GMAT Club complete: %d schools, %d pages crawled", len(results), total_pages)
    return results


# ---------------------------------------------------------------------------
# Clear Admit LiveWire / DecisionWire scraper
# ---------------------------------------------------------------------------

CLEAR_ADMIT_PAGES = {
    "livewire": "https://www.clearadmit.com/livewire/",
    "decisionwire": "https://www.clearadmit.com/decisionwire/",
    "applywire": "https://www.clearadmit.com/applywire/",
}


async def scrape_clear_admit_decisions(max_pages: int = 10):
    """Scrape Clear Admit LiveWire/DecisionWire for real decisions."""
    ca_dir = APPLICANT_DIR / "clear_admit"
    ca_dir.mkdir(parents=True, exist_ok=True)

    results = {"pages_crawled": 0, "sources": []}

    async with httpx.AsyncClient(timeout=20.0, headers=_HEADERS) as client:
        for source_name, base_url in CLEAR_ADMIT_PAGES.items():
            logger.info("Clear Admit: scraping %s...", source_name)

            for page_num in range(1, max_pages + 1):
                url = f"{base_url}page/{page_num}/" if page_num > 1 else base_url
                html = await _fetch_page(client, url)
                if not html:
                    break

                text = _html_to_text(html)
                if len(text.strip()) < 300:
                    break

                out_file = ca_dir / f"{source_name}_p{page_num}.txt"
                out_file.write_text(text, encoding="utf-8")
                results["pages_crawled"] += 1
                logger.info("  ✅ %s page %d (%d chars)", source_name, page_num, len(text))

                # Check for "next" or stop
                if "older entries" not in text.lower() and "next" not in text.lower():
                    break
                await asyncio.sleep(2)

            results["sources"].append(source_name)

    summary_file = ca_dir / "_summary.json"
    summary_file.write_text(json.dumps(results, indent=2, default=str), encoding="utf-8")
    logger.info("Clear Admit complete: %d pages crawled", results["pages_crawled"])
    return results


# ---------------------------------------------------------------------------
# Reddit r/MBA scraper (uses old.reddit.com for simpler HTML)
# ---------------------------------------------------------------------------

REDDIT_URLS = [
    # Profile review threads
    ("profile_reviews", "https://old.reddit.com/r/MBA/search?q=profile+review&restrict_sr=on&sort=new&t=year"),
    # Decision threads
    ("decisions", "https://old.reddit.com/r/MBA/search?q=accepted+rejected&restrict_sr=on&sort=new&t=year"),
    # Interview experience threads
    ("interviews", "https://old.reddit.com/r/MBA/search?q=interview+experience&restrict_sr=on&sort=new&t=year"),
    # "Where I got in" threads
    ("results", "https://old.reddit.com/r/MBA/search?q=flair%3A%22Results%22&restrict_sr=on&sort=new&t=year"),
]


async def scrape_reddit_mba(max_pages: int = 5):
    """Scrape Reddit r/MBA for real applicant profiles and decisions."""
    reddit_dir = APPLICANT_DIR / "reddit"
    reddit_dir.mkdir(parents=True, exist_ok=True)

    results = {"pages_crawled": 0, "categories": []}

    # Reddit needs different headers
    reddit_headers = {
        **_HEADERS,
        "User-Agent": "MBA-Admissions-Research/1.0 (educational project)",
    }

    async with httpx.AsyncClient(timeout=20.0, headers=reddit_headers) as client:
        for category, url in REDDIT_URLS:
            logger.info("Reddit r/MBA: scraping %s...", category)
            html = await _fetch_page(client, url)
            if html:
                text = _html_to_text(html)
                if len(text.strip()) > 300:
                    (reddit_dir / f"{category}.txt").write_text(text, encoding="utf-8")
                    results["pages_crawled"] += 1
                    logger.info("  ✅ %s (%d chars)", category, len(text))
            results["categories"].append(category)
            await asyncio.sleep(3)  # Reddit rate limits are strict

    summary_file = reddit_dir / "_summary.json"
    summary_file.write_text(json.dumps(results, indent=2, default=str), encoding="utf-8")
    logger.info("Reddit complete: %d pages crawled", results["pages_crawled"])
    return results


# ---------------------------------------------------------------------------
# Claude extraction for applicant data
# ---------------------------------------------------------------------------

APPLICANT_EXTRACTION_SCHEMA = """{
  "decisions": [
    {
      "gmat_score": 740,
      "gre_score": null,
      "gpa": 3.8,
      "work_experience_years": 5,
      "industry": "Consulting",
      "nationality": "Indian",
      "gender": "Male",
      "undergrad_school_tier": "Tier 1",
      "round": "R1",
      "year": 2025,
      "result": "Accepted",
      "scholarship": "Merit Fellowship $40k",
      "schools_applied": ["HBS", "Stanford GSB", "Wharton"],
      "schools_accepted": ["HBS", "Wharton"],
      "schools_rejected": ["Stanford GSB"],
      "schools_waitlisted": []
    }
  ],
  "interview_questions": [
    {
      "question": "Walk me through your resume",
      "format": "behavioral",
      "reported_by_count": 15,
      "year": 2025
    }
  ],
  "admission_stats": {
    "avg_gmat_accepted": 740,
    "avg_gpa_accepted": 3.7,
    "acceptance_rate_reported": "12%",
    "most_common_industries": ["Consulting", "Tech", "Finance"],
    "avg_work_experience_accepted": 5
  }
}"""

INTERVIEW_EXTRACTION_SCHEMA = """{
  "interview_questions": [
    {
      "question": "Tell me about a time you led a team through a difficult situation",
      "category": "behavioral",
      "frequency": "very_common",
      "tips": "Use STAR format, focus on leadership and impact",
      "year": 2025
    }
  ],
  "interview_format": {
    "duration_minutes": 30,
    "format": "blind/informed",
    "interviewer": "adcom/alumni/student",
    "style": "behavioral/case/conversational",
    "virtual_or_in_person": "both"
  },
  "applicant_tips": [
    "Research the school's values thoroughly",
    "Prepare 3-4 stories using STAR framework"
  ]
}"""


def extract_applicant_data(school_id: str, source: str) -> dict | None:
    """Extract structured applicant data from raw text using Claude."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        logger.error("ANTHROPIC_API_KEY not set")
        return None

    source_dir = APPLICANT_DIR / source / school_id
    if not source_dir.exists():
        logger.warning("No data for %s/%s", source, school_id)
        return None

    # Collect all text files
    all_text = []
    for txt_file in sorted(source_dir.glob("*.txt")):
        content = txt_file.read_text(encoding="utf-8")
        all_text.append(f"=== {txt_file.name} ===\n{content[:8000]}")

    if not all_text:
        return None

    combined = "\n\n".join(all_text)[:25000]

    # Determine which schema to use based on content
    has_interviews = any("interview" in t.name for t in source_dir.glob("*.txt"))

    client = Anthropic()

    prompt = f"""Extract structured MBA applicant data from the following community content.
This is from {source} for {school_id}. Extract ONLY data that is explicitly present — do NOT invent or hallucinate values.

Return valid JSON matching this schema:
{APPLICANT_EXTRACTION_SCHEMA}

{"Also extract interview questions:" + INTERVIEW_EXTRACTION_SCHEMA if has_interviews else ""}

Important:
- Only include data points that are clearly stated in the text
- For decisions, extract each individual applicant's stats and outcome
- For interview questions, note how commonly reported each question is
- Set confidence to 0 for uncertain values
- Use null for missing values, never guess

Raw content:
{combined}"""

    try:
        response = client.messages.create(
            model=os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )

        text = response.content[0].text.strip()
        # Extract JSON from potential markdown code blocks
        json_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
        if json_match:
            text = json_match.group(1).strip()

        data = json.loads(text)

        # Save extraction
        out_file = source_dir / "_extracted.json"
        out_file.write_text(
            json.dumps({"school_id": school_id, "source": source, "data": data,
                        "extracted_at": datetime.now().isoformat()}, indent=2),
            encoding="utf-8",
        )
        logger.info("  ✅ %s/%s extracted", source, school_id)
        return data

    except Exception as exc:
        logger.error("Extraction failed for %s/%s: %s", source, school_id, exc)
        return None


# ---------------------------------------------------------------------------
# CLI entrypoint
# ---------------------------------------------------------------------------

async def main():
    import argparse

    parser = argparse.ArgumentParser(description="Scrape real MBA applicant data")
    parser.add_argument("--source", choices=["gmat_club", "clear_admit", "reddit", "all"],
                        default="all", help="Data source to scrape")
    parser.add_argument("--schools", type=str, default=None,
                        help="Comma-separated school IDs (GMAT Club only)")
    parser.add_argument("--max-pages", type=int, default=5,
                        help="Max pages per school/source")
    parser.add_argument("--extract", action="store_true",
                        help="Run Claude extraction after crawling")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(levelname)-8s %(name)s: %(message)s",
    )

    schools = args.schools.split(",") if args.schools else None
    sources_to_run = (
        ["gmat_club", "clear_admit", "reddit"] if args.source == "all"
        else [args.source]
    )

    print("\n" + "=" * 60)
    print("  MBA Applicant Data Scraper")
    print("=" * 60 + "\n")

    for source in sources_to_run:
        if source == "gmat_club":
            await scrape_gmat_club(schools=schools, max_pages=args.max_pages)
        elif source == "clear_admit":
            await scrape_clear_admit_decisions(max_pages=args.max_pages)
        elif source == "reddit":
            await scrape_reddit_mba(max_pages=args.max_pages)

    if args.extract:
        print("\n" + "=" * 60)
        print("  Extracting applicant data with Claude API")
        print("=" * 60 + "\n")

        for source in sources_to_run:
            source_dir = APPLICANT_DIR / source
            if not source_dir.exists():
                continue

            school_dirs = [d for d in source_dir.iterdir()
                          if d.is_dir() and not d.name.startswith("_")]
            for school_dir in sorted(school_dirs):
                school_id = school_dir.name
                extracted_file = school_dir / "_extracted.json"
                if extracted_file.exists():
                    logger.info("Skipping %s/%s (already extracted)", source, school_id)
                    continue
                extract_applicant_data(school_id, source)
                time.sleep(1)  # Rate limit Claude API

    print("\n✅ Applicant data scraping complete!")
    print(f"   Data saved to: {APPLICANT_DIR}")


if __name__ == "__main__":
    asyncio.run(main())
