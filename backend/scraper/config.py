"""Scraper configuration and constants."""
import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
DATA_DIR = BASE_DIR / "data"
RAW_HTML_DIR = DATA_DIR / "raw_html"
DISCOVERY_LIST_FILE = DATA_DIR / "discovery_list.json"
SCRAPED_DB_FILE = DATA_DIR / "school_db_scraped.json"
EXISTING_DB_FILE = DATA_DIR / "school_db_full.json"

# Crawl settings
CRAWL_DELAY_SEC = 2.0          # Delay between requests to same domain
CRAWL_CONCURRENCY = 15         # Max parallel httpx connections
CRAWL_TIMEOUT_MS = 30_000      # Page load timeout
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

# Extraction settings
ANTHROPIC_MODEL = "claude-sonnet-4-20250514"
EXTRACT_MAX_TOKENS = 4096
EXTRACT_BATCH_SIZE = 5         # Schools per batch for extraction

# Discovery: ranking source URLs
RANKING_SOURCES = {
    "ft_global": "https://rankings.ft.com/rankings/2862/global-mba-ranking-2025",
    "qs_global": "https://www.topuniversities.com/university-rankings/mba-rankings/global/2025",
    "us_news": "https://www.usnews.com/best-graduate-schools/top-business-schools/mba-rankings",
    "poets_quants": "https://poetsandquants.com/ranking/best-mba-programs-top-100-us-business-schools/",
    "aacsb": "https://www.aacsb.edu/accredited",
}

# Pages to crawl per school (URL suffixes to try)
CRAWL_PAGE_PATTERNS = [
    ("admissions", ["/admissions", "/mba/admissions", "/admission", "/apply", "/mba/apply"]),
    ("class_profile", ["/class-profile", "/mba/class-profile", "/student-profile", "/class", "/mba/students"]),
    ("essays", ["/essays", "/mba/essays", "/application-requirements", "/mba/application"]),
    ("employment", ["/employment", "/careers", "/employment-report", "/placement", "/mba/careers"]),
    ("tuition", ["/tuition", "/financial-aid", "/cost", "/mba/tuition", "/mba/financial-aid"]),
    ("deadlines", ["/deadlines", "/mba/deadlines", "/important-dates", "/application-deadlines"]),
]

# Ensure directories exist
RAW_HTML_DIR.mkdir(parents=True, exist_ok=True)
