"""Add multi-program data to Indian schools.

Indian B-schools offer multiple programs (PGP via CAT, PGPX via GMAT, etc.)
This script adds a `programs` array to each school so the frontend can
display all programs and users can filter by admission test.

Usage: cd backend && python scripts/add_indian_programs.py
"""

import json
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "school_db_full.json"

INDIAN_PROGRAMS = {
    "iima": [
        {"name": "PGP", "full_name": "Post Graduate Programme in Management", "type": "Full-Time MBA", "admission_test": "CAT", "duration": "2 years", "fees": "₹23L", "class_size": 400, "avg_salary": "₹32 LPA"},
        {"name": "PGPX", "full_name": "Post Graduate Programme for Executives", "type": "Executive MBA", "admission_test": "GMAT/GRE", "duration": "1 year", "fees": "₹35L", "class_size": 140, "avg_salary": "₹45 LPA", "min_experience": "4+ years"},
        {"name": "ePGP", "full_name": "Executive Post Graduate Programme", "type": "Online MBA", "admission_test": "GMAT/CAT", "duration": "2 years", "fees": "₹30L"},
        {"name": "FPM", "full_name": "Fellow Programme in Management", "type": "Doctoral", "admission_test": "CAT/GMAT", "duration": "4-5 years"},
    ],
    "iimb": [
        {"name": "PGP", "full_name": "Post Graduate Programme in Management", "type": "Full-Time MBA", "admission_test": "CAT", "duration": "2 years", "fees": "₹24.5L", "class_size": 400, "avg_salary": "₹34 LPA"},
        {"name": "EPGP", "full_name": "Executive Post Graduate Programme", "type": "Executive MBA", "admission_test": "GMAT/GRE", "duration": "1 year", "fees": "₹28L", "class_size": 100, "min_experience": "5+ years"},
        {"name": "PGPEM", "full_name": "PGP in Enterprise Management", "type": "Executive MBA", "admission_test": "GMAT/CAT", "duration": "2 years (weekend)", "fees": "₹27L", "min_experience": "5+ years"},
        {"name": "FPM", "full_name": "Fellow Programme in Management", "type": "Doctoral", "admission_test": "CAT/GMAT", "duration": "4-5 years"},
    ],
    "iimc": [
        {"name": "PGP", "full_name": "Post Graduate Programme", "type": "Full-Time MBA", "admission_test": "CAT", "duration": "2 years", "fees": "₹27L", "class_size": 480, "avg_salary": "₹35 LPA"},
        {"name": "PGPEX", "full_name": "PGP for Experienced Professionals", "type": "Executive MBA", "admission_test": "GMAT/GRE", "duration": "1 year", "fees": "₹30L", "class_size": 55, "min_experience": "5+ years"},
        {"name": "MBAEx", "full_name": "MBA for Executives", "type": "Executive MBA", "admission_test": "GMAT/CAT", "duration": "2 years (weekend)", "fees": "₹28L"},
        {"name": "FPM", "full_name": "Fellow Programme in Management", "type": "Doctoral", "admission_test": "CAT/GMAT", "duration": "4-5 years"},
    ],
    "iiml": [
        {"name": "PGP", "full_name": "Post Graduate Programme in Management", "type": "Full-Time MBA", "admission_test": "CAT", "duration": "2 years", "fees": "₹19.5L", "class_size": 460, "avg_salary": "₹28 LPA"},
        {"name": "IPMX", "full_name": "International Programme in Management for Executives", "type": "Executive MBA", "admission_test": "GMAT/GRE", "duration": "1 year", "fees": "₹27L", "min_experience": "5+ years"},
        {"name": "FPM", "full_name": "Fellow Programme in Management", "type": "Doctoral", "admission_test": "CAT/GMAT", "duration": "4-5 years"},
    ],
    "iimk": [
        {"name": "PGP", "full_name": "Post Graduate Programme", "type": "Full-Time MBA", "admission_test": "CAT", "duration": "2 years", "fees": "₹18L", "class_size": 480, "avg_salary": "₹27 LPA"},
        {"name": "EPGP", "full_name": "Executive Post Graduate Programme", "type": "Executive MBA", "admission_test": "GMAT/CAT", "duration": "1 year", "fees": "₹22L", "min_experience": "5+ years"},
        {"name": "FPM", "full_name": "Fellow Programme in Management", "type": "Doctoral", "admission_test": "CAT/GMAT", "duration": "4-5 years"},
    ],
    "iimi": [
        {"name": "PGP", "full_name": "Post Graduate Programme", "type": "Full-Time MBA", "admission_test": "CAT", "duration": "2 years", "fees": "₹17.5L", "class_size": 560, "avg_salary": "₹26 LPA"},
        {"name": "EPGP", "full_name": "Executive Post Graduate Programme", "type": "Executive MBA", "admission_test": "GMAT/CAT", "duration": "1 year", "fees": "₹20L", "min_experience": "5+ years"},
        {"name": "IPM", "full_name": "Integrated Programme in Management", "type": "Integrated MBA", "admission_test": "IPM AT", "duration": "5 years (after 12th)", "class_size": 150},
        {"name": "FPM", "full_name": "Fellow Programme in Management", "type": "Doctoral", "admission_test": "CAT/GMAT", "duration": "4-5 years"},
    ],
    "iimr": [
        {"name": "PGP", "full_name": "Post Graduate Programme", "type": "Full-Time MBA", "admission_test": "CAT", "duration": "2 years", "fees": "₹16L"},
        {"name": "PGPHRM", "full_name": "PGP in Human Resource Management", "type": "Full-Time MBA", "admission_test": "CAT", "duration": "2 years", "fees": "₹16L"},
    ],
    "iims": [
        {"name": "PGP", "full_name": "Post Graduate Programme", "type": "Full-Time MBA", "admission_test": "CAT", "duration": "2 years", "fees": "₹14L"},
        {"name": "PGPEX", "full_name": "PGP for Experienced Professionals", "type": "Executive MBA", "admission_test": "GMAT/CAT", "duration": "1 year", "fees": "₹18L", "min_experience": "5+ years"},
    ],
    "iimt": [
        {"name": "PGP", "full_name": "Post Graduate Programme", "type": "Full-Time MBA", "admission_test": "CAT", "duration": "2 years", "fees": "₹15L"},
        {"name": "PGPBM", "full_name": "PGP in Business Management", "type": "Full-Time MBA", "admission_test": "CAT", "duration": "2 years", "fees": "₹15L"},
    ],
    "isb": [
        {"name": "PGP", "full_name": "Post Graduate Programme in Management", "type": "Full-Time MBA", "admission_test": "GMAT/GRE", "duration": "1 year", "fees": "₹40L", "class_size": 880, "avg_salary": "₹34 LPA", "min_experience": "2+ years"},
        {"name": "PGPpro", "full_name": "PGP Pro", "type": "Executive MBA", "admission_test": "GMAT/GRE", "duration": "2 years (weekend)", "fees": "₹30L", "min_experience": "5+ years"},
        {"name": "MFAB", "full_name": "Management Programme for Family Business", "type": "Specialty", "admission_test": "Interview", "duration": "1 year", "fees": "₹25L"},
    ],
    "xlri": [
        {"name": "BM", "full_name": "Business Management", "type": "Full-Time MBA", "admission_test": "XAT/GMAT", "duration": "2 years", "fees": "₹26L", "class_size": 180, "avg_salary": "₹29 LPA"},
        {"name": "HRM", "full_name": "Human Resource Management", "type": "Full-Time MBA", "admission_test": "XAT", "duration": "2 years", "fees": "₹26L", "class_size": 180, "avg_salary": "₹27 LPA"},
        {"name": "GMP", "full_name": "General Management Programme", "type": "Executive MBA", "admission_test": "GMAT/XAT", "duration": "1 year", "fees": "₹25L", "min_experience": "5+ years"},
    ],
    "fms": [
        {"name": "MBA", "full_name": "Master of Business Administration", "type": "Full-Time MBA", "admission_test": "CAT", "duration": "2 years", "fees": "₹1.92L", "class_size": 216, "avg_salary": "₹33 LPA"},
        {"name": "MBA(E)", "full_name": "MBA Executive", "type": "Executive MBA", "admission_test": "CAT", "duration": "2 years (evening)", "fees": "₹1.92L"},
    ],
    "mdi": [
        {"name": "PGDM", "full_name": "Post Graduate Diploma in Management", "type": "Full-Time MBA", "admission_test": "CAT", "duration": "2 years", "fees": "₹23.5L", "class_size": 360, "avg_salary": "₹25 LPA"},
        {"name": "PGDM-HRM", "full_name": "PGDM in Human Resource Management", "type": "Full-Time MBA", "admission_test": "CAT", "duration": "2 years", "fees": "₹23.5L"},
        {"name": "PGDM-IB", "full_name": "PGDM in International Business", "type": "Full-Time MBA", "admission_test": "CAT/GMAT", "duration": "2 years", "fees": "₹23.5L"},
        {"name": "NMP", "full_name": "National Management Programme", "type": "Executive MBA", "admission_test": "CAT/GMAT", "duration": "2 years (weekend)", "fees": "₹18L", "min_experience": "5+ years"},
    ],
    "spjimr": [
        {"name": "PGDM", "full_name": "Post Graduate Diploma in Management", "type": "Full-Time MBA", "admission_test": "CAT/XAT/GMAT", "duration": "2 years", "fees": "₹21L", "class_size": 240, "avg_salary": "₹30 LPA"},
        {"name": "PGMPW", "full_name": "PGP in Management for Working Professionals", "type": "Executive MBA", "admission_test": "SPJAT", "duration": "2 years (weekend)", "fees": "₹16L"},
    ],
    "jbims": [
        {"name": "MMS", "full_name": "Masters in Management Studies", "type": "Full-Time MBA", "admission_test": "CET/CAT", "duration": "2 years", "fees": "₹6L", "class_size": 120, "avg_salary": "₹28 LPA"},
    ],
    "iift": [
        {"name": "MBA(IB)", "full_name": "MBA in International Business", "type": "Full-Time MBA", "admission_test": "IIFT Entrance", "duration": "2 years", "fees": "₹20L", "class_size": 300, "avg_salary": "₹25 LPA"},
    ],
    "nmims": [
        {"name": "MBA", "full_name": "Master of Business Administration", "type": "Full-Time MBA", "admission_test": "NMAT", "duration": "2 years", "fees": "₹21L", "class_size": 480, "avg_salary": "₹23 LPA"},
        {"name": "MBA-HR", "full_name": "MBA in Human Resources", "type": "Full-Time MBA", "admission_test": "NMAT", "duration": "2 years", "fees": "₹21L"},
    ],
    "great_lakes": [
        {"name": "PGPM", "full_name": "Post Graduate Programme in Management", "type": "Full-Time MBA", "admission_test": "CAT/XAT/GMAT/CMAT", "duration": "1 year", "fees": "₹17.5L", "class_size": 300, "avg_salary": "₹14 LPA"},
        {"name": "PGPBABI", "full_name": "PGP in Business Analytics and Business Intelligence", "type": "Full-Time MBA", "admission_test": "CAT/GMAT", "duration": "1 year", "fees": "₹18L"},
    ],
}


def main():
    with open(DB_PATH) as f:
        db = json.load(f)

    updated = 0
    for school_id, programs in INDIAN_PROGRAMS.items():
        if school_id not in db:
            print(f"WARNING: {school_id} not found in DB, skipping")
            continue
        db[school_id]["programs"] = programs
        # Also set a primary_admission_test field for filtering
        primary = programs[0]["admission_test"]
        db[school_id]["primary_admission_test"] = primary
        updated += 1

    with open(DB_PATH, "w") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)

    total_programs = sum(len(p) for p in INDIAN_PROGRAMS.values())
    print(f"Updated {updated} schools with {total_programs} total programs")


if __name__ == "__main__":
    main()
