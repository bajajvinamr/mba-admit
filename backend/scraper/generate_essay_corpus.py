"""Generate a diverse, high-quality MBA essay corpus using Claude API.

Uses real school essay prompts from the scraped DB and generates realistic essays
across diverse applicant profiles, backgrounds, industries, and outcomes.

Each essay includes:
- Full essay text (300-700 words)
- School + prompt it's responding to
- Applicant profile (GMAT, GPA, industry, years, nationality)
- Outcome (admitted/rejected/waitlisted) weighted realistically
- Quality notes (strengths/weaknesses from admissions perspective)

Usage:
    python -m scraper.generate_essay_corpus --count 500 [--batch-size 5]
"""

import asyncio
import json
import logging
import os
import random
import hashlib
from datetime import datetime
from pathlib import Path

from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=True)

logger = logging.getLogger("scraper.essay_gen")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
OUTPUT_FILE = DATA_DIR / "essay_corpus.json"

client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

# ── Profile Templates ─────────────────────────────────────────────────────────

INDUSTRIES = [
    "Consulting (MBB)", "Consulting (Big 4)", "Investment Banking",
    "Private Equity", "Venture Capital", "Asset Management",
    "Tech (FAANG)", "Tech (Startup)", "Tech (Enterprise SaaS)",
    "Healthcare", "Pharma/Biotech", "Medical Devices",
    "Consumer Goods/CPG", "Retail/E-commerce",
    "Energy/Oil & Gas", "Renewable Energy",
    "Military/Government", "Non-Profit/NGO",
    "Education", "Real Estate",
    "Manufacturing", "Supply Chain/Logistics",
    "Media/Entertainment", "Telecommunications",
    "Legal", "Accounting",
    "Family Business", "Entrepreneurship",
]

NATIONALITIES = [
    "American", "Indian", "Chinese", "Brazilian", "Nigerian",
    "Korean", "Japanese", "German", "French", "British",
    "Canadian", "Mexican", "Colombian", "Peruvian",
    "Turkish", "Israeli", "Emirati", "Saudi",
    "Kenyan", "South African", "Egyptian",
    "Thai", "Vietnamese", "Filipino", "Indonesian",
    "Australian", "Singaporean", "Pakistani",
    "Russian", "Italian", "Spanish", "Swedish",
]

# Realistic GMAT distributions by outcome
GMAT_RANGES = {
    "admitted": [(720, 780, 0.4), (680, 720, 0.35), (640, 680, 0.15), (600, 640, 0.1)],
    "waitlisted": [(700, 760, 0.3), (660, 700, 0.4), (620, 660, 0.2), (580, 620, 0.1)],
    "rejected": [(660, 720, 0.25), (620, 660, 0.35), (580, 620, 0.25), (540, 580, 0.15)],
}

GPA_RANGES = {
    "admitted": [(3.6, 4.0, 0.5), (3.3, 3.6, 0.35), (3.0, 3.3, 0.15)],
    "waitlisted": [(3.4, 3.9, 0.4), (3.1, 3.4, 0.4), (2.8, 3.1, 0.2)],
    "rejected": [(3.2, 3.7, 0.3), (2.9, 3.2, 0.4), (2.5, 2.9, 0.3)],
}

OUTCOMES_WEIGHTS = [("admitted", 0.35), ("waitlisted", 0.20), ("rejected", 0.45)]

YEARS_EXP_RANGE = (2, 12)

# ── School Prompts ────────────────────────────────────────────────────────────

def load_school_prompts() -> list[dict]:
    """Load real essay prompts from scraped school data."""
    prompts = []

    # From scraped DB (highest quality)
    scraped_db = json.load(open(DATA_DIR / "school_db_scraped.json"))
    for sid, school in scraped_db.items():
        essay_data = school.get("essay_prompts") or []
        name = school.get("name", sid)
        for ep in essay_data:
            if isinstance(ep, dict):
                prompt_text = ep.get("prompt") or ep.get("question") or ""
                word_limit = ep.get("word_limit")
            elif ep is not None:
                prompt_text = str(ep)
                word_limit = None
            else:
                continue

            if prompt_text and len(prompt_text) > 20:
                prompts.append({
                    "school_id": sid,
                    "school_name": name,
                    "prompt": prompt_text,
                    "word_limit": word_limit,
                    "source": "scraped",
                })

    # From full DB (for schools not in scraped)
    full_db = json.load(open(DATA_DIR / "school_db_full.json"))
    scraped_ids = set(scraped_db.keys())

    # Only use known real school IDs (not hex-hash synthetic schools)
    import re
    _hex_re = re.compile(r'^[0-9a-f]{6,}$')
    for sid, school in full_db.items():
        if sid in scraped_ids:
            continue
        if _hex_re.match(sid):  # Skip hex-ID synthetic schools
            continue
        essay_data = school.get("essay_prompts") or []
        name = school.get("name", sid)
        for ep in essay_data:
            prompt_text = str(ep) if not isinstance(ep, dict) else ep.get("prompt", str(ep))
            if len(prompt_text) > 20:
                prompts.append({
                    "school_id": sid,
                    "school_name": name,
                    "prompt": prompt_text,
                    "word_limit": None,
                    "source": "full_db",
                })

    logger.info(f"Loaded {len(prompts)} essay prompts from {len(set(p['school_id'] for p in prompts))} schools")
    return prompts


def _weighted_choice(ranges: list[tuple]) -> float:
    """Pick from weighted ranges."""
    r = random.random()
    cumulative = 0
    for low, high, weight in ranges:
        cumulative += weight
        if r <= cumulative:
            return round(random.uniform(low, high), 1 if high < 5 else 0)
    return round(random.uniform(ranges[0][0], ranges[0][1]), 1 if ranges[0][1] < 5 else 0)


def generate_profile(outcome: str) -> dict:
    """Generate a realistic applicant profile."""
    gmat = int(_weighted_choice(GMAT_RANGES[outcome]))
    gpa = round(_weighted_choice(GPA_RANGES[outcome]), 2)
    yoe = random.randint(*YEARS_EXP_RANGE)

    return {
        "gmat": gmat,
        "gpa": gpa,
        "years_experience": yoe,
        "industry": random.choice(INDUSTRIES),
        "nationality": random.choice(NATIONALITIES),
        "gender": random.choice(["male", "female", "non-binary"]),
    }


def pick_outcome() -> str:
    """Pick a weighted outcome."""
    r = random.random()
    cumulative = 0
    for outcome, weight in OUTCOMES_WEIGHTS:
        cumulative += weight
        if r <= cumulative:
            return outcome
    return "admitted"


# ── Claude API Essay Generation ──────────────────────────────────────────────


SYSTEM_PROMPT = """You are an expert MBA admissions essay writer and coach. You write essays that sound like real MBA applicants — authentic, specific, and voice-driven.

Key principles:
- Every essay should sound like a REAL person wrote it, not an AI
- Use specific details: company names (disguised), dollar amounts, team sizes, city names
- Include moments of vulnerability, failure, or genuine uncertainty
- Match writing quality to the applicant profile (stronger profiles write more polished essays, weaker profiles have more rough edges)
- Vary voice: some essays are narrative/storytelling, some are analytical, some are introspective
- For rejected applicants: the essays should have real weaknesses (generic, cliché, too short, poor structure, fails to answer the prompt, doesn't show self-awareness)
- For waitlisted: good but missing something (lacks specificity, or doesn't connect well to the school)
- For admitted: compelling, authentic, shows growth, specific to the school

CRITICAL: Do NOT use AI-typical phrases like "leveraging", "holistic", "synergies", "passionate about making a difference", "at the intersection of". Write like a human."""


def _build_essay_prompt(
    school_name: str,
    essay_prompt: str,
    word_limit: int | None,
    profile: dict,
    outcome: str,
) -> str:
    """Build the Claude prompt for generating one essay."""

    target_words = word_limit or random.choice([350, 450, 500, 600])
    quality_instruction = {
        "admitted": "Write a STRONG essay that would impress an admissions committee. Authentic voice, specific details, genuine self-reflection, clear school fit.",
        "waitlisted": "Write a DECENT but not outstanding essay. Good writing but missing something — maybe too generic, or doesn't connect well to the school, or lacks a clear 'so what'.",
        "rejected": "Write a WEAK essay with realistic flaws. Could be: too generic, cliché-heavy, doesn't answer the prompt, no specific details, reads like ChatGPT, too short, or fails to show self-awareness. Pick 1-2 realistic flaws.",
    }

    return f"""Write an MBA application essay for the following scenario:

SCHOOL: {school_name}
ESSAY PROMPT: "{essay_prompt}"
TARGET LENGTH: ~{target_words} words

APPLICANT PROFILE:
- GMAT: {profile['gmat']}
- GPA: {profile['gpa']}
- Years of work experience: {profile['years_experience']}
- Industry: {profile['industry']}
- Nationality: {profile['nationality']}
- Gender: {profile['gender']}

OUTCOME: This applicant was {outcome.upper()}.

QUALITY: {quality_instruction[outcome]}

Respond with ONLY the essay text — no preamble, no explanation, no quotes around it. Just the essay as the applicant would submit it."""


async def generate_essays(
    count: int = 500,
    batch_size: int = 5,
) -> list[dict]:
    """Generate diverse essay corpus."""

    prompts = load_school_prompts()
    if not prompts:
        logger.error("No essay prompts found!")
        return []

    # Load existing
    existing = []
    if OUTPUT_FILE.exists():
        existing = json.load(open(OUTPUT_FILE))
        logger.info(f"Loaded {len(existing)} existing essays")

    existing_hashes = {e.get("content_hash", "") for e in existing}

    essays = list(existing)
    generated = 0
    errors = 0

    logger.info(f"Generating {count} essays from {len(prompts)} prompts...")

    # Weight scraped (real) prompts 3x higher than full_db prompts
    scraped_prompts = [p for p in prompts if p["source"] == "scraped"]
    other_prompts = [p for p in prompts if p["source"] != "scraped"]
    weighted_prompts = scraped_prompts * 3 + other_prompts

    while generated < count:
        # Pick random prompt (weighted toward real scraped schools)
        prompt_data = random.choice(weighted_prompts)
        outcome = pick_outcome()
        profile = generate_profile(outcome)

        user_prompt = _build_essay_prompt(
            school_name=prompt_data["school_name"],
            essay_prompt=prompt_data["prompt"],
            word_limit=prompt_data.get("word_limit"),
            profile=profile,
            outcome=outcome,
        )

        try:
            response = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=1500,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_prompt}],
            )

            essay_text = response.content[0].text.strip()
            content_hash = hashlib.sha256(essay_text.encode()).hexdigest()[:12]

            if content_hash in existing_hashes:
                continue  # Skip duplicate

            word_count = len(essay_text.split())
            if word_count < 50:
                logger.warning(f"Too short ({word_count} words), skipping")
                continue

            essay = {
                "id": f"gen-{content_hash}",
                "content_hash": content_hash,
                "school_id": prompt_data["school_id"],
                "school_name": prompt_data["school_name"],
                "prompt": prompt_data["prompt"],
                "content": essay_text,
                "word_count": word_count,
                "outcome": outcome,
                "profile": profile,
                "source": "claude_generated",
                "model": "claude-haiku-4-5-20251001",
                "generated_at": datetime.now().isoformat(),
            }
            essays.append(essay)
            existing_hashes.add(content_hash)
            generated += 1

            if generated % 10 == 0:
                logger.info(f"  Generated {generated}/{count} essays")
                # Save checkpoint
                with open(OUTPUT_FILE, "w") as f:
                    json.dump(essays, f, indent=2, ensure_ascii=False)

        except Exception as e:
            errors += 1
            logger.error(f"  API error: {e}")
            if errors > 10:
                logger.error("Too many errors, stopping")
                break
            await asyncio.sleep(2)
            continue

        # Small delay to avoid rate limits
        if generated % batch_size == 0:
            await asyncio.sleep(0.5)

    # Final save
    with open(OUTPUT_FILE, "w") as f:
        json.dump(essays, f, indent=2, ensure_ascii=False)

    logger.info(f"\nDone. Generated {generated} essays ({errors} errors)")
    logger.info(f"Total corpus: {len(essays)} essays saved to {OUTPUT_FILE}")

    # Summary
    from collections import Counter
    outcome_counts = Counter(e["outcome"] for e in essays if e.get("source") == "claude_generated")
    school_counts = Counter(e["school_id"] for e in essays if e.get("source") == "claude_generated")

    logger.info(f"\nOutcome distribution:")
    for o, c in outcome_counts.most_common():
        logger.info(f"  {o}: {c}")

    logger.info(f"\nTop schools:")
    for s, c in school_counts.most_common(10):
        logger.info(f"  {s}: {c}")

    return essays


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Generate MBA essay corpus")
    parser.add_argument("--count", type=int, default=500, help="Number of essays to generate")
    parser.add_argument("--batch-size", type=int, default=5, help="Batch size between pauses")
    args = parser.parse_args()

    asyncio.run(generate_essays(count=args.count, batch_size=args.batch_size))


if __name__ == "__main__":
    main()
