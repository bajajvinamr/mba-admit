# UX Simplification Plan — Admit Compass
**Date:** 2026-03-17
**Author:** Product Strategy
**Status:** Draft for review

---

## Diagnosis: What's Wrong

The current nav has **41 items** across two mega-menus (Research: 20, Prepare: 21) plus standalone Dashboard and Tracker links. The dashboard "Toolkit" section lists 16 tools. This is a feature catalog, not a product.

The core problem: a new user landing on the dashboard cannot answer "what should I do first?" within 5 seconds.

**Root cause:** Features were added without a user journey model. The nav reflects the builder's mental model (categories by type), not the user's mental model (categories by time and urgency).

---

## 1. Information Architecture: 5 Journeys

Replace the current Research / Prepare taxonomy with a time-sequenced journey model. Users know what stage they're in. The nav should reflect that.

| Journey | Trigger Moment | Core User Question |
|---|---|---|
| **Explore** | "Should I get an MBA? Where might I get in?" | Am I a viable candidate? Where should I apply? |
| **Build** | "I'm applying. I need to write my story." | What should my essays say? How do I present myself? |
| **Apply** | "I'm writing apps. Manage the process." | What's due when? Am I on track? |
| **Interview** | "I got an interview." | How do I prepare? What will they ask? |
| **Decide** | "I got in. Now what?" | Which offer? What aid can I negotiate? |

Every feature maps to exactly one journey. Features that span multiple journeys are platform utilities (search, profile, tracker) that live outside the journey nav.

---

## 2. Feature-to-Journey Mapping

| Feature | Current Location | Correct Journey | Priority |
|---|---|---|---|
| School Directory | Research | Explore | P0 |
| Odds Calculator / Admit Simulator | Research | Explore | P0 |
| Community Decisions | Research | Explore | P0 |
| Profile Report / Fit Score | Research | Explore | P0 |
| Rankings / Compare / Radar | Research | Explore | P1 |
| GMAT Targets / Planner | Research | Explore | P2 |
| MBA Readiness Quiz | Research | Explore | P2 |
| Career Paths / Alumni Network | Research | Explore | P2 |
| Deadline Calendar | Research | Apply (utility) | P1 |
| Admission Trends | Research | Explore | P2 |
| Master Storyteller | Prepare | Build | P0 |
| Goal Sculptor | Prepare | Build | P0 |
| Essay Evaluator | Prepare | Build | P0 |
| Resume Roaster | Prepare | Build | P0 |
| Essay Drafts | Prepare | Build | P1 |
| Essay Themes | Prepare | Build | P2 |
| Word Counter | Prepare | Build | P2 |
| App Tracker / My Schools | Prepare | Apply | P0 |
| App Checklist (per school) | Prepare | Apply | P1 |
| Rec Strategy + Rec Tracker | Prepare | Apply | P1 |
| Networking / Outreach Hub | Prepare | Apply | P2 |
| Interview Simulator | Prepare | Interview | P0 |
| Interview Question Bank | Prepare | Interview | P0 |
| Strength Meter | Prepare | Apply | P1 |
| Scholarships / Aid Estimator | Prepare | Decide | P0 |
| Waitlist Strategy | Prepare | Decide | P0 |
| Salary Negotiator | Prepare | Decide | P1 |
| ROI Calculator | Research | Decide | P1 |
| Application Fees / Cost of Living | Research | Explore | P2 |
| Events / Info Sessions | Research | Explore | P2 |

---

## 3. Progressive Disclosure Model

Default view shows only what moves the user forward in their current stage. Everything else is one click deeper.

### Default (always visible)
- Profile pill (GMAT/GPA/YOE) — persistent, top right
- Current journey indicator — "You're in: Build" with stage progress bar
- Top 3 actions for current stage — surfaced algorithmically, not a menu
- Application Tracker (school list + deadlines) — always accessible

### Behind "More Tools" or journey sub-menu
- All P2 features
- Advanced research tools (Radar, Class Profiles, Diversity Stats)
- GMAT Planner, Events, Alumni Network
- Admission Trends, Career Paths

### Admin / Settings
- Profile editing (full form)
- Notification preferences
- Billing / plan management

---

## 4. Priority Features — Front and Center

These 7 features drive the most sessions, highest conversion signals, and cover the full user journey. Everything else supports these.

| Rank | Feature | Why Front-and-Center |
|---|---|---|
| 1 | Odds Calculator | First question every applicant asks — strongest hook |
| 2 | School Directory | Core research action — daily use during Explore stage |
| 3 | Essay Evaluator | Highest repeat usage (10–30x per cycle) — core monetization |
| 4 | Application Tracker | Stickiest feature — users return daily during Apply stage |
| 5 | Interview Simulator | Converts near deadlines — creates urgency for Pro upgrade |
| 6 | Resume Roaster | "Wow" moment early — brutal honesty creates trust fast |
| 7 | Community Decisions | Unique data moat — GMAT Club outcomes builds credibility |

---

## 5. Kill List — Remove or Consolidate

These features are redundant, low-value, or create cognitive overload without adding a meaningful use case.

| Feature | Action | Reason |
|---|---|---|
| Word Counter | Kill | Exists in every essay editor; not a standalone tool |
| App Checklist AND App Checklist (per-school) | Consolidate into one | Two separate routes (`/checklist` and `/app-checklist`) for the same concept |
| Interview Question Bank AND Question Bank | Consolidate | Two separate nav entries (`/interview/questions` and `/interview-bank`) pointing to same concept |
| Rec Tracker (separate from Rec Strategy) | Merge into Rec Strategy | Tracker is a tab within Strategy, not a standalone tool |
| GMAT Predictor | Kill or merge into Profile Report | Redundant with Fit Score and Profile Report |
| Salary Negotiator | Demote to Decide journey footer | Useful but low-frequency; not a recurring-use feature |
| Events / Info Sessions | Kill or defer | Requires ongoing data maintenance; low differentiation |
| Alumni Network | Defer | Requires data Admit Compass does not have yet |
| Admission Trends | Merge into school detail page | Per-school trend data belongs on school pages, not standalone |
| Diversity Stats | Merge into school detail page | Same as above |
| Class Profiles | Merge into Compare tool | Compare already does side-by-side; Class Profiles is a tab, not a page |
| MBA Readiness Quiz | Demote to onboarding flow | One-time use; not a nav item |
| Career Paths | Demote to school detail page | Post-MBA placements belong on each school's page |
| Fit Score | Merge into Profile Report | These are the same concept split across two routes |
| Radar Comparison | Merge into Compare tool | Radar is a view toggle on Compare, not a standalone page |

**Net result:** 41 nav items collapse to approximately 18–20 meaningful destinations.

---

## 6. Navigation Redesign

### Current State
- 2 mega-menus with 20 and 21 items each
- Dashboard + Tracker as standalone links
- "Book Consult" CTA
- Total: 44 nav destinations

### Proposed State — 5 top-level items + 2 utilities

```
ADMIT COMPASS.    [Explore]  [Build]  [Apply]  [Interview]  [Decide]    [Search ⌘K]  [Plan: Free ▾]  [Profile]
```

Each top-level item opens a focused dropdown with 4–6 items max (not 20).

| Nav Item | Dropdown Contents |
|---|---|
| **Explore** | School Directory, Odds Calculator, Community Decisions, Rankings, Compare Schools, Profile Report |
| **Build** | Essay Evaluator, Resume Roaster, Storyteller, Goal Sculptor, Essay Drafts |
| **Apply** | Application Tracker, Deadline Calendar, App Checklist, Rec Strategy, Networking Hub |
| **Interview** | Interview Simulator, Question Bank |
| **Decide** | Scholarships & Aid, Waitlist Strategy, ROI Calculator |
| **Search** | Global cmd+K (already built) |
| **Plan pill** | Shows current plan (Free/Pro/Premium), clicking opens upgrade modal |
| **Profile** | Avatar/pill, links to profile settings, sign out |

Dashboard becomes the logged-in home page — not a nav item. It is the default landing state after auth.

---

## 7. Mobile-First Feature Prioritization

Mobile users are in-the-moment (checking odds, reviewing deadlines, reading feedback). Desktop users are doing deep work (writing essays, comparing schools).

### Mobile — Core experience, must be flawless

| Feature | Mobile Priority | Notes |
|---|---|---|
| Odds Calculator | P0 | Single input, single output — perfect for mobile |
| Application Tracker | P0 | Quick status checks, deadline countdowns |
| Deadline Calendar | P0 | Date-focused, single column works well |
| Interview Question Bank | P0 | Read-only reference during prep |
| Community Decisions | P0 | Scrollable list — mobile-native pattern |
| School Directory (browse) | P1 | Search works; complex filters need simplification |
| Essay Evaluator | P1 | Input is painful on mobile; still needed |
| Interview Simulator | P1 | Voice/text input — mobile is viable |
| Notifications / Deadlines | P0 | Push notification layer for future |

### Desktop — Complex tools, acceptable to be desktop-only

| Feature | Desktop Only | Reason |
|---|---|---|
| School Compare (side-by-side table) | Yes | Multi-column layout breaks on mobile |
| Radar Comparison | Yes | SVG chart is unreadable at 375px |
| Essay Drafts (editor) | Yes | Writing long-form on mobile is rare |
| Resume Roaster (paste + review) | Yes | Long text input — desktop use case |
| Storyteller / Goal Sculptor | Yes | Extended AI conversation — desktop session |
| Rankings Table | Partial | Show top 10 on mobile; full table on desktop |
| Profile Report | Partial | Summary card on mobile; full breakdown on desktop |

### Mobile Navigation Pattern
The current hamburger menu opens a full-screen drawer with all 41 items. Proposed:

**Bottom tab bar (5 items):**
```
[Explore]  [Build]  [Apply]  [Interview]  [Profile]
```
"Decide" features (scholarships, waitlist) fold into Apply or Profile on mobile — low mobile frequency.

Each tab shows only the 3–4 most relevant items for that stage. "More" expands the full list.

---

## 8. Dashboard Redesign

The current dashboard is a tool catalog. It should be a command center that tells the user what to do next.

### Current dashboard sections (too many)
Profile entry, Recommendations, Recently Viewed, Status Pipeline, Deadlines, Fit Summary, School Cards, Toolkit (16 tools)

### Proposed dashboard — 4 sections only

**Section 1: Next Actions (top of page)**
3 cards, AI-generated based on current stage and upcoming deadlines.
Example: "R1 Harvard deadline in 23 days — run Essay Evaluator" / "You haven't touched Interview Prep — R1 interviews start in 6 weeks"

**Section 2: My Schools (application tracker inline)**
Compact kanban or list. Status, deadline countdown, next action per school. This replaces the full `/my-schools` page for quick access.

**Section 3: Deadline Countdown**
Already well-built. Keep as-is. Cap at 5 items.

**Section 4: Quick Tools (6 items only)**
The 6 P0 tools from the priority list above. No "Show All 16 Tools" toggle. If a user wants more tools, they navigate via the top nav.

---

## Implementation Priority

| Phase | Changes | Effort | Impact |
|---|---|---|---|
| **Phase 1** (now) | Consolidate duplicate nav items (kill Word Counter, merge checklist routes, merge interview bank routes) | Low (1–2 days) | Reduces nav clutter immediately |
| **Phase 2** (next 2 weeks) | Restructure nav to 5 journeys with max 6-item dropdowns | Medium (3–5 days) | Biggest UX impact — first thing users see |
| **Phase 3** (next 4 weeks) | Dashboard redesign — Next Actions section, reduce Toolkit to 6 items | Medium (3–4 days) | Improves new user activation |
| **Phase 4** (next quarter) | Mobile bottom tab bar, merge school-level data into school detail pages | High (2+ weeks) | Long-term retention and mobile growth |

---

## Success Metrics for This Simplification

| Metric | Current (baseline) | Target (90 days) |
|---|---|---|
| Time to first AI tool use (new user) | Measure baseline | -40% |
| Nav click distribution (% landing on P0 features) | Measure baseline | >60% of clicks on 7 priority features |
| Bounce rate from dashboard | Measure baseline | -25% |
| Mobile session length | Measure baseline | +30% |
| Free → Pro conversion rate | Measure baseline | +20% (cleaner journey = clearer upgrade moment) |
