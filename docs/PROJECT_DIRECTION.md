# MBA Admissions AI - Project Direction & Gap Analysis

## What We're Building

An AI-powered MBA admissions platform that helps applicants research schools, prepare applications, practice interviews, and make data-driven decisions. Think "Common App meets Bloomberg Terminal" for MBA admissions - comprehensive, data-rich, and intelligent.

**Target user**: Working professionals (25-35) researching and applying to MBA programs globally.

**Core value prop**: Replace the fragmented MBA admissions process (10+ browser tabs, $500+ consultants, scattered forums) with one intelligent platform that knows every school, every deadline, every essay prompt, and learns from real applicant outcomes.

---

## Architecture

```
frontend/               Next.js 15 + React 19 + TypeScript + Tailwind v4
  src/app/              126 routes (App Router)
  src/components/       Shared UI components
  src/hooks/            Custom React hooks (useUsage, useAbortSignal, etc.)
  src/lib/              API client, analytics, schemas

backend/                Python FastAPI
  routers/              19 domain routers
  scraper/              4-stage data pipeline (discover -> resolve -> crawl -> extract)
  data/                 School DB (1,837 schools), scraped overlays, info sites, applicant data
  agents.py             School DB loader with 4-layer data overlay
  guardrails.py         Input validation + content filtering
  usage.py              Per-user usage tracking + tier enforcement
  middleware.py         Cache, rate limit, timeout, GZIP middleware
```

**Key numbers**:
- 128K lines Python backend, 42K lines TypeScript frontend
- 141 commits across the project
- 1,837 schools (893 real, 944 synthetic filler)
- 508 schools with real scraped data
- 126 frontend routes
- 19 backend API routers

---

## What We've Built (Feature Inventory)

### Data Pipeline (Complete)
- [x] 4-stage scraper: discover -> URL resolve -> crawl -> Claude API extract
- [x] DuckDuckGo HTML search for URL resolution (bypasses Google CAPTCHA)
- [x] Program-aware queries (MBA vs MiM vs EMBA vs MSc)
- [x] httpx fallback for Cloudflare-blocked sites
- [x] Resume-safe pipeline (skips already-crawled schools)
- [x] Top 30 school admissions subpage crawl (essays, deadlines, class profiles)
- [x] Info site scraping: Clear Admit, Poets & Quants, Stacy Blackman
- [x] Real applicant data: GMAT Club decisions, Clear Admit LiveWire, Reddit r/MBA
- [x] 4-layer data overlay: base DB -> scraped -> backfill -> info sites -> quality scoring

### School Research
- [x] School directory with filtering, search, pagination (125+ pages)
- [x] School detail pages with program stats, deadlines, essays, admission requirements
- [x] Data quality badges (Verified vs AI-Generated)
- [x] School comparison tool (side-by-side)
- [x] Similar schools recommendations
- [x] GMAT targets by school
- [x] Acceptance rate calculator
- [x] Rankings page
- [x] Class profile visualization
- [x] Employment/placement stats
- [x] Fee calculator + fee tracker
- [x] Cost of living comparison
- [x] Campus life info
- [x] Concentrations/specializations
- [x] Dual degree programs
- [x] Exchange programs
- [x] Program formats (full-time, part-time, online, executive)

### Application Tools
- [x] Essay prompt database (1,819 schools covered)
- [x] Essay drafting tool
- [x] Essay tone checker
- [x] Essay length optimizer
- [x] Essay word frequency analyzer
- [x] Essay themes explorer
- [x] Word bank / word counter
- [x] Application checklist generator
- [x] Application timeline builder
- [x] Recommender tracker
- [x] Recommendation letter tips
- [x] Resume keyword analyzer
- [x] Letter of intent builder
- [x] Reapplicant guide
- [x] Fee waiver info
- [x] Round strategy advisor

### Interview Prep
- [x] AI-powered mock interview simulator
- [x] Voice mode (Web Speech API - speak questions, hear responses)
- [x] School-specific interview bank
- [x] Alumni interview prep
- [x] Interview performance scoring (content, delivery, strategy)
- [x] Session history with replay

### Analytics & Decision Making
- [x] Admit odds simulator (Monte Carlo simulation)
- [x] ROI calculator
- [x] ROI by industry breakdown
- [x] Salary database + salary negotiation tips
- [x] Scholarship estimator
- [x] Financial aid comparison
- [x] Budget planner
- [x] Peer comparison tool
- [x] Fit score calculator
- [x] School culture quiz / culture map
- [x] GMAT vs GRE comparison
- [x] GMAT score breakdown tool
- [x] GMAT predictor
- [x] GMAT study planner
- [x] Score converter

### Community & Content
- [x] Real applicant profiles and decision data
- [x] Student reviews from GMAT Club / Reddit
- [x] Admission trends visualization
- [x] Acceptance history
- [x] Community page
- [x] Podcasts directory
- [x] Reading list
- [x] MBA glossary + quiz
- [x] MBA myths quiz
- [x] Networking guide + tracker
- [x] School news aggregator
- [x] Events calendar

### User Management
- [x] Auth (NextAuth)
- [x] Session management
- [x] Profile with GMAT/GPA/work experience
- [x] Dashboard with tracked schools + deadlines
- [x] My Schools list
- [x] Alerts / notifications
- [x] Countdown to deadlines

### Infrastructure
- [x] Input guardrails (content validation, tier enforcement)
- [x] Usage tracking per user
- [x] Rate limiting middleware
- [x] Response caching (300s TTL)
- [x] Request timeout middleware
- [x] GZIP compression
- [x] Health checks + readiness probes
- [x] Error boundaries with retry
- [x] AbortController cleanup on unmounts
- [x] Analytics event tracking

---

## Direction & Strategy

### Phase 1: Data Moat (Mostly Complete)
Build the most comprehensive MBA school database in the market.
- 1,837 schools (more than any competitor)
- Real scraped data from official school websites
- Cross-referenced from 3+ third-party sources
- Real applicant outcomes from community forums
- **Gap**: ~350 schools have thin data (scraped but extraction returned mostly nulls due to bot protection or wrong URLs)

### Phase 2: Application Intelligence (In Progress)
Help users not just research but actively apply.
- Essay prompts + AI-assisted drafting
- Deadline tracking with smart alerts
- Application checklist with progress
- Mock interviews with voice mode
- **Gap**: Essay drafting is template-based, needs real student essay examples for humanizer training

### Phase 3: Personalization (Partially Built)
Tailor everything to the individual applicant's profile.
- Fit scores based on GMAT/GPA/work exp match
- Personalized school recommendations
- Odds calculator based on profile
- **Gap**: No ML model trained on real outcomes yet - currently rule-based

### Phase 4: Monetization (Scaffolded)
- Pricing page exists
- Stripe checkout wired
- Usage tiers (free/pro) defined
- Guardrails enforce tier limits
- **Gap**: No actual payment flow tested end-to-end

### Phase 5: Community & Network Effects (Early)
- Real applicant data displayed on school pages
- Student reviews visible
- **Gap**: No user-generated content yet (reviews, essays, tips from our users)

---

## Known Gaps & Open Questions

### Data Quality
1. **~350 schools with thin scraped data** - homepage-only crawl returned nulls for many fields. Need targeted subpage crawls or manual curation for Tier 2/3 schools
2. **944 synthetic schools** - hex-ID schools with generated data. These pad the count but add noise. Should we remove them or clearly mark them?
3. **Essay prompts mostly synthetic** - 1,819 have essays but most are AI-generated, not from actual school websites. Only top 30 have real scraped prompts
4. **Deadline accuracy** - Many deadlines are from scraping and may be from prior admission cycles. Need annual refresh mechanism
5. **No structured alumni/employer data** - Employment stats sparse for non-T25 schools

### Product
6. **No onboarding flow** - New users land on dashboard with no guidance
7. **No school bookmarking UX** - "My Schools" exists but the add-to-list flow is buried
8. **126 routes but no clear user journey** - Feature sprawl risk. Users might not discover tools
9. **No mobile app** - Responsive web only
10. **Search is basic** - No fuzzy search, no "find schools where acceptance rate > 30% and GMAT < 700"
11. **No collaborative features** - Can't share school lists or compare with friends

### Technical
12. **No CI/CD pipeline** - GitHub Actions not configured
13. **No staging environment** - Local dev only
14. **Frontend submodule architecture** - Complicates deployment and PRs
15. **No database** - All data in JSON files. Works for now but won't scale for user data
16. **No caching layer** - In-memory only, no Redis
17. **Backend tests at 511 but no frontend test suite running in CI**
18. **No monitoring/observability** - No error tracking (Sentry), no analytics dashboard
19. **API key leaked in .env.example** - Rotated but indicates need for better secret management

### AI/ML
20. **Interview simulator uses generic prompts** - Not trained on actual school interview styles
21. **No ML model for admit prediction** - Rule-based only. Could train on GMAT Club data
22. **Essay feedback is basic** - No fine-tuned model for MBA essay review
23. **Voice mode is browser-only** - Web Speech API doesn't work on all browsers/devices

### Business
24. **No competitive differentiation analysis done recently** - Market is moving fast
25. **No user research/feedback loop** - Building based on assumptions
26. **Pricing not validated** - No idea what users would pay
27. **No content marketing / SEO strategy** - 126 pages but no SEO optimization
28. **No referral mechanism**

---

## Priority Matrix

| Priority | Item | Impact | Effort | Notes |
|----------|------|--------|--------|-------|
| P0 | CI/CD + staging deploy | High | Medium | Can't ship without it |
| P0 | Remove synthetic schools or clearly segregate | High | Low | Data trust issue |
| P0 | Onboarding flow for new users | High | Medium | First impression |
| P1 | Advanced search / filter | High | Medium | Core UX gap |
| P1 | PostgreSQL migration for user data | High | High | JSON won't scale |
| P1 | Annual deadline refresh mechanism | Medium | Low | Data freshness |
| P1 | SEO metadata on all 126 routes | High | Low | Free traffic |
| P1 | Error tracking (Sentry) | Medium | Low | Can't debug prod |
| P2 | ML admit prediction model | High | High | Differentiator |
| P2 | Real essay examples (humanized) | High | Medium | Key feature gap |
| P2 | Mobile app (React Native) | Medium | High | Market expectation |
| P2 | User-generated reviews | Medium | Medium | Network effects |
| P3 | Collaborative school lists | Low | Medium | Nice-to-have |
| P3 | Referral system | Medium | Medium | Growth lever |

---

## Business Model & Strategy

### Market Opportunity

**TAM**: ~250,000 MBA applicants/year in the US alone. ~500,000+ globally including EMBA, MiM, specialized masters.

**Current spend per applicant**:
| Item | Cost | Our Alternative |
|------|------|-----------------|
| Admissions consultant | $3,000 - $15,000 | AI-powered guidance at $29-99/mo |
| GMAT prep courses | $500 - $2,000 | GMAT planner + predictor (included) |
| School research | 40-80 hours | Instant across 1,837 schools |
| Interview coaching | $200 - $500/session | Unlimited AI mock interviews |
| Essay review | $300 - $1,000/essay | AI essay feedback (included) |
| **Total traditional** | **$4,000 - $19,000** | **$29 - $99/month** |

### Revenue Model

**Freemium SaaS** with usage-based gates:

| Tier | Price | Limits | Target |
|------|-------|--------|--------|
| Free | $0 | 3 schools, 5 interviews/mo, basic tools | Lead gen, SEO traffic |
| Pro | $29/mo | Unlimited schools, 50 interviews/mo, essay tools, voice mode | Active applicants |
| Premium | $99/mo | Everything + AI essay review, admit prediction, priority support | Serious R1/R2 applicants |
| Consultant | $249/mo | Multi-client management, white-label reports | Independent consultants |

**Revenue projections** (conservative):
- Month 3: 100 users, 10% conversion = 10 paid = $290-990/mo
- Month 6: 1,000 users, 8% conversion = 80 paid = $2,320-7,920/mo
- Month 12: 10,000 users, 6% conversion = 600 paid = $17,400-59,400/mo

### Competitive Landscape

| Competitor | Strengths | Weaknesses | Our Edge |
|-----------|-----------|------------|----------|
| **Poets & Quants** | Brand, rankings, content | No tools, no personalization | 126 interactive tools vs static articles |
| **Clear Admit** | LiveWire community, school guides | Paywalled, dated UX | Free tier + real-time data pipeline |
| **GMAT Club** | Massive forum, decision tracker | Forum UX, no AI tools | Structured data from their forums + AI layer |
| **ApplicantLab** | DIY course, affordable | Static curriculum, no school data | Dynamic, personalized, data-driven |
| **Admissions consultants** | Human judgment, networks | $5K-15K, limited scale | 100x cheaper, available 24/7, data-backed |
| **ChatGPT/Claude directly** | General AI, free | No MBA-specific data, no school DB | Domain-specific, 1,837 schools, real applicant data |

**Moat**: The combination of (1) comprehensive school database, (2) real applicant outcome data, (3) AI tools purpose-built for MBA admissions creates a defensible position that neither general AI tools nor traditional consultants can easily replicate.

### Go-to-Market Strategy

**Phase 1: SEO + Content (Months 1-3)**
- 126 routes = 126 indexable pages for long-tail SEO
- Target keywords: "{school name} MBA essays", "{school} acceptance rate", "MBA interview questions"
- Each school page is a landing page (1,837 potential organic entry points)
- **Cost: $0** (organic only)

**Phase 2: Community Seeding (Months 3-6)**
- Share tools on Reddit r/MBA, GMAT Club, Beat The GMAT
- Free tier drives word-of-mouth
- Applicant data contribution loop: users share outcomes, we enrich the platform
- **Cost: Time only**

**Phase 3: Partnerships (Months 6-12)**
- Partner with GMAT prep companies (cross-sell)
- White-label for independent admissions consultants
- University partnerships for applicant analytics
- **Cost: BD time**

### Unit Economics

| Metric | Value | Notes |
|--------|-------|-------|
| CAC (organic) | ~$0 | SEO-driven |
| CAC (paid, later) | $15-30 | MBA-related keywords are expensive |
| ARPU | $29-99/mo | Blended across tiers |
| LTV (6-mo avg subscription) | $174-594 | MBA application cycle is 6-12 months |
| Gross margin | 85-90% | Infrastructure costs are low |
| Claude API cost/user/mo | $0.50-2.00 | Interview + essay + extraction |
| Infrastructure/user/mo | $0.10-0.50 | Vercel + Railway |

### Key Risks

1. **Seasonality**: MBA applications are cyclical (R1: Sep-Oct, R2: Jan, R3: Apr). Revenue will spike and dip.
2. **Data freshness**: Schools change deadlines/essays annually. Need automated refresh or it becomes stale.
3. **AI accuracy liability**: If our admit prediction or essay feedback gives bad advice, reputational risk.
4. **Scraping legality**: Crawling school websites is gray area. Need to respect robots.txt and consider API partnerships.
5. **Consultant resistance**: Traditional consultants may view us as competition rather than tooling.

### Defensibility & Moats

1. **Data moat**: 1,837 schools with cross-referenced data from 5+ sources. Takes months to replicate.
2. **Applicant outcome data**: Real decisions from GMAT Club/Reddit. Gets richer with each cycle.
3. **Feature depth**: 126 purpose-built tools. A new entrant would need months to match breadth.
4. **SEO compound effect**: Each school page ranks independently. More pages = more traffic = more data = better product.
5. **Network effects (future)**: User-contributed reviews and outcomes make the platform better for all users.

---

## Tech Debt

1. **128K lines of Python** - Some files likely oversized, need audit
2. **Frontend submodule** - Should be monorepo or at least same-repo
3. **No TypeScript strict mode** - `any` types likely scattered
4. **No API versioning** - Breaking changes will affect users
5. **Scraper has no scheduler** - Manual runs only
6. **No rate limit per-user on scraper endpoints** - Could be abused
7. **`data_quality` computed at runtime** - Should be pre-computed and persisted

---

## What Success Looks Like

### 3 Months (Launch)
- **Product**: Deployed to production (Vercel + Railway), CI/CD green, monitoring live
- **Data**: Top 50 schools with verified fresh data, synthetic schools removed/flagged
- **Users**: 100 beta users, onboarding flow live, free tier fully functional
- **Revenue**: Stripe payment flow tested end-to-end, first 5-10 paid users
- **Metrics**: Avg session > 5 min, >3 tools used per session, <2% error rate

### 6 Months (Growth)
- **Product**: ML-powered admit prediction, real essay corpus, PWA installable
- **Data**: All 893 real schools with fresh 2026-2027 cycle data
- **Users**: 1,000 users, 80+ paid, NPS > 40
- **Revenue**: $2,000-8,000 MRR, unit economics validated
- **Growth**: SEO driving 50%+ of traffic, 3+ Reddit/GMAT Club mentions/week
- **Team**: 1 additional hire (content/data) or advisor

### 12 Months (Scale)
- **Product**: Mobile app, collaborative features, consultant tier
- **Data**: User-contributed reviews creating data flywheel
- **Users**: 10,000 users, 600+ paid
- **Revenue**: $17,000-60,000 MRR, path to $500K ARR
- **Growth**: #1 Google result for 20+ MBA application keywords
- **Partnerships**: 1-2 GMAT prep or admissions consultant partnerships
- **Fundraise**: Metrics to support seed round if desired ($1-2M at $8-12M valuation)
