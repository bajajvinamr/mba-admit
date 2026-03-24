# Scraper Cron Configuration (Railway)

## Setup in Railway Dashboard

Create 3 cron services pointing to the same Dockerfile:

### 1. Weekly M7 Crawl (T1)
- **Schedule**: `0 2 * * 0` (Sunday 2 AM UTC)
- **Command**: `python -m scraper.scheduler --tier t1`
- **Expected duration**: ~30 min

### 2. Monthly T25 Crawl (T2)
- **Schedule**: `0 3 1 * *` (1st of month, 3 AM UTC)
- **Command**: `python -m scraper.scheduler --tier t2`
- **Expected duration**: ~2 hours

### 3. Quarterly T50 Crawl (T3)
- **Schedule**: `0 4 1 1,4,7,10 *` (1st of Jan/Apr/Jul/Oct, 4 AM UTC)
- **Command**: `python -m scraper.scheduler --tier t3`
- **Expected duration**: ~4 hours

## Environment Variables Required
- `ANTHROPIC_API_KEY` — for Claude-powered extraction
- `DATABASE_URL` — if change detection writes to Postgres

## Manual Trigger
```bash
python -m scraper.scheduler --tier t1
python -m scraper.scheduler --tier all  # Annual full crawl
```
