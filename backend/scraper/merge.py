"""Merge scraped school data into the existing database."""
import copy
from pathlib import Path

from scraper.config import EXISTING_DB_FILE, SCRAPED_DB_FILE
from scraper.utils import load_json, save_json


def merge_school_data(existing: dict, scraped: dict) -> dict:
    """Merge scraped data into existing school database.

    Rules:
        - Scraped non-null values overwrite existing values.
        - Existing values are preserved when the scraped value is null.
        - New schools from scraping are added wholesale.
        - data_quality metadata always comes from scraped.
    """
    merged = copy.deepcopy(existing)

    for school_id, scraped_fields in scraped.items():
        if school_id not in merged:
            # New school — add everything
            merged[school_id] = copy.deepcopy(scraped_fields)
            continue

        # Existing school — selective overwrite
        for key, value in scraped_fields.items():
            if key == "data_quality":
                # Always take data_quality from scraped
                merged[school_id][key] = copy.deepcopy(value)
            elif value is not None:
                merged[school_id][key] = copy.deepcopy(value)
            # If value is None, keep whatever exists

    return merged


def run_merge(output_path: Path | None = None) -> dict:
    """Load existing + scraped JSON, merge, save, and print stats.

    Args:
        output_path: Where to write the merged DB. Defaults to EXISTING_DB_FILE.

    Returns:
        The merged school dict.
    """
    output_path = output_path or EXISTING_DB_FILE

    existing = load_json(EXISTING_DB_FILE)
    scraped = load_json(SCRAPED_DB_FILE)

    if not scraped:
        print("No scraped data found — nothing to merge.")
        return existing

    merged = merge_school_data(existing, scraped)

    # Stats
    existing_ids = set(existing.keys())
    scraped_ids = set(scraped.keys())
    new_schools = scraped_ids - existing_ids
    updated_schools = scraped_ids & existing_ids

    print(f"Merge complete:")
    print(f"  Existing schools: {len(existing_ids)}")
    print(f"  Scraped schools:  {len(scraped_ids)}")
    print(f"  New additions:    {len(new_schools)}")
    print(f"  Updated:          {len(updated_schools)}")
    print(f"  Final total:      {len(merged)}")

    save_json(merged, output_path)
    return merged


if __name__ == "__main__":
    run_merge()
