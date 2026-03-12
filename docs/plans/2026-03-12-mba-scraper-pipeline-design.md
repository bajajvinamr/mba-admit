# MBA Scraper Pipeline — Design Document

**Date:** 2026-03-12
**Goal:** Build the definitive MBA program database by discovering every accredited MBA program globally and enriching each with real, scraped data from school websites.

## Problem

The current `school_db_full.json` contains 254 "real" schools, but the data is AI-generated — not scraped. HBS lists Flipkart as a top recruiter. Essay prompts are generic placeholders. Deadlines say "September 2025" not "September 4, 2025". The data has the shape of reality but isn't real.

## Architecture

Three-stage batch pipeline. Python. Runs locally. Snapshot-based (run once per admissions cycle).

```
Stage 1: DISCOVER        Stage 2: CRAWL           Stage 3: EXTRACT + MERGE
(ranking/accreditation   (Playwright renders       (Claude structures raw
 sites → master list)     each school's pages       text into JSON schema)
                          → cached HTML/text)
```

### Stage 1: Discovery

Scrape ranking sites and accreditation directories to build a deduplicated master list of every MBA program with its website URL.

**Sources:**
| Source | URL Pattern | Est. Programs |
|--------|------------|---------------|
| AACSB Directory | aacsb.edu/accredited | ~900 |
| FT Global MBA | rankings.ft.com | 100 |
| QS Global MBA | topuniversities.com | 300 |
| US News Best MBA | usnews.com/best-graduate-schools | 130 |
| Poets&Quants | poetsandquants.com | 100 |
| GMAC School Search | gmac.com | 800+ |

**Output:** `data/discovery_list.json` — deduplicated list of ~600-800 programs with:
- school name, location, country
- admissions page URL
- source rankings (FT #, QS #, USN #)

**Dedup strategy:** Fuzzy match on school name + city. E.g., "Wharton School" and "The Wharton School, University of Pennsylvania" → same entity.

### Stage 2: Crawl

For each discovered school, use Playwright to render and capture:
1. Main MBA admissions page
2. Class profile / statistics page
3. Essay prompts / application requirements page
4. Employment report / placement page
5. Tuition & financial aid page
6. Deadlines page

**Implementation:**
- Playwright (headless Chromium) for JS-rendered pages
- Rate-limited: 2-second delay between requests per domain
- Respect robots.txt (skip if disallowed)
- Cache raw HTML + extracted text to `data/raw_html/{school_id}/`
- Resume-friendly: skip already-crawled schools on re-run

**Output:** `data/raw_html/{school_id}/*.html` + `data/raw_html/{school_id}/*.txt`

### Stage 3: Extract + Merge

Feed page text to Claude API with structured extraction prompts. Claude returns JSON per school.

**Why Claude, not CSS selectors:** Every school has different HTML. Writing 600 custom parsers is impossible. Claude handles arbitrary page layouts reliably.

**Extraction prompt template:**
```
Given this text from {school_name}'s MBA admissions page:
---
{page_text}
---
Extract as JSON. Use null for anything not found. Do not guess or fabricate.
{field_spec}
```

**Fields extracted:**
- essay_prompts (exact text, current cycle)
- admission_deadlines (round, date, decision date)
- tuition_usd (current year, annual)
- class_profile (avg GMAT, avg GPA, class size, avg age, % female, % international)
- scholarships (name, amount, criteria, URL)
- placement_stats (employment rate, median salary, top recruiters, industry breakdown)
- interview_format (type, duration, format)
- application_url (direct link)
- accreditations

**Confidence scoring:** Claude assigns 0-1 confidence per field. Fields below 0.7 are flagged for manual review.

**Cost estimate:** ~600 schools x 3-5 pages x ~2K tokens = 6-10M tokens ≈ $20-40 in API costs.

**Output:** `data/school_db_scraped.json`

### Merge Strategy

```python
for school in scraped_data:
    if school.id in existing_db:
        # Overwrite generated fields with real scraped data
        # Keep scraped fields, fall back to existing for nulls
        merged[school.id] = {**existing[school.id], **scraped[school.id]}
    else:
        # New school discovered — add to database
        merged[school.id] = scraped[school.id]
```

Every field gets a `data_quality.verified_fields` tag so the frontend can show "Verified" badges.

## Target Schema (per school)

```json
{
  "id": "hbs",
  "name": "Harvard Business School",
  "website": "https://www.hbs.edu/mba/admissions",
  "data_quality": {
    "last_scraped": "2026-03-12",
    "source_urls": ["https://..."],
    "verified_fields": ["essay_prompts", "deadlines", "tuition"],
    "estimated_fields": ["acceptance_rate"],
    "confidence": 0.92
  },
  "location": "Boston, MA",
  "country": "USA",
  "gmat_avg": 730,
  "acceptance_rate": 9.5,
  "class_size": 945,
  "tuition_usd": 74910,
  "median_salary": 175000,
  "specializations": [...],
  "essay_prompts": [...],
  "admission_deadlines": [{"round": "R1", "deadline": "2025-09-04", "decision": "2025-12-10"}],
  "admission_requirements": {...},
  "program_details": {...},
  "placement_stats": {...},
  "unique_features": [...],
  "scholarships": [{"name": "...", "amount": "...", "criteria": "...", "url": "..."}],
  "interview_format": {"type": "blind", "duration": "30 min", "format": "behavioral"},
  "cost_of_living": {"city": "Boston", "monthly_rent_1br": 2800, "monthly_total": 4200},
  "alumni_outcomes": {"by_industry": {...}, "avg_salary_3yr_post": 210000},
  "application_url": "https://...",
  "accreditations": ["AACSB"],
  "rankings": {"ft_2025": 4, "qs_2025": 3, "us_news_2025": 1},
  "stem_designated": true,
  "degree_type": "MBA",
  "program_duration": "2 years"
}
```

## File Structure

```
backend/
  scraper/
    __init__.py
    config.py          # Rate limits, API keys, output paths, constants
    discover.py        # Stage 1: ranking sites → master school list
    crawl.py           # Stage 2: Playwright → cached HTML per school
    extract.py         # Stage 3: Claude API → structured JSON per school
    merge.py           # Combine scraped + existing → final school_db
    utils.py           # Dedup, fuzzy matching, URL normalization
    run.py             # CLI orchestrator: discover | crawl | extract | merge | all
  data/
    discovery_list.json
    school_db_scraped.json
    school_db_full.json (updated)
    raw_html/
      hbs/
        admissions.html
        admissions.txt
        class-profile.html
        ...
```

## Execution

```bash
# Full pipeline
python -m backend.scraper.run all

# Individual stages
python -m backend.scraper.run discover
python -m backend.scraper.run crawl
python -m backend.scraper.run extract
python -m backend.scraper.run merge

# Resume from where we left off (skip already-crawled)
python -m backend.scraper.run crawl --resume

# Extract only specific schools
python -m backend.scraper.run extract --schools hbs,gsb,wharton
```

## Dependencies (new)

- `playwright` (browser automation for JS-rendered pages)
- `anthropic` (Claude API for extraction)
- `thefuzz` or `rapidfuzz` (fuzzy string matching for dedup)

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Schools block scraping | Respect robots.txt, rate limit, rotate user agents |
| Claude hallucinates data | Confidence scoring + null-for-unknown instruction |
| Rankings sites change layout | Claude extraction (not CSS selectors) handles this |
| Some schools have no website | Mark as `data_quality.confidence: 0`, skip |
| Pipeline takes too long | Resume support, parallel crawling (3-5 concurrent) |
| Cost overruns | Batch extraction, cache HTML for re-runs without re-crawling |
