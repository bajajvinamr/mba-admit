# Geo SEO + Content Pages + Top 100 Data Quality — Design

**Date:** 2026-03-14
**Status:** Approved
**Approach:** Static MDX Content + Dynamic Geo Routes (Hybrid)

---

## 1. Geo SEO Routes

### URL Structure

```
/schools/country/[slug]     → /schools/country/usa, /schools/country/india
/schools/region/[slug]      → /schools/region/europe, /schools/region/asia-pacific
/schools/city/[slug]        → /schools/city/boston, /schools/city/mumbai
```

### Implementation

- All routes are **server components** using `generateStaticParams` + ISR (`revalidate: 3600`)
- Backend: add `country` and `city` query params to existing `GET /api/schools`
- No new backend endpoints needed

### Pages Generated

**India-deep (priority):**
- `/schools/country/india` — all Indian schools, IIM network highlight
- City pages: mumbai, bangalore, delhi, ahmedabad, hyderabad, chennai, kolkata, pune

**US hubs:**
- `/schools/country/usa` — all US schools
- City pages: boston, chicago, new-york, san-francisco, philadelphia

**Region hubs:**
- `/schools/region/europe` — UK, France, Germany, Spain, Italy, Netherlands, etc.
- `/schools/region/asia-pacific` — India, China, Singapore, HK, Japan, Korea, Australia
- `/schools/region/north-america` — USA, Canada

**Other countries (3+ schools):** UK, Australia, France, Canada, China

### Page Layout

1. Hero — "Top MBA Programs in {Location}" + school count + avg GMAT range
2. Stats bar — avg GMAT, avg acceptance rate, tuition range, total schools
3. School grid — reuses existing school card component, sorted by GMAT desc
4. Inline CTA — "Check your odds at these schools"
5. Cross-links — related geo pages
6. JSON-LD — `ItemList` schema

---

## 2. Content Pages

### Pillar Guides (MDX, long-form)

Stored in `frontend/src/content/guides/`:

| Slug | Target Keyword |
|------|----------------|
| `mba-in-usa-for-indians` | "mba in usa from india" |
| `iim-vs-isb-vs-abroad` | "iim vs isb" |
| `1-year-vs-2-year-mba` | "1 year mba vs 2 year" |
| `mba-without-work-experience` | "mba without experience" |
| `mba-scholarships-guide` | "mba scholarship" |
| `gmat-score-for-top-schools` | "gmat score for mba" |
| `mba-roi-analysis` | "mba roi" |
| `mba-application-timeline` | "mba application deadline" |

### MDX Components Available

- `<SchoolCard id="hbs" />` — live school card
- `<ComparisonTable schools={["hbs","gsb"]} />` — side-by-side stats
- `<OddsCalculatorInline />` — embedded CTA
- `<EmailCapture variant="inline" />` — email capture

### Programmatic Pages

Auto-generated from school data:

```
/schools/specialization/[spec]   → finance, tech, entrepreneurship, etc.
/schools/stem                    → All STEM-designated programs
/schools/1-year                  → All 1-year programs
/schools/deferred                → Deferred enrollment programs
```

### Internal Linking Strategy

- Pillar guides link to geo pages and individual school pages
- Geo pages link to related pillar guides and city sub-pages
- All pages link to conversion tools (odds calculator, profile report)

---

## 3. Top 100 School Data Quality

### Problem

~15 duplicate entries with missing data (GMAT 0, country "?"):
- `iim_ahmedabad` (0) duplicates `iima` (700)
- `indian_school_of_business` (0) duplicates `isb` (710)
- etc.

### Fix

One-time Python script `backend/scripts/fix_school_data.py`:
1. Merge duplicate long-name entries into short-ID canonical entries
2. Fill missing fields for top 100 schools
3. Define hardcoded top 100 list for sitemap priority

### Sitemap Enhancement

- Add all geo pages (country, region, city, specialization)
- Add all guide pages
- Top 100 schools: `priority: 0.9` vs `0.7` for others

---

## Packages Required

- `@next/mdx` + `@mdx-js/react` — MDX support in Next.js
- `gray-matter` — frontmatter parsing for MDX files
- `next-mdx-remote` (alternative if @next/mdx doesn't fit) — for loading MDX from file system

## Second-Order Effects

- **Build time:** `generateStaticParams` for ~50 geo pages + 8 guides = minimal impact (~5s)
- **ISR:** 1-hour revalidation means school data updates propagate within 1 hour
- **Bundle size:** MDX adds ~30KB to JS bundle; geo pages are server components (zero client JS)
- **SEO crawl budget:** ~80 new indexable pages; ensure sitemap is submitted to Google Search Console
