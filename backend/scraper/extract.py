"""Claude-powered extraction pipeline for structured MBA program data."""
import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from anthropic import Anthropic

# Load .env from backend/ directory
load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=True)

from scraper.config import (
    ANTHROPIC_MODEL,
    EXTRACT_MAX_TOKENS,
    RAW_HTML_DIR,
    SCRAPED_DB_FILE,
)
from scraper.utils import load_json, save_json

# ---------------------------------------------------------------------------
# Schema example shown to Claude so it knows the target structure
# ---------------------------------------------------------------------------
EXTRACTION_SCHEMA = """{
  "essay_prompts": [
    {"prompt": "exact essay question text", "word_limit": 500, "required": true}
  ],
  "deadlines": [
    {"round": "Round 1", "date": "2025-09-10", "decision_date": "2025-12-15"}
  ],
  "tuition_usd": 74000,
  "tuition_notes": "per year, does not include fees",
  "class_size": 930,
  "class_profile": {
    "median_gmat": 740,
    "median_gre": 330,
    "mean_gpa": 3.7,
    "avg_work_experience_years": 5,
    "women_pct": 45,
    "international_pct": 37,
    "underrepresented_minority_pct": 28
  },
  "scholarships": [
    {"name": "Merit Fellowship", "amount_usd": 40000, "criteria": "merit-based"}
  ],
  "placement_stats": {
    "median_base_salary_usd": 175000,
    "median_signing_bonus_usd": 30000,
    "employment_rate_3mo_pct": 95,
    "top_industries": ["Consulting", "Technology", "Finance"],
    "top_employers": ["McKinsey", "Amazon", "Goldman Sachs"]
  },
  "interview_format": "blind, 30-min with adcom or alumni",
  "application_url": "https://school.edu/mba/apply",
  "accreditations": ["AACSB"],
  "program_length_months": 21,
  "program_format": "Full-time",
  "acceptance_rate_pct": 12,
  "yield_rate_pct": 70,
  "confidence": 0.85
}"""

MAX_PAGE_TEXT_CHARS = 15_000


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------
def build_extraction_prompt(school_name: str, page_text: str) -> str:
    """Build the Claude extraction prompt for a given school."""
    truncated = page_text[:MAX_PAGE_TEXT_CHARS]

    return f"""You are an expert MBA admissions data analyst. Extract structured data about {school_name} from the webpage text below.

Return ONLY valid JSON matching this schema — no commentary, no markdown outside the JSON block:

{EXTRACTION_SCHEMA}

RULES:
- Return ONLY valid JSON. No text before or after.
- Use null for any field where data is NOT found in the text.
- NEVER guess or fabricate data. If unsure, use null.
- Essay prompts must be the EXACT text from the page — do not paraphrase.
- Dates must be in YYYY-MM-DD format.
- Salary and tuition values must be integers (no dollar signs or commas).
- Set "confidence" between 0.0 and 1.0 reflecting how much relevant data you found.
  - 0.0-0.3: almost nothing found
  - 0.4-0.6: partial data
  - 0.7-1.0: rich, detailed data

PAGE TEXT:
{truncated}"""


# ---------------------------------------------------------------------------
# Response parser
# ---------------------------------------------------------------------------
def parse_extraction_response(raw: str) -> dict:
    """Parse Claude's response into a dict, handling various formats."""
    if not raw or not raw.strip():
        return {}

    text = raw.strip()

    # 1) Try ```json ... ``` code blocks
    code_block_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
    if code_block_match:
        try:
            return json.loads(code_block_match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # 2) Try raw JSON parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 3) Find first { ... } block (greedy to capture nested braces)
    brace_match = re.search(r"\{.*\}", text, re.DOTALL)
    if brace_match:
        try:
            return json.loads(brace_match.group(0))
        except json.JSONDecodeError:
            pass

    # 4) Nothing worked
    return {}


# ---------------------------------------------------------------------------
# Single-school extraction
# ---------------------------------------------------------------------------
def extract_school(school_id: str, school_name: str) -> dict:
    """Read cached .txt files for a school, call Claude, return structured data."""
    school_dir = RAW_HTML_DIR / school_id
    if not school_dir.exists():
        print(f"  [SKIP] No cached data for {school_name} ({school_id})")
        return {}

    # Combine all .txt files with page-type headers
    txt_files = sorted(school_dir.glob("*.txt"))
    if not txt_files:
        print(f"  [SKIP] No .txt files in {school_dir}")
        return {}

    parts = []
    for f in txt_files:
        page_type = f.stem.upper()
        content = f.read_text(errors="replace").strip()
        if content:
            parts.append(f"=== {page_type} PAGE ===\n{content}")

    combined_text = "\n\n".join(parts)
    if not combined_text.strip():
        print(f"  [SKIP] Empty text for {school_name}")
        return {}

    prompt = build_extraction_prompt(school_name, combined_text)

    # Call Claude
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key or not api_key.startswith("sk-"):
        raise RuntimeError(
            "ANTHROPIC_API_KEY not set. Add it to backend/.env or export it:\n"
            "  export ANTHROPIC_API_KEY=sk-ant-..."
        )
    client = Anthropic(api_key=api_key)
    response = client.messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=EXTRACT_MAX_TOKENS,
        messages=[{"role": "user", "content": prompt}],
    )

    raw_text = response.content[0].text
    extracted = parse_extraction_response(raw_text)

    # Attach data-quality metadata
    extracted["_meta"] = {
        "school_id": school_id,
        "school_name": school_name,
        "extracted_at": datetime.now(timezone.utc).isoformat(),
        "model": ANTHROPIC_MODEL,
        "source_files": [f.name for f in txt_files],
        "source_chars": len(combined_text),
        "confidence": extracted.get("confidence"),
    }

    return extracted


# ---------------------------------------------------------------------------
# Batch extraction
# ---------------------------------------------------------------------------
def extract_all(schools: list[dict], resume: bool = True) -> dict:
    """Extract data for all schools, saving incrementally.

    Args:
        schools: List of dicts with at least 'id' and 'name' keys.
        resume: If True, skip schools already in the output file.

    Returns:
        Combined dict keyed by school_id.
    """
    db: dict = load_json(SCRAPED_DB_FILE) if resume else {}
    total = len(schools)

    for i, school in enumerate(schools, 1):
        sid = school["id"]
        name = school["name"]

        if resume and sid in db:
            print(f"  [{i}/{total}] SKIP (already extracted): {name}")
            continue

        print(f"  [{i}/{total}] Extracting: {name} ...")
        try:
            result = extract_school(sid, name)
            if result:
                db[sid] = result
        except Exception as e:
            print(f"  [ERROR] {name}: {e}")
            db[sid] = {"_meta": {"school_id": sid, "school_name": name, "error": str(e)}}

        # Incremental save every 10 schools
        if i % 10 == 0:
            save_json(db, SCRAPED_DB_FILE)
            print(f"  ... checkpoint saved ({i}/{total})")

        # Small delay to stay under rate limits
        time.sleep(0.5)

    save_json(db, SCRAPED_DB_FILE)
    print(f"Extraction complete: {len(db)} schools in {SCRAPED_DB_FILE}")
    return db
