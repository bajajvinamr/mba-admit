# Geo SEO + Content Pages + Top 100 Data Quality — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add programmatic geo SEO pages, MDX pillar guide infrastructure, and clean up top 100 school data to maximize organic search traffic.

**Architecture:** Dynamic Next.js server component routes for geo pages (`/schools/country/[slug]`, `/schools/region/[slug]`, `/schools/city/[slug]`), MDX-powered guide pages (`/guides/[slug]`), and a Python data cleanup script. Backend gets filter params on existing school endpoint. Sitemap extended to cover all new pages.

**Tech Stack:** Next.js 16 (App Router, server components, ISR), `@next/mdx` + `@mdx-js/react`, Python (data script), FastAPI (filter params)

---

### Task 1: Fix Top 100 School Data

**Files:**
- Create: `backend/scripts/fix_school_data.py`
- Modify: `backend/data/school_db_full.json`

**Step 1: Write the data cleanup script**

```python
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
```

**Step 2: Run the script**

Run: `cd backend && python scripts/fix_school_data.py`
Expected: Output showing merged duplicates and any remaining issues.

**Step 3: Verify with tests**

Run: `cd backend && python -m pytest tests/ -q`
Expected: All 89 tests pass (data cleanup shouldn't break anything).

**Step 4: Commit**

```bash
git add backend/scripts/fix_school_data.py backend/data/school_db_full.json
git commit -m "chore: deduplicate school data and verify top 100 coverage"
```

---

### Task 2: Add Country/City Filter Params to Backend

**Files:**
- Modify: `backend/routers/schools.py:33-60`
- Create: `backend/tests/test_geo_filters.py`

**Step 1: Write failing tests**

```python
"""Tests for geo filter params on /api/schools."""


def test_filter_by_country(client):
    resp = client.get("/api/schools?country=USA")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) > 0
    assert all(s["country"] == "USA" for s in data)


def test_filter_by_country_case_insensitive(client):
    resp = client.get("/api/schools?country=usa")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) > 0
    assert all(s["country"] == "USA" for s in data)


def test_filter_by_city(client):
    resp = client.get("/api/schools?city=Boston")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) > 0
    assert all("Boston" in s["location"] for s in data)


def test_filter_by_country_empty(client):
    resp = client.get("/api/schools?country=Atlantis")
    assert resp.status_code == 200
    assert resp.json() == []


def test_filter_combined_country_and_query(client):
    resp = client.get("/api/schools?country=USA&q=harvard")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert all(s["country"] == "USA" for s in data)


def test_geo_meta_endpoint(client):
    resp = client.get("/api/schools/geo-meta")
    assert resp.status_code == 200
    data = resp.json()
    assert "countries" in data
    assert "cities" in data
    assert any(c["slug"] == "usa" for c in data["countries"])
    assert any(c["count"] > 0 for c in data["countries"])
```

**Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_geo_filters.py -v`
Expected: FAIL — no `country`/`city` params yet, no `/geo-meta` endpoint.

**Step 3: Add filter params and geo-meta endpoint**

Modify `backend/routers/schools.py` — add `country` and `city` query params to `list_schools`, add `geo_meta` endpoint:

```python
@router.get("/schools")
def list_schools(
    q: str = Query(default=None, description="Search query"),
    country: str = Query(default=None, description="Filter by country"),
    city: str = Query(default=None, description="Filter by city (matches location field)"),
):
    results = []
    for sid, school in SCHOOL_DB.items():
        # Country filter
        if country:
            school_country = school.get("country", "").lower()
            if school_country != country.strip().lower():
                continue
        # City filter
        if city:
            school_location = school.get("location", "").lower()
            if city.strip().lower() not in school_location:
                continue
        # Search query filter
        if q:
            q_lower = q.strip().lower()
            name_match = q_lower in school.get("name", "").lower()
            id_match = q_lower in sid.lower()
            alias_match = any(
                q_lower == alias or q_lower in alias
                for alias in SCHOOL_ALIASES.get(sid, [])
            )
            if not (name_match or id_match or alias_match):
                continue
        results.append(_school_summary(sid, school))

    return results


@router.get("/schools/geo-meta")
def geo_meta():
    """Returns unique countries and cities with school counts for geo page generation."""
    from collections import Counter
    countries: Counter[str] = Counter()
    cities: Counter[str] = Counter()
    for school in SCHOOL_DB.values():
        c = school.get("country", "Unknown")
        if c and c not in ("?", "Unknown"):
            countries[c] += 1
        loc = school.get("location", "")
        if loc and loc not in ("?", "Unknown", "Unknown Location"):
            # Extract city (first part before comma)
            city_name = loc.split(",")[0].strip()
            if city_name:
                cities[city_name] += 1

    def slugify(s: str) -> str:
        return s.lower().replace(" ", "-").replace(".", "")

    return {
        "countries": sorted(
            [{"name": c, "slug": slugify(c), "count": n} for c, n in countries.items()],
            key=lambda x: -x["count"],
        ),
        "cities": sorted(
            [{"name": c, "slug": slugify(c), "count": n} for c, n in cities.items() if n >= 2],
            key=lambda x: -x["count"],
        ),
    }
```

**Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_geo_filters.py -v`
Expected: All 6 tests PASS.

**Step 5: Run full test suite**

Run: `cd backend && python -m pytest tests/ -q`
Expected: All tests pass (existing + 6 new).

**Step 6: Commit**

```bash
git add backend/routers/schools.py backend/tests/test_geo_filters.py
git commit -m "feat: add country/city filter params and geo-meta endpoint"
```

---

### Task 3: Geo SEO — Country Pages

**Files:**
- Create: `frontend/src/app/schools/country/[slug]/page.tsx`
- Create: `frontend/src/lib/geo.ts` (region mappings + helpers)

**Step 1: Create geo helper with region mappings**

```typescript
// frontend/src/lib/geo.ts
export const REGIONS: Record<string, { name: string; countries: string[] }> = {
  "north-america": {
    name: "North America",
    countries: ["USA", "Canada", "Mexico"],
  },
  europe: {
    name: "Europe",
    countries: [
      "UK", "France", "Germany", "Spain", "Italy", "Netherlands",
      "Switzerland", "Belgium", "Denmark", "Sweden", "Norway", "Finland",
      "Ireland", "Portugal", "Poland", "Czech Republic", "Turkey",
    ],
  },
  "asia-pacific": {
    name: "Asia-Pacific",
    countries: [
      "India", "China", "Singapore", "Hong Kong", "Japan", "South Korea",
      "Australia", "New Zealand", "Thailand", "Philippines", "Indonesia",
      "Malaysia", "Vietnam", "Qatar", "UAE", "Saudi Arabia", "Israel",
    ],
  },
  "latin-america": {
    name: "Latin America",
    countries: [
      "Brazil", "Mexico", "Colombia", "Argentina", "Chile",
      "Peru", "Costa Rica",
    ],
  },
  africa: {
    name: "Africa",
    countries: ["South Africa", "Nigeria", "Kenya", "Egypt"],
  },
};

export function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/\./g, "");
}

export function deslugify(slug: string): string {
  // Handle known edge cases
  const MAP: Record<string, string> = {
    usa: "USA",
    uk: "UK",
    uae: "UAE",
    "hong-kong": "Hong Kong",
    "south-korea": "South Korea",
    "south-africa": "South Africa",
    "new-zealand": "New Zealand",
    "costa-rica": "Costa Rica",
    "czech-republic": "Czech Republic",
    "saudi-arabia": "Saudi Arabia",
  };
  return MAP[slug] || slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
```

**Step 2: Create the country page (server component)**

```tsx
// frontend/src/app/schools/country/[slug]/page.tsx
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { deslugify, slugify, REGIONS } from "@/lib/geo";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type School = {
  id: string; name: string; location: string; country: string;
  gmat_avg: number; median_salary: string; acceptance_rate: number;
  class_size: number; specializations: string[];
  tuition_usd: number; stem_designated: boolean;
};

type Props = { params: Promise<{ slug: string }> };

async function getSchools(country: string): Promise<School[]> {
  const res = await fetch(`${API}/api/schools?country=${encodeURIComponent(country)}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const country = deslugify(slug);
  const schools = await getSchools(country);
  const count = schools.length;
  const avgGmat = count > 0
    ? Math.round(schools.reduce((s, sc) => s + (sc.gmat_avg || 0), 0) / count)
    : 0;

  return {
    title: `Top ${count} MBA Programs in ${country} — GMAT, Rankings & Admissions`,
    description: `Browse ${count} MBA programs in ${country}. Average GMAT: ${avgGmat}. Compare acceptance rates, tuition, salaries, and find your best fit.`,
    openGraph: {
      title: `MBA Programs in ${country} | Admit Compass`,
      description: `Explore ${count} MBA programs in ${country} with detailed stats and admissions data.`,
      type: "website",
      siteName: "Admit Compass",
    },
  };
}

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API}/api/schools/geo-meta`, { next: { revalidate: 86400 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.countries
      .filter((c: { count: number }) => c.count >= 2)
      .map((c: { slug: string }) => ({ slug: c.slug }));
  } catch {
    return [];
  }
}

export default async function CountryPage({ params }: Props) {
  const { slug } = await params;
  const country = deslugify(slug);
  const schools = await getSchools(country);

  if (schools.length === 0) notFound();

  const avgGmat = Math.round(schools.reduce((s, sc) => s + (sc.gmat_avg || 0), 0) / schools.length);
  const sorted = [...schools].sort((a, b) => b.gmat_avg - a.gmat_avg);

  // Find which region this country belongs to for cross-links
  const regionEntry = Object.entries(REGIONS).find(([, r]) => r.countries.includes(country));

  // Get unique cities for sub-navigation
  const cities = [...new Set(schools.map(s => s.location.split(",")[0].trim()))].filter(Boolean).sort();

  return (
    <div className="max-w-7xl mx-auto px-8">
      {/* Breadcrumb */}
      <nav className="py-6 text-xs text-charcoal/40">
        <Link href="/schools" className="hover:text-jet">Schools</Link>
        <span className="mx-2">/</span>
        {regionEntry && (
          <>
            <Link href={`/schools/region/${regionEntry[0]}`} className="hover:text-jet">
              {regionEntry[1].name}
            </Link>
            <span className="mx-2">/</span>
          </>
        )}
        <span className="text-jet font-medium">{country}</span>
      </nav>

      {/* Hero */}
      <div className="py-8 border-b border-jet/5 mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-charcoal/40 mb-3 font-medium">
          MBA Programs by Country
        </p>
        <h1 className="heading-serif text-4xl md:text-5xl mb-3">
          Top MBA Programs in {country}
        </h1>
        <p className="text-charcoal/50 max-w-2xl">
          {schools.length} MBA programs in {country}. Average GMAT: {avgGmat}.
          Compare schools, check your odds, and find your best fit.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-white border border-jet/5 p-4 text-center">
          <p className="text-2xl font-bold text-jet">{schools.length}</p>
          <p className="text-[10px] uppercase tracking-widest text-charcoal/40 font-bold">Programs</p>
        </div>
        <div className="bg-white border border-jet/5 p-4 text-center">
          <p className="text-2xl font-bold text-jet">{avgGmat}</p>
          <p className="text-[10px] uppercase tracking-widest text-charcoal/40 font-bold">Avg GMAT</p>
        </div>
        <div className="bg-white border border-jet/5 p-4 text-center">
          <p className="text-2xl font-bold text-jet">
            {Math.round(schools.reduce((s, sc) => s + (typeof sc.acceptance_rate === "number" ? sc.acceptance_rate : 30), 0) / schools.length)}%
          </p>
          <p className="text-[10px] uppercase tracking-widest text-charcoal/40 font-bold">Avg Accept Rate</p>
        </div>
        <div className="bg-white border border-jet/5 p-4 text-center">
          <p className="text-2xl font-bold text-jet">{cities.length}</p>
          <p className="text-[10px] uppercase tracking-widest text-charcoal/40 font-bold">Cities</p>
        </div>
      </div>

      {/* City sub-nav */}
      {cities.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {cities.slice(0, 15).map(city => (
            <Link
              key={city}
              href={`/schools/city/${slugify(city)}`}
              className="text-xs px-3 py-1.5 bg-white border border-jet/10 hover:border-gold transition-colors font-medium"
            >
              {city}
            </Link>
          ))}
        </div>
      )}

      {/* School grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-jet/5 mb-12">
        {sorted.map(school => (
          <Link
            key={school.id}
            href={`/school/${school.id}`}
            className="bg-white p-6 hover:bg-alabaster transition-colors group"
          >
            <p className="text-[10px] uppercase tracking-widest text-charcoal/40 mb-1">{school.location}</p>
            <h3 className="heading-serif text-lg mb-2 group-hover:text-gold transition-colors">{school.name}</h3>
            <div className="flex flex-wrap gap-1 mb-3">
              {(school.specializations || []).slice(0, 3).map(s => (
                <span key={s} className="text-[9px] bg-alabaster border border-jet/5 px-2 py-0.5 uppercase tracking-wider text-charcoal/50">{s}</span>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center border-t border-jet/5 pt-3">
              <div>
                <p className="text-[9px] uppercase text-charcoal/40">GMAT</p>
                <p className="font-medium text-sm">{school.gmat_avg}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-charcoal/40">Accept</p>
                <p className="font-medium text-sm">{school.acceptance_rate}%</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-charcoal/40">Salary</p>
                <p className="font-medium text-sm">{school.median_salary}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* CTA */}
      <div className="bg-jet p-8 text-center text-white mb-12">
        <h3 className="heading-serif text-2xl mb-3">Check your odds at these {schools.length} schools</h3>
        <p className="text-white/50 mb-6 text-sm">Enter your GMAT and GPA to see which {country} programs are reaches, targets, and safeties.</p>
        <Link href="/#calc" className="inline-block bg-gold text-jet px-8 py-3 font-bold uppercase tracking-widest text-sm hover:scale-105 transition-transform">
          Check My Odds — Free
        </Link>
      </div>

      {/* Cross-links */}
      {regionEntry && (
        <div className="border-t border-jet/5 py-8 mb-8">
          <p className="text-[10px] uppercase tracking-widest text-charcoal/40 font-bold mb-4">
            Also explore in {regionEntry[1].name}
          </p>
          <div className="flex flex-wrap gap-2">
            {regionEntry[1].countries
              .filter(c => c !== country)
              .slice(0, 8)
              .map(c => (
                <Link
                  key={c}
                  href={`/schools/country/${slugify(c)}`}
                  className="text-xs px-3 py-1.5 border border-jet/10 hover:border-gold transition-colors font-medium"
                >
                  {c}
                </Link>
              ))}
          </div>
        </div>
      )}

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `MBA Programs in ${country}`,
            numberOfItems: schools.length,
            itemListElement: sorted.slice(0, 20).map((s, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: {
                "@type": "EducationalOrganization",
                name: s.name,
                url: `https://admitcompass.ai/school/${s.id}`,
              },
            })),
          }),
        }}
      />
    </div>
  );
}
```

**Step 3: Build and verify**

Run: `cd frontend && npm run build`
Expected: Build succeeds, country pages are statically generated.

**Step 4: Commit**

```bash
git add frontend/src/lib/geo.ts frontend/src/app/schools/country/
git commit -m "feat: geo SEO country pages with ISR and JSON-LD"
```

---

### Task 4: Geo SEO — Region Pages

**Files:**
- Create: `frontend/src/app/schools/region/[slug]/page.tsx`

**Step 1: Create the region page**

Uses the same pattern as country page but fetches schools for all countries in the region using `REGIONS` mapping from `geo.ts`. Server component with `generateStaticParams` returning the 5 region slugs.

Key differences from country page:
- Fetches schools for ALL countries in the region (multiple API calls, `Promise.all`)
- Groups schools by country in the grid
- Cross-links to individual country pages within the region
- H1: "Top MBA Programs in {Region Name}"

**Step 2: Build and verify**

Run: `cd frontend && npm run build`
Expected: 5 region pages statically generated.

**Step 3: Commit**

```bash
git add frontend/src/app/schools/region/
git commit -m "feat: geo SEO region hub pages (Europe, Asia-Pacific, etc.)"
```

---

### Task 5: Geo SEO — City Pages

**Files:**
- Create: `frontend/src/app/schools/city/[slug]/page.tsx`

**Step 1: Create the city page**

Same pattern as country page but uses `city` filter param. `generateStaticParams` fetches from `/api/schools/geo-meta` and returns cities with 2+ schools.

Key differences:
- H1: "MBA Programs in {City}"
- Cross-links to the country page
- Smaller school count, more focused layout

**Step 2: Build and verify**

Run: `cd frontend && npm run build`
Expected: City pages generated for cities with 2+ schools.

**Step 3: Commit**

```bash
git add frontend/src/app/schools/city/
git commit -m "feat: geo SEO city pages for major MBA hubs"
```

---

### Task 6: MDX Infrastructure

**Files:**
- Modify: `frontend/package.json` (add `@next/mdx`, `@mdx-js/react`)
- Create: `frontend/mdx-components.tsx`
- Create: `frontend/next.config.ts` (if not exists, or modify — add MDX plugin)
- Create: `frontend/src/app/guides/page.tsx` (index)
- Create: `frontend/src/app/guides/[slug]/page.tsx` (guide renderer)
- Create: `frontend/src/content/guides/` (directory for MDX files)

**Step 1: Install MDX packages**

Run: `cd frontend && npm install @next/mdx @mdx-js/react gray-matter`

**Step 2: Configure next.config for MDX**

Check existing `next.config.ts` and wrap with `createMDX` from `@next/mdx`. Add `mdx` to `pageExtensions`.

**Step 3: Create `mdx-components.tsx` at frontend root**

Map MDX elements to styled components matching the editorial design system (heading-serif for h1/h2, proper spacing, etc.).

**Step 4: Create guide index and renderer pages**

- `/guides/page.tsx` — lists all available guides with title, description, reading time
- `/guides/[slug]/page.tsx` — server component that reads MDX from `src/content/guides/[slug].mdx`, renders with metadata

**Step 5: Create first pilot guide**

Create `frontend/src/content/guides/gmat-score-for-top-schools.mdx` with frontmatter:
```yaml
---
title: "What GMAT Score Do You Need? School-by-School Breakdown"
description: "Complete GMAT score guide for every top MBA program. See median scores, ranges, and where you stand."
date: "2026-03-14"
readingTime: "8 min"
---
```

Content: ~800 words covering M7 GMAT ranges, T15, international, with embedded `<SchoolCard>` components and odds calculator CTA.

**Step 6: Build and verify**

Run: `cd frontend && npm run build`
Expected: `/guides` and `/guides/gmat-score-for-top-schools` render correctly.

**Step 7: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/mdx-components.tsx \
  frontend/next.config.ts frontend/src/app/guides/ frontend/src/content/guides/
git commit -m "feat: MDX guide infrastructure + first pilot guide"
```

---

### Task 7: Update Sitemap

**Files:**
- Modify: `frontend/src/app/sitemap.ts`

**Step 1: Extend sitemap to include geo pages and guides**

Add sections for:
- Country pages (from `/api/schools/geo-meta`, priority 0.8)
- Region pages (hardcoded 5 slugs, priority 0.8)
- City pages (from `/api/schools/geo-meta`, priority 0.7)
- Guide pages (from filesystem glob of `src/content/guides/*.mdx`, priority 0.8)
- Top 100 schools get `priority: 0.9` vs `0.7` for others

**Step 2: Build and verify**

Run: `cd frontend && npm run build`
Then check `/sitemap.xml` route output.

**Step 3: Commit**

```bash
git add frontend/src/app/sitemap.ts
git commit -m "feat: extended sitemap with geo pages, guides, and top 100 priority"
```

---

### Task 8: Content Generation Agent (Parallel)

**Purpose:** Use a subagent to generate the remaining 7 pillar guides as MDX files.

**Files:**
- Create: `frontend/src/content/guides/mba-in-usa-for-indians.mdx`
- Create: `frontend/src/content/guides/iim-vs-isb-vs-abroad.mdx`
- Create: `frontend/src/content/guides/1-year-vs-2-year-mba.mdx`
- Create: `frontend/src/content/guides/mba-without-work-experience.mdx`
- Create: `frontend/src/content/guides/mba-scholarships-guide.mdx`
- Create: `frontend/src/content/guides/mba-roi-analysis.mdx`
- Create: `frontend/src/content/guides/mba-application-timeline.mdx`

**Step 1:** Spin up a content-writing subagent per guide (can run 2-3 in parallel). Each guide should:
- Be 1500-2500 words
- Use natural, authoritative tone (not AI-sounding)
- Include frontmatter (title, description, date, readingTime)
- Reference real school data from the DB where relevant
- Include 2-3 inline CTAs (odds calculator, profile report, email capture)
- Internal links to relevant school pages and geo pages

**Step 2: Build and verify**

Run: `cd frontend && npm run build`
Expected: All 8 guide pages render correctly.

**Step 3: Commit**

```bash
git add frontend/src/content/guides/
git commit -m "feat: 8 SEO pillar guides for organic traffic"
```

---

### Task 9: Final Integration Test

**Step 1:** Run full backend test suite

Run: `cd backend && python -m pytest tests/ -q`
Expected: All tests pass (89 existing + 6 new geo filter tests).

**Step 2:** Run full frontend build

Run: `cd frontend && npm run build`
Expected: Clean build with all new pages listed in route output.

**Step 3:** Verify key pages load in dev

Start dev server and spot-check:
- `/schools/country/usa` — shows US schools
- `/schools/country/india` — shows Indian schools
- `/schools/region/europe` — shows European schools
- `/schools/city/boston` — shows Boston schools
- `/guides` — shows guide index
- `/guides/gmat-score-for-top-schools` — renders guide with MDX
- `/sitemap.xml` — includes all new pages

**Step 4: Final commit**

```bash
git commit -m "feat: geo SEO + content pages + top 100 data quality — complete"
```
