# Revenue Strategy — Admit Compass
**Date:** 2026-03-17
**Author:** Product Strategy
**Status:** Draft for review

---

## Context: Willingness to Pay

MBA applicants spend $3K–$15K on admissions consultants. The real competition is not other SaaS — it is a human consultant. That frames the value ladder:

- **Free** — better than googling + Reddit. Hooks the user before they've committed to applying.
- **Pro ($29/mo)** — better than the $200 "essay review" services. No-brainer for anyone who is serious.
- **Premium ($79/mo)** — replaces the $500/school consultant package. Targets applicants applying to 4+ schools with M7 ambition.

---

## Tier Feature Matrix

| Feature | Free | Pro ($29/mo) | Premium ($79/mo) | Rationale |
|---|---|---|---|---|
| **School Directory (840+ programs)** | Full access | Full access | Full access | Top-of-funnel hook — must be free |
| **Rankings / Compare (2-school)** | Full access | Full access | Full access | Sidecar — drives engagement, not revenue |
| **Community Decisions (GMAT Club data)** | Full access | Full access | Full access | Moat differentiator — free builds trust |
| **Odds Calculator** | 3 runs/day | Unlimited | Unlimited | High hook value — limited free creates urgency |
| **Application Tracker (school list)** | Up to 5 schools | Unlimited | Unlimited | Free tier covers early exploration; paywall hits when list grows |
| **Deadline Calendar** | Free | Free | Free | Utility sidecar — keeps users returning |
| **Profile Report** | 1 run | Unlimited | Unlimited | High perceived value, immediate personalization |
| **Fit Score** | View only (3 schools) | Unlimited | Unlimited | Personalized data = strong conversion driver |
| **Resume Roaster** | 1 use | 10 uses/mo | Unlimited | AI feedback — limited free is the hook |
| **Essay Evaluator** | 1 use | 10 uses/mo | Unlimited | Core monetization driver — applicants rewrite 5-10x |
| **Essay Drafts (storage)** | 3 drafts | Unlimited | Unlimited | Storage limit is a natural paywall |
| **Master Storyteller** | 1 session | 5 sessions/mo | Unlimited | High value for early-stage applicants |
| **Goal Sculptor** | 1 session | 5 sessions/mo | Unlimited | Bundle with Storyteller in UX |
| **Interview Simulator** | 3 sessions | 20 sessions/mo | Unlimited | Converts well near application deadlines |
| **Interview Question Bank** | Full access | Full access | Full access | Sidecar — drives retention, not paywall |
| **Rec Strategy** | 1 run | Unlimited | Unlimited | Short session, high perceived value |
| **Networking / Outreach Hub** | 1 draft | 10 drafts/mo | Unlimited | Lower urgency feature — Pro is sufficient |
| **Waitlist Strategy** | 1 session | Unlimited | Unlimited | Seasonal (Jan–Apr) — good Pro sticky feature |
| **School Compare (3+ schools)** | 2 schools | 5 schools | Unlimited | Natural expansion limit |
| **Radar Comparison** | Locked | Pro | Unlimited | Visual feature — Pro feels premium |
| **Scholarship / Aid Estimator** | View ranges | Full + tailored | Full + tailored | Financial anxiety is a strong purchase trigger |
| **ROI Calculator** | Free | Free | Free | Sidecar — justifies the MBA decision, not gated |
| **App Checklist (per school)** | 1 school | Unlimited | Unlimited | Functional tool — paywall when managing multiple apps |
| **GMAT Planner** | Free | Free | Free | Sidecar — top-of-funnel for pre-applicants |
| **Admit Simulator (Monte Carlo)** | 1 run | Unlimited | Unlimited | High "wow" factor — strong free trial hook |
| **Admission Trends (5yr data)** | Current year only | Full history | Full history | Data depth = Pro differentiator |
| **Diversity / Class Profile Stats** | Free | Free | Free | Sidecar — research tool |
| **Priority School Recommendations** | Top 3 only | Top 10 | Personalized list, unlocks "reach" tier explanations | Core product value |
| **Export (essays, checklist, tracker)** | Locked | PDF export | PDF + custom formats | Functional Pro feature |
| **Consulting Call (60 min)** | — | — | 1 included/cycle ($200 value) | Premium anchor — human layer justifies $79 |
| **AI Strategy Review (full application)** | — | — | Quarterly review session | Premium-only, replaces $500 consultant session |

---

## Tier Packaging Summary

### Free
Core research, 1-shot AI tools, up to 5 schools tracked. Enough to get hooked; not enough to finish the application process.

### Pro — $29/month (or $249/year = 28% discount)
Everything a self-directed applicant needs. Unlimited AI tool usage within monthly caps, unlimited school tracking, full data access. Target: anyone who has decided to apply.

### Premium — $79/month (or $649/year = 32% discount)
Fully unlimited, plus the human layer: one consulting call included per application cycle, quarterly AI strategy review. Replaces a $2K–$5K partial consultant engagement. Target: M7/T15 applicants applying to 5+ schools.

---

## Revenue Model: Conversion Assumptions

| Metric | Conservative | Base | Optimistic |
|---|---|---|---|
| Free → Pro conversion | 3% | 6% | 10% |
| Pro → Premium upgrade | 8% | 15% | 22% |
| Average revenue per paying user (blended) | $31 | $33 | $36 |
| Monthly churn (paying) | 12% | 8% | 5% |

**Assumption basis:** Admissions consulting has high urgency, seasonal demand spikes (R1 Sept–Oct, R2 Jan), and applicants research for 3–9 months before submitting. Churn is naturally high but offset by a new cohort every cycle.

---

## Revenue Projections

### 10,000 MAU

| Scenario | Paying Users | MRR | ARR |
|---|---|---|---|
| Conservative (3% conv) | 300 | $9,300 | $112K |
| Base (6% conv) | 600 | $19,800 | $238K |
| Optimistic (10% conv) | 1,000 | $36,000 | $432K |

### 50,000 MAU

| Scenario | Paying Users | MRR | ARR |
|---|---|---|---|
| Conservative | 1,500 | $46,500 | $558K |
| Base | 3,000 | $99,000 | $1.19M |
| Optimistic | 5,000 | $180,000 | $2.16M |

### 100,000 MAU

| Scenario | Paying Users | MRR | ARR |
|---|---|---|---|
| Conservative | 3,000 | $93,000 | $1.12M |
| Base | 6,000 | $198,000 | $2.38M |
| Optimistic | 10,000 | $360,000 | $4.32M |

---

## Seasonal Revenue Pattern

MBA admissions is highly seasonal. Plan for:

| Period | Demand Level | Strategy |
|---|---|---|
| June–August | High (R1 prep begins) | Launch Pro push, "R1 Ready" campaign |
| September–October | Peak (R1 deadlines) | Highest conversion window — promote Premium |
| November–December | Medium (R2 prep) | Retention offers for R1 users who got waitlisted |
| January–February | High (R2 deadlines) | Second conversion spike — Waitlist feature pushes Premium |
| March–May | Low (off-cycle) | Annual plan discounts, GMAT/research content for next cycle |

---

## Highest-ROI Monetization Levers (ranked)

1. **Essay Evaluator** — used 10–30x per application cycle; the paywall hits fast and is justified by quality
2. **Odds Calculator / Admit Simulator** — "will I get in?" is the first question every applicant asks; limited free run creates immediate Pro urgency
3. **Interview Simulator** — high session time, high perceived value near deadlines
4. **App Tracker limit (5 schools)** — anyone building a serious list of 6+ schools hits this naturally
5. **Premium consulting call** — the human layer is the primary anchor that justifies $79 over $29

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Free tier too generous — users never convert | Medium | High | Monitor 60-day conversion rate; tighten limits on Essay Evaluator first |
| Seasonality creates cash flow gaps | High | Medium | Push annual plans with 28–32% discount during peak months |
| AI tool quality doesn't match consultant expectations | Medium | High | Premium consulting call de-risks quality perception |
| Competition from free tools (ChatGPT) | High | Medium | Differentiate on data (GMAT Club decisions, school DB) not just AI |
