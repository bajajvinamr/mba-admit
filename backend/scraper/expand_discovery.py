"""Expand the discovery list with schools from the main DB that aren't yet discovered.

This ensures all 890+ real schools in school_db_full.json get URLs resolved,
crawled, extracted, and merged back — not just the 242 from ranking sites.
"""
import json
import logging
from pathlib import Path

from scraper.config import DISCOVERY_LIST_FILE, EXISTING_DB_FILE
from scraper.utils import load_json, save_json, deduplicate_schools

logger = logging.getLogger(__name__)


def expand_discovery_list() -> list[dict]:
    """Add schools from the main DB that aren't in the discovery list yet.

    Returns:
        The updated discovery list.
    """
    # Load existing discovery list
    discovery = load_json(DISCOVERY_LIST_FILE) or []
    if isinstance(discovery, dict):
        discovery = [{"id": k, **v} for k, v in discovery.items()]

    existing_ids = {s.get("id") for s in discovery if s.get("id")}

    # Load main school DB
    db = load_json(EXISTING_DB_FILE)
    if not isinstance(db, dict):
        logger.warning("Main DB not a dict — cannot expand discovery list")
        return discovery

    # Filter to real schools (non-hex IDs)
    added = 0
    for sid, data in db.items():
        if sid in existing_ids:
            continue
        # Skip synthetic hex-hash IDs
        if len(sid) > 6 and all(c in "0123456789abcdef" for c in sid):
            continue

        entry = {
            "id": sid,
            "name": data.get("name", sid),
            "location": data.get("location", ""),
            "country": data.get("country", ""),
            "website": data.get("website", ""),
            "source": "main_db",
        }
        discovery.append(entry)
        added += 1

    # Deduplicate
    discovery = deduplicate_schools(discovery)

    print(f"Expanded discovery list: added {added} schools from main DB")
    print(f"Total discovery list: {len(discovery)} schools")

    # Save
    save_json(discovery, DISCOVERY_LIST_FILE)
    return discovery


if __name__ == "__main__":
    expand_discovery_list()
