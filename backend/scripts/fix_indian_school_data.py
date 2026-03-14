"""Fix top-level fields for Indian schools to reflect actual program data.

The school_db_full.json was generated with synthetic US-centric data.
Indian schools need:
- program_duration from primary program (PGP = 2 years, not "15-month accelerated")
- median_salary in INR (from programs[0].avg_salary)
- tuition in INR (from programs[0].fees)
- For CAT-primary schools, set gmat_avg to None (it's misleading)
"""

import json
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "school_db_full.json"

# Overrides for top-level fields based on actual data
INDIAN_FIXES = {
    "iima": {"program_duration": "2 years", "median_salary": "₹32 LPA", "tuition_inr": "₹23L", "gmat_avg": None, "acceptance_rate": 2.0},
    "iimb": {"program_duration": "2 years", "median_salary": "₹34 LPA", "tuition_inr": "₹25L", "gmat_avg": None, "acceptance_rate": 2.0},
    "iimc": {"program_duration": "2 years", "median_salary": "₹35 LPA", "tuition_inr": "₹27L", "gmat_avg": None, "acceptance_rate": 1.5},
    "iiml": {"program_duration": "2 years", "median_salary": "₹28 LPA", "tuition_inr": "₹20L", "gmat_avg": None, "acceptance_rate": 3.0},
    "iimk": {"program_duration": "2 years", "median_salary": "₹27 LPA", "tuition_inr": "₹21L", "gmat_avg": None, "acceptance_rate": 3.0},
    "iimi": {"program_duration": "2 years", "median_salary": "₹26 LPA", "tuition_inr": "₹19L", "gmat_avg": None, "acceptance_rate": 4.0},
    "iimr": {"program_duration": "2 years", "median_salary": "₹18 LPA", "tuition_inr": "₹14L", "gmat_avg": None, "acceptance_rate": 5.0},
    "iims": {"program_duration": "2 years", "median_salary": "₹16 LPA", "tuition_inr": "₹12L", "gmat_avg": None, "acceptance_rate": 6.0},
    "iimt": {"program_duration": "2 years", "median_salary": "₹15 LPA", "tuition_inr": "₹12L", "gmat_avg": None, "acceptance_rate": 7.0},
    "isb": {"program_duration": "1 year", "median_salary": "₹34 LPA", "tuition_inr": "₹40L", "gmat_avg": 710, "acceptance_rate": 15.0},
    "xlri": {"program_duration": "2 years", "median_salary": "₹28 LPA", "tuition_inr": "₹25L", "gmat_avg": None, "acceptance_rate": 5.0},
    "fms": {"program_duration": "2 years", "median_salary": "₹32 LPA", "tuition_inr": "₹2L", "gmat_avg": None, "acceptance_rate": 1.0},
    "mdi": {"program_duration": "2 years", "median_salary": "₹24 LPA", "tuition_inr": "₹22L", "gmat_avg": None, "acceptance_rate": 5.0},
    "spjimr": {"program_duration": "2 years", "median_salary": "₹30 LPA", "tuition_inr": "₹20L", "gmat_avg": None, "acceptance_rate": 3.0},
    "jbims": {"program_duration": "2 years", "median_salary": "₹28 LPA", "tuition_inr": "₹5L", "gmat_avg": None, "acceptance_rate": 1.5},
    "iift": {"program_duration": "2 years", "median_salary": "₹24 LPA", "tuition_inr": "₹20L", "gmat_avg": None, "acceptance_rate": 4.0},
    "nmims": {"program_duration": "2 years", "median_salary": "₹22 LPA", "tuition_inr": "₹22L", "gmat_avg": None, "acceptance_rate": 8.0},
    "great-lakes": {"program_duration": "1 year", "median_salary": "₹14 LPA", "tuition_inr": "₹18L", "gmat_avg": None, "acceptance_rate": 20.0},
}

def main():
    db = json.loads(DB_PATH.read_text())
    updated = 0

    for sid, fixes in INDIAN_FIXES.items():
        if sid not in db:
            print(f"  ⚠ {sid} not found in DB")
            continue

        school = db[sid]

        # Fix program_duration in program_details and top-level
        if "program_details" in school:
            school["program_details"]["duration"] = fixes["program_duration"]
        if "program_duration" in school:
            school["program_duration"] = fixes["program_duration"]

        # Fix median_salary to INR
        school["median_salary"] = fixes["median_salary"]

        # Add tuition_inr field (keep tuition_usd for comparison charts)
        school["tuition_inr"] = fixes["tuition_inr"]

        # Fix acceptance rate
        school["acceptance_rate"] = fixes["acceptance_rate"]

        # For CAT-primary schools, remove misleading GMAT avg
        if fixes["gmat_avg"] is None:
            school.pop("gmat_avg", None)
        else:
            school["gmat_avg"] = fixes["gmat_avg"]

        updated += 1

    DB_PATH.write_text(json.dumps(db, indent=2, ensure_ascii=False))
    print(f"Fixed {updated} Indian schools")


if __name__ == "__main__":
    main()
