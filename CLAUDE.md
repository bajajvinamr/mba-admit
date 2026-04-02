# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project

MBA Admissions AI - Full-stack platform helping MBA applicants research schools, craft essays, simulate admissions odds, and plan applications with AI-powered insights.

## Commands

```bash
# Backend
cd backend && python -m pytest tests/ -q          # Run 535 backend tests
cd backend && uvicorn main:app --reload --port 8000  # Start backend

# Frontend
cd frontend && npm install                         # Install deps
cd frontend && npm run dev                         # Start frontend (proxies to :8000)
cd frontend && npm test                            # Run frontend tests
```

## Architecture

- **Frontend:** Next.js 16 + React 19 + TypeScript + Tailwind v4
- **Backend:** Python FastAPI + Claude API + Pydantic
- **Data:** JSON flat files (school_db_full.json, 893 programs)
- **Scraper:** httpx + Playwright + Claude extraction pipeline

## gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
