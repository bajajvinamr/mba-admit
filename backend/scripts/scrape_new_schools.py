"""
Scraper for MBA programs missing from school_db_full.json.
Fetches program pages via httpx, extracts text, calls Claude API for structured extraction,
and merges results into the database.
"""

import json
import os
import re
import sys
import hashlib
import time
from pathlib import Path
from datetime import datetime, timezone

import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import anthropic

# --- Configuration ---
BACKEND_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND_DIR / "data"
DB_PATH = DATA_DIR / "school_db_full.json"
RAW_HTML_DIR = DATA_DIR / "raw_html"
NEW_SCHOOLS_PATH = DATA_DIR / "new_schools_to_add.json"

load_dotenv(BACKEND_DIR / ".env", override=True)

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    print("ERROR: ANTHROPIC_API_KEY not found in environment or .env")
    sys.exit(1)

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

# --- Schools to add ---
NEW_SCHOOLS = [
    {
        "id": "ntu_taiwan",
        "name": "National Taiwan University College of Management",
        "country": "Taiwan",
        "location": "Taipei, Taiwan",
        "website": "https://management.ntu.edu.tw/en/MBA",
        "program_type": "MBA",
        "tier": "T50",
    },
    {
        "id": "city_university_hk",
        "name": "City University of Hong Kong College of Business",
        "country": "Hong Kong",
        "location": "Kowloon, Hong Kong",
        "website": "https://www.cb.cityu.edu.hk/mba/",
        "program_type": "MBA",
        "tier": "T50",
    },
    {
        "id": "lums_lahore",
        "name": "LUMS - Lahore University of Management Sciences",
        "country": "Pakistan",
        "location": "Lahore, Pakistan",
        "website": "https://sdsb.lums.edu.pk/programme/mba",
        "program_type": "MBA",
        "tier": "Regional",
    },
    {
        "id": "waikato_nz",
        "name": "University of Waikato Management School",
        "country": "New Zealand",
        "location": "Hamilton, New Zealand",
        "website": "https://www.waikato.ac.nz/study/qualifications/master-of-business-administration",
        "program_type": "MBA",
        "tier": "Regional",
    },
    {
        "id": "victoria_wellington",
        "name": "Victoria University of Wellington School of Business",
        "country": "New Zealand",
        "location": "Wellington, New Zealand",
        "website": "https://www.wgtn.ac.nz/explore/postgraduate-programmes/master-of-business-administration/overview",
        "program_type": "MBA",
        "tier": "Regional",
    },
    {
        "id": "bond_university",
        "name": "Bond University Business School",
        "country": "Australia",
        "location": "Gold Coast, Australia",
        "website": "https://bond.edu.au/program/master-business-administration",
        "program_type": "MBA",
        "tier": "Regional",
    },
    {
        "id": "qut_brisbane",
        "name": "QUT Graduate School of Business",
        "country": "Australia",
        "location": "Brisbane, Australia",
        "website": "https://www.qut.edu.au/courses/master-of-business-administration",
        "program_type": "MBA",
        "tier": "Regional",
    },
    {
        "id": "nitie_mumbai",
        "name": "NITIE Mumbai (National Institute of Industrial Engineering)",
        "country": "India",
        "location": "Mumbai, India",
        "website": "https://www.nitie.ac.in/pgdim",
        "program_type": "PGDIM/MBA",
        "tier": "T25_India",
    },
    {
        "id": "tapmi_manipal",
        "name": "T.A. Pai Management Institute (TAPMI)",
        "country": "India",
        "location": "Manipal, India",
        "website": "https://www.tapmi.edu.in/programs/pgdm/",
        "program_type": "PGDM/MBA",
        "tier": "T25_India",
    },
    {
        "id": "catolica_lisbon",
        "name": "Catolica Lisbon School of Business & Economics",
        "country": "Portugal",
        "location": "Lisbon, Portugal",
        "website": "https://www.clsbe.lisboa.ucp.pt/mba",
        "program_type": "MBA",
        "tier": "T50_Europe",
    },
    {
        "id": "ebs_germany",
        "name": "EBS Universitat fur Wirtschaft und Recht",
        "country": "Germany",
        "location": "Oestrich-Winkel, Germany",
        "website": "https://www.ebs.edu/en/programs/mba",
        "program_type": "MBA",
        "tier": "T50_Europe",
    },
    {
        "id": "pforzheim_germany",
        "name": "Pforzheim University Business School",
        "country": "Germany",
        "location": "Pforzheim, Germany",
        "website": "https://businesspf.hs-pforzheim.de/en/programs/master/mba",
        "program_type": "MBA",
        "tier": "Regional_Europe",
    },
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

EXTRACTION_PROMPT = """You are an MBA admissions data extraction expert. Given raw text content scraped from an MBA program's website, extract structured data.

School: {school_name}
Country: {country}
Location: {location}

Return a JSON object with these fields (use null if data is not available from the text):

{{
  "tuition_usd": <integer or null>,
  "class_size": <integer or null>,
  "gmat_avg": <integer or null>,
  "acceptance_rate": <float or null>,
  "program_duration": "<string like '2-year full-time' or null>",
  "program_format": "<Full-Time MBA / Part-Time MBA / Executive MBA>",
  "program_length_months": <integer or null>,
  "degree_type": "MBA",
  "stem_designated": <boolean or null>,
  "median_salary": "<string like '$120,000' or null>",
  "specializations": [<list of strings>],
  "admission_requirements": {{
    "gmat_gre": "<string>",
    "work_experience": "<string>",
    "avg_work_experience": "<string>",
    "english_proficiency": "<string>",
    "transcripts": "<string>",
    "recommendations": "<string>",
    "resume": "<string>",
    "interview": "<string>",
    "application_fee": "<string>"
  }},
  "program_details": {{
    "duration": "<string>",
    "format": "<string>",
    "total_credits": <int or null>,
    "core_courses": <int or null>,
    "elective_courses": "<string or null>",
    "class_size": <int or null>,
    "avg_age": <int or null>,
    "female_percentage": "<string or null>",
    "international_percentage": "<string or null>",
    "countries_represented": <int or null>,
    "stem_designated": <boolean or null>,
    "start_date": "<string or null>"
  }},
  "unique_features": [<list of 3-5 strings>],
  "placement_stats": {{
    "employment_rate_3mo_pct": <float or null>,
    "median_base_salary_usd": <int or null>,
    "median_signing_bonus_usd": <int or null>,
    "top_industries": [<list of strings or null>],
    "top_employers": [<list of strings or null>]
  }},
  "essay_prompts": [<list of strings or null>],
  "deadlines": [
    {{"round": "Round 1", "date": "<YYYY-MM-DD or null>", "decision_date": "<YYYY-MM-DD or null>"}}
  ],
  "admission_deadlines": [
    {{"round": "Round 1", "deadline": "<date string>", "decision": "<date string>"}}
  ],
  "application_questions": [<list of essay questions or null>],
  "scholarships": [
    {{"name": "<string>", "amount_usd": <int or null>, "criteria": "<string>"}}
  ],
  "class_profile": {{
    "median_gmat": <int or null>,
    "median_gre": <int or null>,
    "mean_gpa": <float or null>,
    "women_pct": <float or null>,
    "international_pct": <float or null>,
    "underrepresented_minority_pct": <float or null>,
    "avg_work_experience_years": <float or null>
  }},
  "application_fee_usd": <int or null>,
  "application_url": "<string or null>"
}}

IMPORTANT: Only include data you can extract or reasonably infer from the provided text. Use null for anything not available. Do NOT make up statistics. Return ONLY valid JSON, no markdown fencing."""


def fetch_page(url: str, timeout: int = 30) -> str | None:
    """Fetch a webpage and return its text content."""
    try:
        with httpx.Client(headers=HEADERS, follow_redirects=True, timeout=timeout) as http:
            resp = http.get(url)
            resp.raise_for_status()
            return resp.text
    except Exception as e:
        print(f"  WARN: Failed to fetch {url}: {e}")
        return None


def extract_text(html: str) -> str:
    """Strip HTML tags and return clean text."""
    soup = BeautifulSoup(html, "html.parser")
    # Remove script and style elements
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    text = soup.get_text(separator="\n", strip=True)
    # Collapse multiple blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text[:12000]  # Cap to avoid token limits


def save_raw_text(school_id: str, text: str) -> Path:
    """Save raw extracted text to data/raw_html/{school_id}/homepage.txt."""
    school_dir = RAW_HTML_DIR / school_id
    school_dir.mkdir(parents=True, exist_ok=True)
    filepath = school_dir / "homepage.txt"
    filepath.write_text(text, encoding="utf-8")
    # Also save meta.json
    meta = {
        "school_id": school_id,
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "source": "homepage",
        "chars": len(text),
    }
    (school_dir / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return filepath


def extract_with_claude(school: dict, text: str) -> dict | None:
    """Call Claude API to extract structured data from scraped text."""
    prompt = EXTRACTION_PROMPT.format(
        school_name=school["name"],
        country=school["country"],
        location=school["location"],
    )
    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[
                {"role": "user", "content": f"{prompt}\n\n--- RAW TEXT ---\n{text}"},
            ],
        )
        response_text = message.content[0].text.strip()
        # Strip markdown fencing if present
        if response_text.startswith("```"):
            response_text = re.sub(r"^```(?:json)?\s*", "", response_text)
            response_text = re.sub(r"\s*```$", "", response_text)
        return json.loads(response_text)
    except json.JSONDecodeError as e:
        print(f"  WARN: JSON parse error for {school['id']}: {e}")
        return None
    except Exception as e:
        print(f"  WARN: Claude API error for {school['id']}: {e}")
        return None


def build_db_entry(school: dict, extracted: dict | None) -> dict:
    """Build a complete database entry merging school info with extracted data."""
    base = {
        "name": school["name"],
        "location": school["location"],
        "country": school["country"],
        "gmat_avg": None,
        "acceptance_rate": None,
        "class_size": None,
        "tuition_usd": None,
        "median_salary": None,
        "specializations": [],
        "admission_requirements": {
            "gmat_gre": "GMAT/GRE accepted",
            "work_experience": "2+ years recommended",
            "avg_work_experience": None,
            "english_proficiency": "TOEFL/IELTS required for non-native speakers",
            "transcripts": "Official transcripts required",
            "recommendations": "2 recommendations required",
            "resume": "Current resume/CV required",
            "interview": "By invitation",
            "application_fee": None,
        },
        "program_details": {
            "duration": None,
            "format": "Full-Time, In-Person",
            "total_credits": None,
            "core_courses": None,
            "elective_courses": None,
            "class_size": None,
            "avg_age": None,
            "female_percentage": None,
            "international_percentage": None,
            "countries_represented": None,
            "stem_designated": None,
            "start_date": None,
        },
        "unique_features": [],
        "placement_stats": {
            "employment_rate_3mo_pct": None,
            "median_base_salary_usd": None,
            "median_signing_bonus_usd": None,
            "top_industries": None,
            "top_employers": None,
        },
        "admission_deadlines": [],
        "application_questions": [],
        "degree_type": "MBA",
        "program_duration": None,
        "program_format": None,
        "program_length_months": None,
        "stem_designated": None,
        "essay_prompts": [],
        "deadlines": [],
        "class_profile": {
            "median_gmat": None,
            "median_gre": None,
            "mean_gpa": None,
            "women_pct": None,
            "international_pct": None,
            "underrepresented_minority_pct": None,
            "avg_work_experience_years": None,
        },
        "scholarships": [],
        "application_fee_usd": None,
        "application_url": school["website"],
        "confidence": 0.3,
        "_meta": {
            "school_id": school["id"],
            "school_name": school["name"],
            "source_files": ["homepage.txt"],
            "extracted_at": datetime.now(timezone.utc).isoformat(),
            "model": "claude-sonnet-4-20250514",
            "confidence": 0.3,
            "source_chars": 0,
        },
    }

    if extracted:
        # Deep merge extracted data into base
        for key, val in extracted.items():
            if val is None:
                continue
            if key in base and isinstance(base[key], dict) and isinstance(val, dict):
                for k2, v2 in val.items():
                    if v2 is not None:
                        base[key][k2] = v2
            else:
                base[key] = val
        base["confidence"] = 0.5
        base["_meta"]["confidence"] = 0.5

    return base


def main():
    # Load existing DB
    with open(DB_PATH, "r", encoding="utf-8") as f:
        db = json.load(f)

    original_count = len(db)
    print(f"Existing schools in DB: {original_count}")
    print(f"Schools to add: {len(NEW_SCHOOLS)}")
    print("=" * 60)

    # Save the new schools list
    with open(NEW_SCHOOLS_PATH, "w", encoding="utf-8") as f:
        json.dump(NEW_SCHOOLS, f, indent=2)
    print(f"Saved discovery list to {NEW_SCHOOLS_PATH}")

    added = []
    failed = []

    for school in NEW_SCHOOLS:
        sid = school["id"]
        print(f"\n--- Processing: {school['name']} ({sid}) ---")

        # Check if already in DB
        if sid in db:
            print(f"  SKIP: {sid} already in database")
            continue

        # Step 1: Fetch the page
        print(f"  Fetching: {school['website']}")
        html = fetch_page(school["website"])

        if not html:
            # Try alternate URLs
            alt_urls = [
                school["website"].rstrip("/") + "/admissions",
                school["website"].rstrip("/") + "/overview",
            ]
            for alt in alt_urls:
                print(f"  Trying alternate: {alt}")
                html = fetch_page(alt)
                if html:
                    break

        if not html:
            print(f"  FAILED: Could not fetch any page for {school['name']}")
            # Still add with minimal data
            entry = build_db_entry(school, None)
            entry["_meta"]["source_chars"] = 0
            entry["confidence"] = 0.2
            entry["_meta"]["confidence"] = 0.2
            db[sid] = entry
            failed.append(school["name"])
            added.append({"id": sid, "name": school["name"], "status": "partial (no scrape)"})
            continue

        # Step 2: Extract text
        text = extract_text(html)
        print(f"  Extracted {len(text)} chars of text")

        # Step 3: Save raw text
        save_raw_text(sid, text)
        print(f"  Saved raw text to data/raw_html/{sid}/homepage.txt")

        # Step 4: Call Claude for structured extraction
        print(f"  Calling Claude API for extraction...")
        extracted = extract_with_claude(school, text)

        if extracted:
            print(f"  Extraction successful")
        else:
            print(f"  Extraction returned None - using minimal data")
            failed.append(school["name"])

        # Step 5: Build and merge entry
        entry = build_db_entry(school, extracted)
        entry["_meta"]["source_chars"] = len(text)
        db[sid] = entry

        status = "full" if extracted else "partial (extraction failed)"
        added.append({
            "id": sid,
            "name": school["name"],
            "status": status,
            "tuition_usd": entry.get("tuition_usd"),
            "gmat_avg": entry.get("gmat_avg"),
            "class_size": entry.get("class_size"),
        })

        # Rate limit - be polite
        time.sleep(1)

    # Save updated DB
    print("\n" + "=" * 60)
    print("Saving updated database...")
    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)

    final_count = len(db)

    # --- Verification Report ---
    print("\n" + "=" * 60)
    print("VERIFICATION REPORT")
    print("=" * 60)
    print(f"Schools BEFORE: {original_count}")
    print(f"Schools AFTER:  {final_count}")
    print(f"New schools added: {final_count - original_count}")
    print()

    if added:
        print("NEW SCHOOLS ADDED:")
        print(f"{'ID':<25} {'Name':<50} {'Status':<25} {'Tuition':>10} {'GMAT':>6} {'Size':>6}")
        print("-" * 130)
        for s in added:
            tuition = str(s.get("tuition_usd") or "N/A")
            gmat = str(s.get("gmat_avg") or "N/A")
            size = str(s.get("class_size") or "N/A")
            print(f"{s['id']:<25} {s['name']:<50} {s['status']:<25} {tuition:>10} {gmat:>6} {size:>6}")

    if failed:
        print(f"\nSCHOOLS WITH ISSUES ({len(failed)}):")
        for name in failed:
            print(f"  - {name}")

    print(f"\nDone. Database saved to {DB_PATH}")


if __name__ == "__main__":
    main()
