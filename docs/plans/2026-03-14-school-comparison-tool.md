# School Comparison Tool — Design Doc

**Date:** 2026-03-14
**Status:** Approved

## Problem

Applicants deciding between MBA programs need to compare schools side-by-side. Existing tools (US News, Poets&Quants) show marketing stats. We have 12K real admission decisions from GMAT Club — actual admit/deny outcomes with GMAT, GPA, YOE, and industry. That's the differentiator.

## Data sources

| Source | Fields | Coverage |
|--------|--------|----------|
| `school_db_full.json` | Tuition, class size, salary, essays, deadlines, specializations | 7/22 full, rest empty |
| `gmatclub_decisions.json` | Per-applicant: GMAT, GPA, YOE, industry, location, status | All 22 schools, 400-800 each |
| Computed from decisions | Median GMAT/GPA for admits, admit rates by score range, YOE/industry distributions | All 22 schools |

For schools with empty static data, computed stats from GMAT Club fill the gaps.

## API

### `POST /api/schools/compare`

**Input:**
```json
{
  "school_ids": ["hbs", "gsb", "wharton"],
  "profile": { "gmat": 740, "gpa": 3.7, "yoe": 4 }
}
```

**Output per school:**
```json
{
  "school_id": "hbs",
  "name": "Harvard Business School",
  "location": "Boston, MA",
  "static": {
    "tuition_usd": 74910,
    "class_size": 900,
    "acceptance_rate": 9.5,
    "median_salary": "$175,000",
    "stem_designated": true,
    "program_duration": "2 years",
    "specializations": ["General Management", "Finance", ...],
    "essay_count": 3,
    "deadlines": [{ "round": "R1", "deadline": "Sep 2025" }, ...]
  },
  "outcomes": {
    "total_decisions": 811,
    "admit_count": 126,
    "deny_count": 280,
    "waitlist_count": 95,
    "interview_count": 150,
    "median_gmat_admitted": 730,
    "median_gpa_admitted": 3.75,
    "median_yoe_admitted": 5,
    "gmat_distribution": [
      { "range": "600-650", "admitted": 3, "denied": 25 },
      { "range": "650-700", "admitted": 12, "denied": 45 },
      { "range": "700-750", "admitted": 45, "denied": 60 },
      { "range": "750-800", "admitted": 30, "denied": 15 }
    ],
    "gpa_distribution": [
      { "range": "3.0-3.3", "admitted": 5, "denied": 20 },
      { "range": "3.3-3.6", "admitted": 25, "denied": 40 },
      { "range": "3.6-3.9", "admitted": 55, "denied": 35 },
      { "range": "3.9-4.0+", "admitted": 20, "denied": 10 }
    ],
    "top_industries": [
      { "industry": "Consulting", "count": 17, "pct": 13.5 },
      { "industry": "Finance", "count": 12, "pct": 9.5 }
    ],
    "yoe_distribution": [
      { "range": "1-3", "count": 20 },
      { "range": "3-5", "count": 55 },
      { "range": "5-7", "count": 35 },
      { "range": "7+", "count": 16 }
    ]
  },
  "profile_fit": {
    "gmat_percentile": 68,
    "gpa_percentile": 55,
    "yoe_percentile": 42,
    "verdict": "Your 740 GMAT is above the median for HBS admits. GPA is around the median. Consider gaining another year of experience."
  }
}
```

## Page layout

### Top: School selector
Existing UI — chip tags for selected schools, search dropdown, max 4 schools.

### Section A: Your Profile Fit
- Collapsible input panel: GMAT, GPA, YOE fields
- Per-school percentile bars (horizontal, color-coded green/yellow/red)
- One-line verdict per school

### Section B: Admission Outcomes (hero)
- GMAT distribution chart — grouped bar chart, admits vs denies by score range
- GPA distribution chart — same format
- Admit rate by GMAT range — line chart showing % admitted per score bucket
- Top industries — horizontal bar chart

### Section C: Program Stats (table)
- Location, tuition, class size, acceptance rate, median salary, STEM, duration
- Computed fallbacks from GMAT Club where static data is missing

### Section D: Application Details (table)
- Essay count, deadlines, specializations

### Bottom CTA
"See where you stand → Calculate My Odds" or "Start your application"

## Charting

`recharts` — React-native, ~45KB gzip. Supports BarChart, RadarChart, ResponsiveContainer.

## Implementation sequence

1. Backend: `POST /api/schools/compare` endpoint with outcome computation
2. Frontend: Install recharts, build comparison page
3. Charts: GMAT distribution, GPA distribution, industry breakdown
4. Profile fit: percentile computation + verdicts
5. Polish: mobile responsiveness, empty state, loading states
