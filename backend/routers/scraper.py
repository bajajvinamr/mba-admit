"""Scraper pipeline status and statistics endpoints."""

import os
import json
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter

from agents import SCHOOL_DB, get_school_data_quality

router = APIRouter(prefix="/api/scraper", tags=["scraper"])

_DATA_DIR = Path(os.path.dirname(os.path.abspath(__file__))).parent / "data"
_RAW_HTML_DIR = _DATA_DIR / "raw_html"
_SCRAPED_DB_PATH = _DATA_DIR / "school_db_scraped.json"
_DISCOVERY_LIST_PATH = _DATA_DIR / "discovery_list.json"


@router.get("/status")
def scraper_status():
    """Pipeline health check: what data exists and when it was last updated."""
    # Discovery list
    discovery_count = 0
    if _DISCOVERY_LIST_PATH.exists():
        try:
            with open(_DISCOVERY_LIST_PATH) as f:
                discovery_count = len(json.load(f))
        except (json.JSONDecodeError, IOError):
            pass

    # Crawled schools
    crawled_schools = []
    if _RAW_HTML_DIR.exists():
        for d in _RAW_HTML_DIR.iterdir():
            if d.is_dir():
                txt_files = list(d.glob("*.txt"))
                if txt_files:
                    crawled_schools.append({
                        "id": d.name,
                        "pages": len(txt_files),
                        "last_crawled": datetime.fromtimestamp(
                            max(f.stat().st_mtime for f in txt_files)
                        ).isoformat(),
                    })

    # Scraped (extracted) data
    scraped_count = 0
    scraped_with_errors = 0
    if _SCRAPED_DB_PATH.exists():
        try:
            with open(_SCRAPED_DB_PATH) as f:
                scraped = json.load(f)
            for sid, data in scraped.items():
                if isinstance(data, dict):
                    meta = data.get("_meta", {})
                    if "error" in data or meta.get("error"):
                        scraped_with_errors += 1
                    else:
                        scraped_count += 1
        except (json.JSONDecodeError, IOError):
            pass

    return {
        "pipeline": {
            "discovery_list_count": discovery_count,
            "crawled_schools": len(crawled_schools),
            "extracted_schools": scraped_count,
            "extraction_errors": scraped_with_errors,
        },
        "crawl_details": sorted(crawled_schools, key=lambda x: x["id"]),
        "database": {
            "total_schools": len(SCHOOL_DB),
            "with_scraped_data": sum(
                1 for sid in SCHOOL_DB
                if get_school_data_quality(sid)["source"] == "scraped"
            ),
            "synthetic_only": sum(
                1 for sid in SCHOOL_DB
                if get_school_data_quality(sid)["source"] == "synthetic"
            ),
        },
    }


@router.get("/stats")
def database_stats():
    """Aggregate statistics about the school database and data quality."""
    total = len(SCHOOL_DB)
    scraped = 0
    verified_field_counts: dict[str, int] = {}
    confidence_sum = 0.0
    confidence_count = 0
    countries: dict[str, int] = {}

    for sid, school in SCHOOL_DB.items():
        dq = get_school_data_quality(sid)
        if dq["source"] == "scraped":
            scraped += 1
            confidence_sum += dq["confidence"]
            confidence_count += 1
            for field in dq.get("verified_fields", []):
                verified_field_counts[field] = verified_field_counts.get(field, 0) + 1

        country = school.get("country", "Unknown")
        countries[country] = countries.get(country, 0) + 1

    # Sort countries by count descending
    top_countries = sorted(countries.items(), key=lambda x: -x[1])[:20]

    return {
        "total_schools": total,
        "scraped_schools": scraped,
        "synthetic_schools": total - scraped,
        "scrape_coverage_pct": round(scraped / total * 100, 1) if total else 0,
        "avg_confidence": round(confidence_sum / confidence_count, 2) if confidence_count else 0,
        "verified_field_coverage": dict(
            sorted(verified_field_counts.items(), key=lambda x: -x[1])
        ),
        "top_countries": dict(top_countries),
    }
