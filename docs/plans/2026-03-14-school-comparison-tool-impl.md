# School Comparison Tool — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite the comparison tool to show GMAT Club outcome data (distributions, admit rates, industries) alongside static school stats, with personalized profile-fit percentiles and recharts visualizations.

**Architecture:** Backend computes outcome stats from `gmatclub_decisions.json` per school, merges with static `school_db_full.json` data, and computes profile-fit percentiles. Frontend renders 4 sections: profile fit bars, distribution charts (recharts), program stats table, application details.

**Tech Stack:** Python/FastAPI (backend), Next.js 16 + React 19 + TypeScript + recharts (frontend), Tailwind v4 for styling.

---

### Task 1: Update the Pydantic request model to accept profile data

**Files:**
- Modify: `backend/models.py` (line ~170)

**Step 1: Add profile fields to CompareSchoolsRequest**

Open `backend/models.py` and find the existing model:

```python
class CompareSchoolsRequest(BaseModel):
    school_ids: List[str] = Field(min_length=2, max_length=4)
```

Replace with:

```python
class CompareSchoolsRequest(BaseModel):
    school_ids: List[str] = Field(min_length=2, max_length=4)
    profile: Optional[dict] = Field(default=None, description="Optional user profile: {gmat, gpa, yoe}")
```

The `profile` dict is optional — the comparison works without it, but when present, the response includes percentile placement per school.

**Step 2: Verify no import changes needed**

`Optional` is already imported in models.py. Confirm with a quick grep.

**Step 3: Commit**

```bash
git add backend/models.py
git commit -m "feat(compare): add optional profile field to CompareSchoolsRequest"
```

---

### Task 2: Write the outcome computation helper

**Files:**
- Create: `backend/compare_engine.py`
- Test: `backend/tests/test_compare_engine.py`

This is the core logic — takes raw GMAT Club entries for a school and computes distributions, medians, and profile percentiles. Isolating it from the router makes it independently testable.

**Step 1: Write the failing test**

Create `backend/tests/test_compare_engine.py`:

```python
"""Tests for compare_engine — outcome stats + profile fit computation."""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from compare_engine import compute_school_outcomes, compute_profile_fit


SAMPLE_DECISIONS = [
    {"school_id": "hbs", "status": "Admitted", "gmat": 740, "gpa": 3.8, "yoe": 5, "industry": "Consulting"},
    {"school_id": "hbs", "status": "Admitted", "gmat": 720, "gpa": 3.6, "yoe": 4, "industry": "Finance"},
    {"school_id": "hbs", "status": "Admitted", "gmat": 760, "gpa": 3.9, "yoe": 6, "industry": "Consulting"},
    {"school_id": "hbs", "status": "Denied without Interview", "gmat": 680, "gpa": 3.2, "yoe": 3, "industry": "Tech"},
    {"school_id": "hbs", "status": "Denied without Interview", "gmat": 650, "gpa": 3.0, "yoe": 2, "industry": "Tech"},
    {"school_id": "hbs", "status": "Waitlisted", "gmat": 710, "gpa": 3.5, "yoe": 4, "industry": "Finance"},
    {"school_id": "hbs", "status": "Interviewed", "gmat": 730, "gpa": 3.7, "yoe": 5, "industry": "Consulting"},
]


def test_compute_outcomes_counts():
    result = compute_school_outcomes(SAMPLE_DECISIONS)
    assert result["total_decisions"] == 7
    assert result["admit_count"] == 3
    assert result["deny_count"] == 2


def test_compute_outcomes_medians():
    result = compute_school_outcomes(SAMPLE_DECISIONS)
    # Admitted GMATs: 720, 740, 760 → median 740
    assert result["median_gmat_admitted"] == 740
    # Admitted GPAs: 3.6, 3.8, 3.9 → median 3.8
    assert result["median_gpa_admitted"] == 3.8


def test_compute_outcomes_gmat_distribution():
    result = compute_school_outcomes(SAMPLE_DECISIONS)
    dist = result["gmat_distribution"]
    # Should have buckets; entries span 650-760
    assert isinstance(dist, list)
    assert len(dist) > 0
    assert all("range" in b and "admitted" in b and "denied" in b for b in dist)


def test_compute_outcomes_top_industries():
    result = compute_school_outcomes(SAMPLE_DECISIONS)
    industries = result["top_industries"]
    # Consulting appears 3 times among admits
    assert industries[0]["industry"] == "Consulting"


def test_compute_outcomes_yoe_distribution():
    result = compute_school_outcomes(SAMPLE_DECISIONS)
    yoe_dist = result["yoe_distribution"]
    assert isinstance(yoe_dist, list)
    assert all("range" in b and "count" in b for b in yoe_dist)


def test_profile_fit_percentile():
    result = compute_profile_fit(
        decisions=SAMPLE_DECISIONS,
        profile={"gmat": 740, "gpa": 3.7, "yoe": 5},
    )
    assert "gmat_percentile" in result
    assert "gpa_percentile" in result
    assert "yoe_percentile" in result
    assert "verdict" in result
    assert 0 <= result["gmat_percentile"] <= 100


def test_profile_fit_no_profile():
    result = compute_profile_fit(decisions=SAMPLE_DECISIONS, profile=None)
    assert result is None
```

**Step 2: Run test to verify it fails**

```bash
cd /Users/vinamr/Documents/mba-admissions-ai/backend && python -m pytest tests/test_compare_engine.py -v
```

Expected: `ModuleNotFoundError: No module named 'compare_engine'`

**Step 3: Write the implementation**

Create `backend/compare_engine.py`:

```python
"""Compute outcome stats and profile fit from GMAT Club decision data."""

from statistics import median
from collections import Counter

ADMIT_KEYWORDS = ("admitted", "admit")
DENY_KEYWORDS = ("denied", "deny")
WAITLIST_KEYWORDS = ("waitlist",)
INTERVIEW_KEYWORDS = ("interview",)

GMAT_BUCKETS = [(600, 650), (650, 700), (700, 750), (750, 800)]
GPA_BUCKETS = [(3.0, 3.3), (3.3, 3.6), (3.6, 3.9), (3.9, 4.1)]
YOE_BUCKETS = [(1, 3), (3, 5), (5, 7), (7, 99)]


def _status_match(status: str, keywords: tuple[str, ...]) -> bool:
    s = status.lower()
    return any(k in s for k in keywords)


def _get_gmat(d: dict) -> int | None:
    return d.get("gmat") or d.get("gmat_focus")


def _bucket_label(lo: int | float, hi: int | float) -> str:
    if hi >= 99:
        return f"{lo}+"
    return f"{lo}-{hi}"


def compute_school_outcomes(decisions: list[dict]) -> dict:
    """Compute aggregate outcome stats from a list of GMAT Club decisions for ONE school."""
    total = len(decisions)
    admits = [d for d in decisions if _status_match(d.get("status", ""), ADMIT_KEYWORDS)]
    denies = [d for d in decisions if _status_match(d.get("status", ""), DENY_KEYWORDS)]
    waitlists = [d for d in decisions if _status_match(d.get("status", ""), WAITLIST_KEYWORDS)]
    interviews = [d for d in decisions if _status_match(d.get("status", ""), INTERVIEW_KEYWORDS)]

    # Medians for admitted applicants
    admit_gmats = [_get_gmat(d) for d in admits if _get_gmat(d)]
    admit_gpas = [d["gpa"] for d in admits if d.get("gpa")]
    admit_yoes = [d["yoe"] for d in admits if d.get("yoe")]

    # GMAT distribution — admits vs denies per bucket
    gmat_dist = []
    for lo, hi in GMAT_BUCKETS:
        admitted = sum(1 for d in admits if _get_gmat(d) and lo <= _get_gmat(d) < hi)
        denied = sum(1 for d in denies if _get_gmat(d) and lo <= _get_gmat(d) < hi)
        gmat_dist.append({"range": _bucket_label(lo, hi), "admitted": admitted, "denied": denied})

    # GPA distribution
    gpa_dist = []
    for lo, hi in GPA_BUCKETS:
        admitted = sum(1 for d in admits if d.get("gpa") and lo <= d["gpa"] < hi)
        denied = sum(1 for d in denies if d.get("gpa") and lo <= d["gpa"] < hi)
        gpa_dist.append({"range": _bucket_label(lo, hi), "admitted": admitted, "denied": denied})

    # Top industries among admits
    industry_counts = Counter(d.get("industry") for d in admits if d.get("industry"))
    top_industries = [
        {"industry": ind, "count": cnt, "pct": round(cnt / len(admits) * 100, 1) if admits else 0}
        for ind, cnt in industry_counts.most_common(8)
    ]

    # YOE distribution among admits
    yoe_dist = []
    for lo, hi in YOE_BUCKETS:
        count = sum(1 for d in admits if d.get("yoe") and lo <= d["yoe"] < hi)
        yoe_dist.append({"range": _bucket_label(lo, hi), "count": count})

    return {
        "total_decisions": total,
        "admit_count": len(admits),
        "deny_count": len(denies),
        "waitlist_count": len(waitlists),
        "interview_count": len(interviews),
        "median_gmat_admitted": int(median(admit_gmats)) if admit_gmats else None,
        "median_gpa_admitted": round(median(admit_gpas), 2) if admit_gpas else None,
        "median_yoe_admitted": int(median(admit_yoes)) if admit_yoes else None,
        "gmat_distribution": gmat_dist,
        "gpa_distribution": gpa_dist,
        "top_industries": top_industries,
        "yoe_distribution": yoe_dist,
    }


def compute_profile_fit(decisions: list[dict], profile: dict | None) -> dict | None:
    """Compute where a user's profile sits among admitted applicants."""
    if not profile:
        return None

    admits = [d for d in decisions if _status_match(d.get("status", ""), ADMIT_KEYWORDS)]
    if not admits:
        return None

    user_gmat = profile.get("gmat")
    user_gpa = profile.get("gpa")
    user_yoe = profile.get("yoe")

    def percentile(values: list, user_val) -> int:
        if not values or user_val is None:
            return 50  # default when no data
        below = sum(1 for v in values if v < user_val)
        return int(below / len(values) * 100)

    admit_gmats = sorted([_get_gmat(d) for d in admits if _get_gmat(d)])
    admit_gpas = sorted([d["gpa"] for d in admits if d.get("gpa")])
    admit_yoes = sorted([d["yoe"] for d in admits if d.get("yoe")])

    gmat_pct = percentile(admit_gmats, user_gmat)
    gpa_pct = percentile(admit_gpas, user_gpa)
    yoe_pct = percentile(admit_yoes, user_yoe)

    # Build one-line verdict
    parts = []
    median_gmat = int(median(admit_gmats)) if admit_gmats else None
    if user_gmat and median_gmat:
        diff = user_gmat - median_gmat
        if diff > 10:
            parts.append(f"Your {user_gmat} GMAT is above the median ({median_gmat}) for admits.")
        elif diff < -10:
            parts.append(f"Your {user_gmat} GMAT is below the median ({median_gmat}) for admits.")
        else:
            parts.append(f"Your {user_gmat} GMAT is around the median ({median_gmat}) for admits.")

    median_gpa_val = round(median(admit_gpas), 2) if admit_gpas else None
    if user_gpa and median_gpa_val:
        diff = user_gpa - median_gpa_val
        if diff > 0.1:
            parts.append(f"GPA is strong.")
        elif diff < -0.1:
            parts.append(f"GPA is below the median ({median_gpa_val}).")
        else:
            parts.append(f"GPA is around the median.")

    median_yoe_val = int(median(admit_yoes)) if admit_yoes else None
    if user_yoe and median_yoe_val:
        if user_yoe < median_yoe_val - 1:
            parts.append(f"Consider gaining more experience (median: {median_yoe_val} years).")

    verdict = " ".join(parts) if parts else "Profile data limited — check individual metrics."

    return {
        "gmat_percentile": gmat_pct,
        "gpa_percentile": gpa_pct,
        "yoe_percentile": yoe_pct,
        "verdict": verdict,
    }
```

**Step 4: Run tests to verify they pass**

```bash
cd /Users/vinamr/Documents/mba-admissions-ai/backend && python -m pytest tests/test_compare_engine.py -v
```

Expected: all 7 tests PASS.

**Step 5: Commit**

```bash
git add backend/compare_engine.py backend/tests/test_compare_engine.py
git commit -m "feat(compare): add outcome computation engine with tests"
```

---

### Task 3: Rewrite the compare endpoint to return outcomes + profile fit

**Files:**
- Modify: `backend/routers/features.py` (lines 30-61)
- Modify: `backend/routers/tools.py` (reuse `_load_gmatclub_data`)
- Test: `backend/tests/test_features.py` (update existing tests)

The current endpoint just returns static school DB fields. Rewrite it to:
1. Load GMAT Club decisions per school
2. Run `compute_school_outcomes` + `compute_profile_fit`
3. Merge with static data from `SCHOOL_DB`
4. Return the combined payload

**Step 1: Move `_load_gmatclub_data` to a shared location**

The loader is currently in `routers/tools.py`. Move it to `compare_engine.py` so both routers can import it.

Add to the **top** of `backend/compare_engine.py`:

```python
import json
from pathlib import Path

_GMATCLUB_DATA: list[dict] | None = None

def load_gmatclub_data() -> list[dict]:
    global _GMATCLUB_DATA
    if _GMATCLUB_DATA is not None:
        return _GMATCLUB_DATA
    path = Path(__file__).resolve().parent / "data" / "gmatclub_decisions.json"
    if path.exists():
        with open(path) as f:
            _GMATCLUB_DATA = json.load(f)
    else:
        _GMATCLUB_DATA = []
    return _GMATCLUB_DATA
```

Then update `routers/tools.py` to import from `compare_engine`:

```python
from compare_engine import load_gmatclub_data
```

Remove the old `_GMATCLUB_DATA` variable and `_load_gmatclub_data` function from `tools.py`. Replace all calls of `_load_gmatclub_data()` with `load_gmatclub_data()`.

**Step 2: Rewrite the compare endpoint**

Replace the `compare_schools` function in `backend/routers/features.py`:

```python
from compare_engine import load_gmatclub_data, compute_school_outcomes, compute_profile_fit

@router.post("/schools/compare")
def compare_schools(req: CompareSchoolsRequest):
    """Side-by-side comparison of 2-4 schools with outcome data and profile fit."""
    all_decisions = load_gmatclub_data()
    schools = []

    for sid in req.school_ids:
        school = SCHOOL_DB.get(sid)
        if not school:
            continue

        # Filter decisions for this school
        school_decisions = [d for d in all_decisions if d.get("school_id") == sid]

        # Compute outcomes from GMAT Club data
        outcomes = compute_school_outcomes(school_decisions) if school_decisions else None

        # Compute profile fit if user provided profile
        profile_fit = compute_profile_fit(school_decisions, req.profile) if school_decisions else None

        # Static data from school DB — with fallbacks from computed data
        static = {
            "tuition_usd": school.get("tuition_usd"),
            "class_size": school.get("class_size"),
            "acceptance_rate": school.get("acceptance_rate"),
            "median_salary": school.get("median_salary"),
            "stem_designated": school.get("program_details", {}).get("stem_designated"),
            "program_duration": school.get("program_details", {}).get("duration"),
            "specializations": school.get("specializations", []),
            "essay_count": len(school.get("essay_prompts", [])),
            "deadlines": school.get("admission_deadlines", []),
        }

        schools.append({
            "school_id": sid,
            "name": school.get("name"),
            "location": school.get("location", ""),
            "static": static,
            "outcomes": outcomes,
            "profile_fit": profile_fit,
        })

    if len(schools) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 valid school IDs")

    return {"schools": schools}
```

**Step 3: Update existing tests**

In `backend/tests/test_features.py`, update `test_compare_schools`:

```python
def test_compare_schools(client):
    resp = client.post("/api/schools/compare", json={"school_ids": ["hbs", "gsb"]})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["schools"]) == 2
    names = [s["name"] for s in data["schools"]]
    assert "Harvard Business School" in names

    # Check new structure
    hbs = data["schools"][0]
    assert "static" in hbs
    assert "outcomes" in hbs
    assert hbs["profile_fit"] is None  # no profile provided


def test_compare_schools_with_profile(client):
    resp = client.post("/api/schools/compare", json={
        "school_ids": ["hbs", "gsb"],
        "profile": {"gmat": 740, "gpa": 3.7, "yoe": 4}
    })
    assert resp.status_code == 200
    data = resp.json()
    hbs = data["schools"][0]
    if hbs["outcomes"]:  # only if GMAT Club data exists
        assert hbs["profile_fit"] is not None
        assert "gmat_percentile" in hbs["profile_fit"]
        assert "verdict" in hbs["profile_fit"]
```

**Step 4: Run all backend tests**

```bash
cd /Users/vinamr/Documents/mba-admissions-ai/backend && python -m pytest tests/ -v
```

Expected: all tests PASS.

**Step 5: Commit**

```bash
git add backend/routers/features.py backend/routers/tools.py backend/compare_engine.py backend/tests/test_features.py
git commit -m "feat(compare): rewrite endpoint with outcome stats + profile fit"
```

---

### Task 4: Install recharts in the frontend

**Files:**
- Modify: `frontend/package.json`

**Step 1: Install recharts**

```bash
cd /Users/vinamr/Documents/mba-admissions-ai/frontend && npm install recharts
```

recharts is ~45KB gzipped, React-native, supports BarChart, LineChart, RadarChart, ResponsiveContainer.

**Step 2: Verify build still passes**

```bash
cd /Users/vinamr/Documents/mba-admissions-ai/frontend && npm run build
```

Expected: build succeeds with no errors.

**Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: install recharts for comparison charts"
```

---

### Task 5: Build the chart components

**Files:**
- Create: `frontend/src/components/charts/GmatDistributionChart.tsx`
- Create: `frontend/src/components/charts/GpaDistributionChart.tsx`
- Create: `frontend/src/components/charts/IndustryChart.tsx`
- Create: `frontend/src/components/charts/ProfileFitBars.tsx`

These are reusable chart components that receive data props and render recharts visualizations. Splitting them out keeps the compare page manageable.

**Step 1: Create GMAT distribution chart**

Create `frontend/src/components/charts/GmatDistributionChart.tsx`:

```tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

type GmatBucket = { range: string; admitted: number; denied: number };
type Props = { data: Record<string, GmatBucket[]>; schoolNames: Record<string, string> };

const COLORS = ["#C5A572", "#2D2D2D", "#6B8E7B", "#B85C38"];

export function GmatDistributionChart({ data, schoolNames }: Props) {
  // Merge all schools into grouped bar format
  const allRanges = Object.values(data)[0]?.map((b) => b.range) || [];
  const merged = allRanges.map((range) => {
    const row: Record<string, string | number> = { range };
    for (const [sid, buckets] of Object.entries(data)) {
      const bucket = buckets.find((b) => b.range === range);
      row[`${sid}_admitted`] = bucket?.admitted || 0;
      row[`${sid}_denied`] = bucket?.denied || 0;
    }
    return row;
  });

  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-widest text-charcoal/40 mb-4">
        GMAT Distribution — Admits vs Denials
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={merged} barGap={1} barCategoryGap="15%">
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis dataKey="range" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {Object.keys(data).map((sid, i) => (
            <Bar
              key={`${sid}_admitted`}
              dataKey={`${sid}_admitted`}
              name={`${schoolNames[sid] || sid} — Admitted`}
              fill={COLORS[i % COLORS.length]}
              opacity={0.9}
            />
          ))}
          {Object.keys(data).map((sid, i) => (
            <Bar
              key={`${sid}_denied`}
              dataKey={`${sid}_denied`}
              name={`${schoolNames[sid] || sid} — Denied`}
              fill={COLORS[i % COLORS.length]}
              opacity={0.3}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Step 2: Create GPA distribution chart**

Create `frontend/src/components/charts/GpaDistributionChart.tsx` — same pattern as GMAT, but with GPA buckets. Use a copy of `GmatDistributionChart` with the heading changed to "GPA Distribution".

**Step 3: Create industry chart**

Create `frontend/src/components/charts/IndustryChart.tsx`:

```tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

type IndustryEntry = { industry: string; count: number; pct: number };
type Props = { data: Record<string, IndustryEntry[]>; schoolNames: Record<string, string> };

const COLORS = ["#C5A572", "#2D2D2D", "#6B8E7B", "#B85C38"];

export function IndustryChart({ data, schoolNames }: Props) {
  // Collect all unique industries across schools, take top 6
  const allIndustries = new Set<string>();
  for (const entries of Object.values(data)) {
    entries.forEach((e) => allIndustries.add(e.industry));
  }
  const topIndustries = [...allIndustries].slice(0, 6);

  const merged = topIndustries.map((industry) => {
    const row: Record<string, string | number> = { industry };
    for (const [sid, entries] of Object.entries(data)) {
      const entry = entries.find((e) => e.industry === industry);
      row[sid] = entry?.pct || 0;
    }
    return row;
  });

  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-widest text-charcoal/40 mb-4">
        Top Industries — Admitted Applicants
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={merged} layout="vertical" barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis type="number" tick={{ fontSize: 12 }} unit="%" />
          <YAxis dataKey="industry" type="category" width={100} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          {Object.keys(data).map((sid, i) => (
            <Bar
              key={sid}
              dataKey={sid}
              name={schoolNames[sid] || sid}
              fill={COLORS[i % COLORS.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Step 4: Create profile fit bars**

Create `frontend/src/components/charts/ProfileFitBars.tsx`:

```tsx
"use client";

type ProfileFit = {
  gmat_percentile: number;
  gpa_percentile: number;
  yoe_percentile: number;
  verdict: string;
};

type Props = {
  fits: { schoolId: string; name: string; fit: ProfileFit }[];
};

function pctColor(pct: number): string {
  if (pct >= 60) return "bg-green-500";
  if (pct >= 40) return "bg-yellow-500";
  return "bg-red-400";
}

export function ProfileFitBars({ fits }: Props) {
  return (
    <div className="space-y-6">
      {fits.map(({ schoolId, name, fit }) => (
        <div key={schoolId}>
          <h4 className="font-bold text-sm text-jet mb-1">{name}</h4>
          <div className="space-y-1.5">
            {[
              { label: "GMAT", pct: fit.gmat_percentile },
              { label: "GPA", pct: fit.gpa_percentile },
              { label: "YOE", pct: fit.yoe_percentile },
            ].map(({ label, pct }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-charcoal/50 w-10">{label}</span>
                <div className="flex-1 h-3 bg-jet/5 relative">
                  <div
                    className={`h-full ${pctColor(pct)} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-jet w-8 text-right">{pct}%</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-charcoal/50 mt-1.5">{fit.verdict}</p>
        </div>
      ))}
    </div>
  );
}
```

**Step 5: Verify build**

```bash
cd /Users/vinamr/Documents/mba-admissions-ai/frontend && npm run build
```

Expected: build succeeds. Chart components won't be imported yet, but they should compile cleanly.

**Step 6: Commit**

```bash
git add frontend/src/components/charts/
git commit -m "feat(compare): add recharts visualization components"
```

---

### Task 6: Rewrite the compare page

**Files:**
- Modify: `frontend/src/app/compare/page.tsx` (complete rewrite)

This is the biggest task. Rewrite the page to:
1. Keep the existing school selector UI (chips + search dropdown)
2. Add collapsible profile input panel (GMAT, GPA, YOE)
3. Call the new API with profile data
4. Render 4 sections: Profile Fit, Outcome Charts, Program Stats, App Details

**Step 1: Rewrite the page**

Replace the entire contents of `frontend/src/app/compare/page.tsx`. The key changes:

- **Types**: Replace `ComparedSchool` with the new API response shape (school_id, name, location, static, outcomes, profile_fit).
- **Profile panel**: Collapsible section with GMAT/GPA/YOE inputs. State: `profile` object.
- **API call**: `runComparison` now sends `{ school_ids, profile }` to `POST /api/schools/compare`.
- **Section A (Profile Fit)**: Renders `<ProfileFitBars>` when profile is provided and response includes `profile_fit`.
- **Section B (Outcomes)**: Renders `<GmatDistributionChart>`, `<GpaDistributionChart>`, `<IndustryChart>` from the outcomes data.
- **Section C (Program Stats)**: Table of static data (tuition, class size, acceptance rate, etc.).
- **Section D (Application Details)**: Essay count, deadlines, specializations.

The full component is ~250 lines. Key structure:

```tsx
// State
const [profile, setProfile] = useState<{gmat?: number; gpa?: number; yoe?: number}>({});
const [showProfile, setShowProfile] = useState(false);
const [compared, setCompared] = useState<CompareResult[]>([]);

// API call includes profile
const runComparison = async () => {
  const body: any = { school_ids: selectedIds };
  if (profile.gmat || profile.gpa || profile.yoe) {
    body.profile = profile;
  }
  const data = await apiFetch("/api/schools/compare", {
    method: "POST",
    body: JSON.stringify(body),
  });
  setCompared(data.schools);
};

// Render: selector → profile panel → profile fit → charts → stats table → app details
```

Important details:
- Import chart components from `@/components/charts/*`
- School names mapping: build `Record<string, string>` from compared schools for chart labels
- Handle null outcomes (school not in GMAT Club data): show "No outcome data available"
- Mobile: stack charts vertically, hide desktop table, show card layout

**Step 2: Verify build**

```bash
cd /Users/vinamr/Documents/mba-admissions-ai/frontend && npm run build
```

Expected: build succeeds.

**Step 3: Commit**

```bash
git add frontend/src/app/compare/page.tsx
git commit -m "feat(compare): rewrite page with outcomes, charts, and profile fit"
```

---

### Task 7: End-to-end smoke test

**Files:** None (manual testing)

**Step 1: Start backend**

```bash
cd /Users/vinamr/Documents/mba-admissions-ai/backend && python main.py
```

**Step 2: Start frontend**

```bash
cd /Users/vinamr/Documents/mba-admissions-ai/frontend && npm run dev
```

**Step 3: Test the comparison**

1. Navigate to `http://localhost:3000/compare`
2. Add HBS + Stanford GSB
3. Click Compare — verify outcomes + static data appear
4. Expand profile panel → enter GMAT 740, GPA 3.7, YOE 4
5. Click Compare again — verify profile fit bars + verdicts appear
6. Add 2 more schools (Wharton, Booth) — verify 4-school comparison works
7. Check mobile view (resize to 375px) — verify card layout

**Step 4: Run full test suite**

```bash
cd /Users/vinamr/Documents/mba-admissions-ai/backend && python -m pytest tests/ -v
```

Expected: all tests pass.

**Step 5: Commit any fixes**

If any fixes are needed from testing, commit them.

---

### Task 8: Polish — loading states, empty states, mobile

**Files:**
- Modify: `frontend/src/app/compare/page.tsx`

**Step 1: Add loading skeleton for charts**

While comparison is loading, show pulse/skeleton animation in the chart areas.

**Step 2: Handle empty outcome data**

When a school has no GMAT Club data (not in our 22 schools), show a tasteful empty state instead of broken charts.

**Step 3: Verify mobile responsiveness**

Charts should be `ResponsiveContainer` (already are) but verify they don't overflow on 375px viewport. Stack sections vertically on mobile.

**Step 4: Final build + commit**

```bash
cd /Users/vinamr/Documents/mba-admissions-ai/frontend && npm run build
git add -A
git commit -m "feat(compare): polish loading states, empty states, mobile layout"
```
