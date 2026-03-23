# MBA Admissions AI

Full-stack platform helping MBA applicants research schools, craft essays, simulate admissions odds, and plan their applications with AI-powered insights.

## Architecture

```
frontend/          Next.js 16 + React 19 + TypeScript + Tailwind v4
backend/           Python FastAPI + Claude API
backend/scraper/   Automated school data pipeline (httpx + Playwright + Claude extraction)
backend/data/      893 real MBA programs, 507 with verified scraped data
infrastructure/    Deployment configs
```

## Features

| Feature | Route | Description |
|---------|-------|-------------|
| School Directory | `/schools` | Browse 893 MBA programs with filtering, GMAT fit labels, data quality badges |
| School Detail | `/school/[id]` | Deep dive: essays, deadlines, class profile, placement stats, real applicant data |
| Admissions Simulator | `/simulator` | Monte Carlo simulation of admit probability |
| Essay Workshop | `/essay-prompts` | School-specific essay prompts with AI feedback |
| Compare Schools | `/compare` | Side-by-side comparison of up to 4 programs |
| Scholarship Estimator | `/scholarship-estimate` | Estimate merit aid based on profile |
| Interview Prep | `/interview` | School-specific interview formats and tips |
| ROI Calculator | `/roi` | Tuition vs. salary ROI analysis |
| Dashboard | `/dashboard` | Personalized tracker: deadlines, recommendations, toolkit |
| Decision Tracker | `/decisions` | Track application outcomes across schools |

## Backend API

FastAPI with 16 routers serving structured school data, AI-powered features, and user state.

**Key endpoints:**
- `GET /api/schools` - School directory with filtering and pagination
- `GET /api/schools/{id}` - Full school profile with data quality metadata
- `GET /api/essay-prompts?school_id=` - Real essay prompts from official sources
- `POST /api/simulator/odds` - Monte Carlo admissions simulation
- `POST /api/strategy/plan` - AI-generated application strategy
- `GET /api/applicant-data/{school_id}` - Real applicant decisions, profiles, reviews
- `GET /health` - Health check with feature flags

**Middleware:** Rate limiting, request timeout (30s/90s for LLM), cache headers, usage tracking, input guardrails.

## Data Pipeline

4-stage scraper pipeline that enriches school data from official sources:

```
discover -> resolve URLs (DuckDuckGo) -> crawl (httpx + Playwright) -> extract (Claude API) -> merge
```

- 893 real schools, 507 with verified scraped data
- Top 30 schools enriched with admissions subpage data (essays, deadlines, class profiles)
- 39 info site pages extracted (Clear Admit, Poets & Quants, Stacy Blackman)
- Real applicant data from GMAT Club, Clear Admit LiveWire, Reddit

## Quick Start

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Add your ANTHROPIC_API_KEY
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev  # Runs on localhost:3000, proxies API to :8000
```

### Run Tests

```bash
# Backend (535 tests)
cd backend && python -m pytest tests/ -q

# Frontend
cd frontend && npm test
```

### Run Scraper Pipeline

```bash
cd backend
python -m scraper.run discover          # Find schools
python -m scraper.run resolve           # Resolve URLs via DuckDuckGo
python -m scraper.run crawl             # Crawl school websites
python -m scraper.run extract           # Extract data via Claude API
python -m scraper.run merge             # Merge into school_db_full.json
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Backend | Python, FastAPI, Pydantic |
| AI | Claude API (Anthropic) for extraction and features |
| Scraping | httpx, Playwright, DuckDuckGo HTML search |
| Data | JSON flat files (school_db_full.json, school_db_scraped.json) |
| Testing | pytest (backend), Vitest (frontend) |

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...   # Required for AI features and scraper extraction
```

## License

Private repository.
