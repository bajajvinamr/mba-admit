"""Shared utilities for scraper pipeline."""
import re
import json
from pathlib import Path
from rapidfuzz import fuzz


def normalize_school_name(name: str) -> str:
    """Normalize school name for dedup matching."""
    name = name.lower().strip()
    name = re.sub(r"[^a-z0-9\s]", "", name)
    for prefix in ["the ", "school of "]:
        if name.startswith(prefix):
            name = name[len(prefix):]
    return " ".join(name.split())


def deduplicate_schools(schools: list[dict], threshold: int = 80) -> list[dict]:
    """Deduplicate school list using fuzzy matching on name + location."""
    seen = []
    result = []

    for school in schools:
        norm = normalize_school_name(school["name"])
        is_dup = False
        for i, (existing_norm, existing_school) in enumerate(seen):
            score = fuzz.token_sort_ratio(norm, existing_norm)
            if score >= threshold:
                if school.get("location", "").split(",")[0].lower().strip() == \
                   existing_school.get("location", "").split(",")[0].lower().strip():
                    score = 100
                if score >= threshold:
                    if len(school) > len(existing_school):
                        seen[i] = (norm, school)
                        result[i] = school
                    for key in ["ft_rank", "qs_rank", "usn_rank", "pq_rank"]:
                        if key in school and key not in result[i]:
                            result[i][key] = school[key]
                    is_dup = True
                    break

        if not is_dup:
            seen.append((norm, school))
            result.append(school)

    return result


def slugify(name: str) -> str:
    """Convert school name to filesystem-safe ID."""
    s = name.lower().strip()
    s = re.sub(r"[^a-z0-9\s]", "", s)
    s = re.sub(r"\s+", "_", s)
    return s[:60]


def save_json(data, path: Path):
    """Save data as formatted JSON."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  Saved {path} ({len(data) if isinstance(data, (list, dict)) else '?'} entries)")


def load_json(path: Path) -> dict | list:
    """Load JSON file, return empty dict if missing."""
    if not path.exists():
        return {}
    with open(path) as f:
        return json.load(f)
