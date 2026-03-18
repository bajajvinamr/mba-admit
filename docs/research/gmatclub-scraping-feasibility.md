# GMAT Club Scraping Feasibility Research
**Date**: 2026-03-14
**Scope**: Decision Tracker structure, school profiles, technical feasibility, alternative sources

---

## TL;DR

GMAT Club's Decision Tracker is the richest public MBA admissions dataset available — ~3,860 entries per top school, 10 fields per row, served as **server-rendered HTML** with clean paginated URLs and no login required. The AJAX endpoint (`/forum/decision_tracker_ajax.php`) handles filtering but the base paginated pages are pure HTML tables, making scraping straightforward with Playwright or even `requests` + `BeautifulSoup`. The main legal risk is ToS language prohibiting "collecting information about other users" and competitive use — not robots.txt, which does not block the tracker paths.

---

## Key Findings

1. **Decision Tracker data is server-rendered HTML, not JavaScript-rendered.** Table rows are in the raw HTML source. Confirmed via `window.loggedUser = ''` (unauthenticated access works) and `var perpage = '20'` in page JS. No Cloudflare or bot challenge detected.

2. **Pagination uses clean, predictable URL patterns** — no query strings, no session tokens:
   - `https://gmatclub.com/forum/harvard-184/decision-tracker.html` (page 1)
   - `https://gmatclub.com/forum/harvard-184/decision-tracker-20.html` (page 2)
   - `https://gmatclub.com/forum/harvard-184/decision-tracker-{N*20}.html` (page N+1)
   - HBS: 193 pages = ~3,860 entries. Booth: 196 pages = ~3,920 entries.

3. **School-specific tracker URLs follow the pattern** `/forum/{school-slug}-{school-id}/decision-tracker.html`. School IDs are numeric (Harvard = 184, Booth = 189, Sloan = 185, Tuck = 194, Anderson = 187, LBS = 202).

4. **The AJAX filtering endpoint is** `POST /forum/decision_tracker_ajax.php` with these parameters:
   - `school` (numeric ID, 0 = all)
   - `status` (-1 = all; specific outcome codes)
   - `country` (numeric ID)
   - `score` (GMAT range)
   - `gpa` (range)
   - `program` (numeric ID, dynamically loaded per school)
   - `industry` (numeric)
   - `we` (years of experience)
   - `intake_year` (numeric)
   - `mode` = `post_comment | edit_comment | delete_comment | get_program | subscribe_to_requests`

5. **robots.txt does NOT disallow the decision tracker or business-schools paths.** Disallowed paths include `/forum/viewtopic.php`, `/forum/search.php`, `/forum/posting.php`, user profile paths, and `/wiki/`. The tracker pages are not on the blocklist. The site explicitly allows ClaudeBot and GPTBot.

6. **School profile pages** live at `https://gmatclub.com/business-schools/{school-slug}-mba-program/`. These pages are **JavaScript-rendered** — statistics fields (GMAT, GPA, acceptance rate, class size) appear as template placeholders in HTML and are populated via JS/localForage. This makes them harder to scrape via static HTML fetch.

7. **The main Decision Tracker index** (`/forum/decision-tracker/index.html`) shows profile cards (not a table) with: username, years of experience, country, graduation year, gender, GMAT/GRE, GPA, pre/post-MBA industry, and per-school application cards (program, round, decision status, scholarship %, date). This view uses AJAX filtering — harder to paginate programmatically than the school-specific table view.

---

## Data Points

### Decision Tracker Table Fields (per row)
| Field | Notes |
|-------|-------|
| School | School name + program type (e.g., "Booth MiM") |
| Status | Accepted / Denied without Interview / Interviewed / Waitlisted |
| Round | R1, R2, R3, Early Decision, etc. |
| Year | Intake year (e.g., 2026) |
| GMAT / GRE | Score with type label (e.g., "755 Focus", "329 GRE") |
| GPA | Numeric (e.g., 3.9, 3.8); sometimes blank |
| YOE | Years of experience (integer) |
| Post-MBA Industry | Consulting, Finance, Tech, Healthcare, PE, etc. |
| Location | Country (e.g., India, France, USA) |
| Date | Submission date (e.g., "13 Mar 2026 05:08 AM") |

### Scale
- HBS tracker: ~3,860 entries (193 pages x 20)
- Booth tracker: ~3,920 entries (196 pages x 20)
- Estimated total across all schools: 50,000+ entries (rough: ~30 top schools x ~2,000 avg entries)

### Profile Card Fields (index view — richer but AJAX-rendered)
username, work years, country, target grad year, gender, GMAT/GRE score, GPA, pre-MBA industry, post-MBA industry, school list with: program, round, status, scholarship %, decision date, timestamp

### School Profile Fields (JS-rendered, harder to scrape)
- Rankings: GMAT Club Rank, US News, FT, Bloomberg Businessweek
- Class metrics: Applicants, Class Size, Acceptance Rate %, Yield Rate %
- Scores: Avg GMAT, Avg GRE, Avg GPA, Avg Work Experience
- Employment: employment-data-container (fields not fully resolved without JS execution)
- Deadlines, essays, forums, interview debriefs

### robots.txt
- `/forum/decision-tracker/` — NOT disallowed
- `/business-schools/` — NOT disallowed
- Explicitly allows: ClaudeBot, GPTBot, Google-Extended
- Disallows: Amazonbot, Bytespider, CCBot, TurnitinBot
- Content signal: `ai-input=yes, ai-train=no`

---

## Alternative Data Sources

### ClearAdmit LiveWire (`clearadmit.com/livewire/`)
- **Fields**: School, GMAT/GRE/EA score, GPA, Round, Status (Accepted/Waitlisted/Rejected/Interview Invite), Program Type, Location, Post-MBA Career
- **Technical**: WordPress site, AJAX via `wp-admin/admin-ajax.php` with action `get_filtered_ids_livewire`. Uses infinite scroll (no clean pagination URLs).
- **Access**: Partially public; login wall activates after some results when filtered.
- **Scraping difficulty**: Medium-hard (AJAX-only, no clean URL pagination, login wall).

### ClearAdmit DecisionWire (`clearadmit.com/decisionwire/`)
- **Fields**: Schools applied to, schools admitted to, school enrolled, scholarship amounts, entering year
- **Technical**: Same WP AJAX pattern, action `get_filtered_ids_decisionwire`
- **Notable gap**: Does NOT capture GMAT/GPA in the DecisionWire form (those are in LiveWire).
- **Access**: Tiered — some free, login required for full dataset.

### ClearAdmit Data Dashboard (`clearadmit.com/livewire-data-dashboard/`)
- Three tools: Outcome Forecast, School Comparison, Benchmark Overview
- Requires 450+ LiveWire posts per school to be included (20 schools covered)
- Likely rendered with JS charting libraries — not trivially scrapable as raw data.

### GMAT Club "All Stats in One Place" Thread
- URL: `gmatclub.com/forum/all-school-stats-in-one-place-166143.html`
- Contains 40+ schools, 2024-25 data
- Data rendered via AJAX — not in raw HTML. Would require Playwright + JS execution.

---

## Second-Order Implications

1. **The school-specific paginated URLs are the path of least resistance.** You can scrape all HBS entries with 193 sequential HTTP GET requests — no auth, no JS execution, no AJAX. Use `requests` + `BeautifulSoup` or Playwright. Rate-limit to 1 req/sec to avoid IP blocks.

2. **The main tracker index view (profile cards) is richer** — it includes pre-MBA industry, scholarship %, and narrative text that the table view omits. But it requires AJAX POST calls with proper filter parameters and likely session state. Worth reverse-engineering the AJAX endpoint parameters for a targeted crawl.

3. **Data quality caveat**: All data is user-self-reported. No verification mechanism. GMAT scores, GPAs, and outcomes can be fabricated or inflated. Weight confidence accordingly and treat as directional signals, not ground truth.

4. **School ID discovery**: The numeric school IDs in GMAT Club URLs (harvard-184, booth-189) are the key to building a full scraper. A one-time crawl of the school directory page should yield all IDs. The format `/forum/{name}-{id}/decision-tracker.html` is consistent.

5. **Volume asymmetry**: Popular schools (HBS, Wharton, GSB) will have 3,000-4,000+ entries. Niche/international schools may have under 100. Your data pipeline should handle sparse schools gracefully.

6. **ClearAdmit is a meaningful complement** to GMAT Club — it captures decision outcomes AND enrollment choices (DecisionWire), which GMAT Club lacks. The AJAX-only architecture makes it harder to scrape cleanly, but the WP admin-ajax.php pattern is well-understood.

---

## Contrarian View

**Most people will reach for Playwright when `requests` is enough.** The school-specific table pages are plain HTML. The instinct to use headless browsers for all scraping adds unnecessary complexity, memory, and latency. A `requests` + `BeautifulSoup` loop over paginated URLs is 10x faster, more stable, and cheaper to run. Reserve Playwright only for: (a) the profile card index view requiring AJAX, and (b) the JS-rendered school profile statistics pages.

---

## Open Questions

1. **What are all the valid school IDs?** Need to crawl the GMAT Club school directory to get the full list of {slug}-{id} pairs. Likely 50-100 schools.

2. **Does the AJAX filter endpoint require a session cookie / CSRF token?** Unknown without inspecting live network traffic. If it does, scraping the filtered view requires authenticating first.

3. **What is the total entry count across all schools?** Can be determined by summing (pages x 20) across all school-specific tracker pages after the ID discovery step.

4. **How fresh is the data?** Entries show timestamps (e.g., "13 Mar 2026") but historical entries may go back 5-10 years. Unknown what percentage of entries are from the current cycle vs. historical.

5. **Does GMAT Club IP-block scrapers?** No evidence of Cloudflare or aggressive rate limiting, but unknown behavior under sustained crawling. Need to test with respectful rate limits.

6. **ClearAdmit AJAX parameters**: The `get_filtered_ids_livewire` action likely returns a list of post IDs, then a second call fetches content. The exact parameter names for pagination/offset are unknown without live inspection.

7. **Are there more fields in the school tracker table than the 10 visible columns?** The profile card view has scholarship %, gender, and pre-MBA industry — unclear if these are accessible in the school-specific table view or only via the main index AJAX view.

---

## Recommended Scraping Architecture for GMAT Club

```
Stage 1: School ID Discovery
  GET https://gmatclub.com/forum/decision-tracker/index.html
  Extract: all school {slug}-{id} pairs from dropdown options
  Output: schools.json [{name, slug, id, url}]

Stage 2: Per-School Pagination Count
  For each school: GET /forum/{slug}-{id}/decision-tracker.html
  Extract: last page number from pagination
  Calculate: total_entries = last_page_num * 20

Stage 3: Table Scraping (requests + BeautifulSoup)
  For each school, for each page:
    GET /forum/{slug}-{id}/decision-tracker-{(page-1)*20}.html
    Parse <table> rows -> extract 10 fields
    Store as JSONL
  Rate limit: 1 req/sec, randomized 0.5-1.5s jitter

Stage 4: Optional - Profile Card AJAX (Playwright)
  POST /forum/decision_tracker_ajax.php
  Params: school=0, status=-1, country=0, ... (all defaults = unfiltered)
  Capture: pre-MBA industry, scholarship %, narrative text
  Merge with table data on (username + school + round)
```

---

## Sources

- [GMAT Club Decision Tracker Index](https://gmatclub.com/forum/decision-tracker/index.html)
- [HBS Decision Tracker - Page 1](https://gmatclub.com/forum/harvard-184/decision-tracker.html)
- [HBS Decision Tracker - Page 2 (confirms HTML rendering + pagination)](https://gmatclub.com/forum/harvard-184/decision-tracker-20.html)
- [Booth Decision Tracker](https://gmatclub.com/forum/booth-189/decision-tracker.html)
- [MIT Sloan Decision Tracker](https://gmatclub.com/forum/sloan-185/decision-tracker.html)
- [GMAT Club Decision Tracker v2.0 Announcement](https://gmatclub.com/forum/introducing-gmat-club-decision-tracker-v2-411012.html)
- [GMAT Club Harvard School Profile](https://gmatclub.com/business-schools/harvard-mba-program/)
- [GMAT Club robots.txt](https://gmatclub.com/robots.txt)
- [GMAT Club Terms & Conditions](https://gmatclub.com/static/gmatclub-terms-and-conditions-and-privacy-policy.php)
- [ClearAdmit LiveWire](https://www.clearadmit.com/livewire/)
- [ClearAdmit DecisionWire](https://www.clearadmit.com/decisionwire/)
- [ClearAdmit LiveWire Data Dashboard](https://www.clearadmit.com/livewire-data-dashboard/)
- [GMAT Club All School Stats Thread](https://gmatclub.com/forum/all-school-stats-in-one-place-166143.html)
