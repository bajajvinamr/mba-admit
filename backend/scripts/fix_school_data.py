"""One-time script to deduplicate and fill missing data for top 100 schools.

Usage: cd backend && python scripts/fix_school_data.py
"""

import json
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "school_db_full.json"

# Duplicate long-name IDs → canonical short IDs (merge and delete)
DUPLICATES = {
    "iim_ahmedabad": "iima",
    "iim_bangalore": "iimb",
    "iim_calcutta": "iimc",
    "iim_indore": "iimi",
    "iim_kozhikode": "iimk",
    "iim_lucknow": "iiml",
    "iim_ranchi": "iimr",
    "iim_shillong": "iims",
    "iim_trichy": "iimt",
    "indian_school_of_business": "isb",
    "indian_institute_of_foreign_trade": "iift",
    "faculty_of_management_studies_delhi": "fms",
    "management_development_institute": "mdi",
    "ivey_business_school": "ivey",
    "rotman_school_of_management": "rotman",
    "sauder_school_of_business": "sauder",
    "schulich_school_of_business": "schulich",
    "desautels_faculty_of_management": "desautels",
    "melbourne_business_school": "mbs",
    "great_lakes_institute_of_management": "great_lakes",
    "nmims_school_of_business_management": "nmims",
    "sp_jain_institute_of_management_and_research": "spjimr",
    "fgv_eaesp": "fgv",
    "african_leadership_university_school_of_business": None,  # delete, no canonical
}

# Top 100 list (canonical IDs) for sitemap priority
TOP_100 = [
    "hbs", "gsb", "wharton", "booth", "kellogg", "cbs", "sloan",
    "tuck", "haas", "ross", "fuqua", "darden", "stern", "yale_som", "anderson",
    "tepper", "mccombs", "kenan_flagler", "johnson", "marshall", "mcdonough",
    "goizueta", "kelley", "mendoza", "jones", "olin", "foster", "owen",
    "scheller", "fisher", "broad", "smith", "questrom", "warrington",
    "insead", "lbs", "iese", "ie_business", "hec_paris", "esade",
    "judge", "said", "imperial", "sda_bocconi", "mannheim", "esmt",
    "st_gallen", "imds", "rsm", "copenhagen",
    "ceibs", "nus", "nanyang", "hkust", "hku", "cuhk",
    "isb", "iima", "iimb", "iimc", "iimi", "iimk", "iiml",
    "fms", "xlri", "mdi", "spjimr", "jbims", "iift",
    "mbs", "rotman", "ivey", "sauder", "desautels", "schulich",
    "kaist", "fudan", "peking_gsm", "sjtu_antai", "tsinghua_sem",
    "babson_olin", "smurfit", "warwick", "cranfield",
    "insead_ad", "keio", "waseda", "hitotsubashi",
    "aalto", "ssc_stockholm", "nhh", "essec", "emlyon", "edhec",
    "fgv", "egade", "incae", "gibs",
    "agsm", "monash",
]


def main():
    with open(DB_PATH) as f:
        db = json.load(f)

    merged = 0
    deleted = 0

    # Step 1: Merge duplicates
    for dup_id, canonical_id in DUPLICATES.items():
        if dup_id not in db:
            continue
        if canonical_id is None:
            del db[dup_id]
            deleted += 1
            continue
        if canonical_id in db:
            # Merge: only fill missing fields from duplicate
            dup_data = db[dup_id]
            canon_data = db[canonical_id]
            for key, val in dup_data.items():
                if key not in canon_data or canon_data[key] in (None, 0, "", "N/A", "?", "Unknown"):
                    if val not in (None, 0, "", "N/A", "?", "Unknown"):
                        canon_data[key] = val
            db[canonical_id] = canon_data
        del db[dup_id]
        merged += 1

    print(f"Merged {merged} duplicates, deleted {deleted} orphans")

    # Step 2: Verify top 100 coverage
    missing = [sid for sid in TOP_100 if sid not in db]
    if missing:
        print(f"WARNING: {len(missing)} top 100 schools missing from DB: {missing}")

    incomplete = []
    for sid in TOP_100:
        if sid not in db:
            continue
        s = db[sid]
        issues = []
        if not s.get("country") or s["country"] in ("?", "Unknown"):
            issues.append("country")
        if not s.get("gmat_avg") or s["gmat_avg"] == 0:
            issues.append("gmat_avg")
        if not s.get("location") or s["location"] in ("?", "Unknown"):
            issues.append("location")
        if issues:
            incomplete.append((sid, issues))

    if incomplete:
        print(f"\n{len(incomplete)} top 100 schools with incomplete data:")
        for sid, issues in incomplete:
            print(f"  {sid}: missing {', '.join(issues)}")

    # Save
    with open(DB_PATH, "w") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)

    total_real = sum(1 for sid in db if not (len(sid) > 6 and all(c in "0123456789abcdef" for c in sid)))
    print(f"\nDone. {total_real} real schools remaining.")


if __name__ == "__main__":
    main()
