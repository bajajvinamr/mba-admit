"""Enrich school DB with practice essay questions.

For schools with < 10 essay prompts, generates school-specific practice
questions using Claude API. Combines real scraped prompts with generated
practice questions to reach the 10-essay minimum.

Usage:
    cd backend && python3 -m scripts.enrich_essays [--dry-run] [--limit N]
    # or from project root:
    cd backend && python3 ../scripts/enrich_essays.py [--dry-run] [--limit N]
"""
import argparse
import json
import os
import sys
import time
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / "backend" / ".env")

import anthropic

MIN_ESSAYS = 10
MODEL = "claude-sonnet-4-20250514"
MAX_TOKENS = 2048

DATA_DIR = Path(__file__).resolve().parent.parent / "backend" / "data"
FULL_DB_PATH = DATA_DIR / "school_db_full.json"

# Common MBA essay categories to draw from
ESSAY_CATEGORIES = [
    "career_goals",
    "why_this_school",
    "leadership",
    "teamwork",
    "challenge_overcome",
    "ethical_dilemma",
    "diversity_contribution",
    "strengths_weaknesses",
    "innovation",
    "community_impact",
]


def build_essay_gen_prompt(school_name: str, existing_essays: list, specializations: list, count_needed: int) -> str:
    existing_text = ""
    if existing_essays:
        existing_text = "The school already has these real essay prompts (DO NOT duplicate these):\n"
        for i, e in enumerate(existing_essays, 1):
            if isinstance(e, dict):
                existing_text += f"  {i}. {e.get('prompt', str(e))}\n"
            else:
                existing_text += f"  {i}. {e}\n"

    spec_text = ""
    if specializations:
        spec_text = f"School specializations: {', '.join(specializations)}\n"

    return f"""Generate {count_needed} realistic MBA application essay/interview practice questions for {school_name}.

{existing_text}
{spec_text}
Requirements:
- Questions must be realistic and similar to what top MBA programs actually ask
- Cover different categories: career goals, leadership, teamwork, challenges, ethics, diversity, innovation
- Tailor to the school's known strengths/culture where possible
- Include a mix of short-answer (200-300 words) and longer essays (500-750 words)
- Make them specific enough to be useful for practice, not generic

Return ONLY valid JSON — an array of objects:
[
  {{"prompt": "Full essay question text", "word_limit": 500, "required": false, "category": "career_goals", "type": "practice"}},
  ...
]

IMPORTANT: Return ONLY the JSON array. No commentary, no markdown."""


def generate_essays(client: anthropic.Anthropic, school_name: str, existing: list, specializations: list, count: int) -> list:
    prompt = build_essay_gen_prompt(school_name, existing, specializations, count)
    try:
        resp = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = resp.content[0].text.strip()
        # Parse JSON
        if raw.startswith("["):
            return json.loads(raw)
        # Try extracting from markdown code block
        import re
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return []
    except Exception as e:
        print(f"  ERROR generating for {school_name}: {e}")
        return []


def main():
    parser = argparse.ArgumentParser(description="Enrich essays to reach 10+ per school")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done without calling API")
    parser.add_argument("--limit", type=int, default=0, help="Max schools to process (0=all)")
    parser.add_argument("--min-essays", type=int, default=MIN_ESSAYS, help="Minimum essays per school")
    args = parser.parse_args()

    # Load DB
    with open(FULL_DB_PATH) as f:
        db = json.load(f)

    import re
    hex_pat = re.compile(r"^[0-9a-f]{6,}$")
    real = {k: v for k, v in db.items() if not hex_pat.match(k)}

    # Find schools needing essays
    needs_enrichment = []
    for sid, school in real.items():
        essays = school.get("essay_prompts") or []
        if len(essays) < args.min_essays:
            needs_enrichment.append((sid, school, len(essays)))

    needs_enrichment.sort(key=lambda x: x[2])  # Least essays first

    if args.limit:
        needs_enrichment = needs_enrichment[:args.limit]

    print(f"Schools needing enrichment: {len(needs_enrichment)} (target: {args.min_essays}+ essays each)")
    if args.dry_run:
        for sid, school, count in needs_enrichment[:20]:
            name = school.get("name") or sid
            print(f"  {sid}: {count} essays → need {args.min_essays - count} more")
        print("  ... (dry run, no API calls)")
        return

    # Init API client
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY not set")
        sys.exit(1)
    client = anthropic.Anthropic(api_key=api_key)

    enriched = 0
    for i, (sid, school, current_count) in enumerate(needs_enrichment, 1):
        name = school.get("name") or sid.replace("_", " ").title()
        needed = args.min_essays - current_count
        specs = school.get("specializations") or []
        existing = school.get("essay_prompts") or []

        print(f"  [{i}/{len(needs_enrichment)}] {name}: {current_count} → generating {needed} more...")

        generated = generate_essays(client, name, existing, specs, needed)
        if generated:
            # Normalize existing essays to dict format
            normalized_existing = []
            for e in existing:
                if isinstance(e, str):
                    normalized_existing.append({"prompt": e, "word_limit": 500, "required": True, "type": "official"})
                elif isinstance(e, dict):
                    e.setdefault("type", "official")
                    normalized_existing.append(e)

            # Combine
            combined = normalized_existing + generated
            db[sid]["essay_prompts"] = combined
            enriched += 1
            print(f"    → {len(combined)} total essays")

        # Rate limit
        time.sleep(0.5)

    # Save
    with open(FULL_DB_PATH, "w") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    print(f"\nDone: enriched {enriched} schools. Saved to {FULL_DB_PATH}")


if __name__ == "__main__":
    main()
