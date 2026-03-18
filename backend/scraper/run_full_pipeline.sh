#!/usr/bin/env bash
# Full scraper pipeline — runs on local machine using local API key.
# Usage: cd backend && bash scraper/run_full_pipeline.sh
#
# Stages:
#   1. Expand discovery list with all real schools from main DB
#   2. Resolve missing URLs via Google search (batches of 50)
#   3. Crawl all schools with URLs (Playwright, headless)
#   4. Extract structured data with Claude API (your ANTHROPIC_API_KEY)
#   5. Merge back into school_db_full.json
#
# Resume-safe: each stage skips already-completed work.

set -euo pipefail

BATCH_SIZE=50
LOG_FILE="scraper/pipeline_$(date +%Y%m%d_%H%M%S).log"

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG_FILE"; }

log "=== Full MBA Scraper Pipeline ==="
log "Working directory: $(pwd)"
log "Log file: $LOG_FILE"

# Check prerequisites
if [ ! -f ".env" ]; then
    log "ERROR: .env not found in backend/. Create it with ANTHROPIC_API_KEY."
    exit 1
fi

if ! python3 -c "
from dotenv import load_dotenv
load_dotenv('.env', override=True)
import os
key = os.getenv('ANTHROPIC_API_KEY', '')
assert key.startswith('sk-'), f'Invalid key: {key[:10] if key else \"EMPTY\"}'
" 2>/dev/null; then
    log "ERROR: ANTHROPIC_API_KEY not set or invalid in .env"
    exit 1
fi

# Export key for subprocesses
export $(grep -v '^#' .env | grep ANTHROPIC_API_KEY | head -1 | xargs)
log "API key verified."

# Stage 1: Expand discovery list
log ""
log "=== Stage 1: Expand Discovery List ==="
python3 -m scraper.run expand 2>&1 | tee -a "$LOG_FILE"

# Stage 2: Resolve URLs in batches
log ""
log "=== Stage 2: Resolve Missing URLs ==="
NEED_RESOLVE=$(python3 -c "
import json
with open('data/discovery_list.json') as f:
    d = json.load(f)
print(sum(1 for s in d if not s.get('website')))
")
log "Schools needing URL resolution: $NEED_RESOLVE"

BATCH_NUM=0
while [ "$NEED_RESOLVE" -gt 0 ]; do
    BATCH_NUM=$((BATCH_NUM + 1))
    BATCH=$((NEED_RESOLVE < BATCH_SIZE ? NEED_RESOLVE : BATCH_SIZE))
    log "Batch $BATCH_NUM: resolving $BATCH URLs ($NEED_RESOLVE remaining)"
    python3 -m scraper.run resolve --limit "$BATCH" 2>&1 | tee -a "$LOG_FILE"

    # Re-check how many still need resolving (file is updated each batch)
    NEW_NEED=$(python3 -c "
import json
with open('data/discovery_list.json') as f:
    d = json.load(f)
print(sum(1 for s in d if not s.get('website')))
    ")

    # If no progress was made (same count), stop to avoid infinite loop
    if [ "$NEW_NEED" -eq "$NEED_RESOLVE" ]; then
        log "No progress in batch $BATCH_NUM — $NEW_NEED schools still unresolvable. Moving on."
        break
    fi

    NEED_RESOLVE=$NEW_NEED
    log "Still need resolving: $NEED_RESOLVE"

    # Brief pause between batches
    sleep 2
done

# Stage 3: Crawl
log ""
log "=== Stage 3: Crawl All Schools ==="
python3 -m scraper.run crawl 2>&1 | tee -a "$LOG_FILE"

# Stage 4: Extract
log ""
log "=== Stage 4: Extract with Claude API ==="
python3 -m scraper.run extract 2>&1 | tee -a "$LOG_FILE"

# Stage 5: Merge
log ""
log "=== Stage 5: Merge into Main DB ==="
python3 -m scraper.run merge 2>&1 | tee -a "$LOG_FILE"

# Final stats
log ""
log "=== Pipeline Complete ==="
python3 -m scraper.run stats 2>&1 | tee -a "$LOG_FILE"

log ""
log "Done! Log saved to: $LOG_FILE"
