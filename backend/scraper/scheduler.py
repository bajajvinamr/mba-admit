"""Scraper scheduler — tiered crawl frequency per TRD Section 4.3.

Tier  | Schools         | Frequency  | Method
------|-----------------|------------|------------------
T1    | M7 (7 schools)  | Weekly     | Full subpage crawl
T2    | T25 (18 more)   | Monthly    | Full subpage crawl
T3    | T50 (25 more)   | Quarterly  | Homepage + key subpages
T4-T5 | Rest (800+)     | Annually   | Homepage only

Triggered by Railway cron or manual CLI invocation.
"""

from __future__ import annotations

import json
import logging
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# School tier definitions
M7 = ["hbs", "gsb", "wharton", "booth", "kellogg", "columbia", "sloan"]
T15 = M7 + ["tuck", "haas", "ross", "fuqua", "darden", "stern", "yale", "anderson"]
T25 = T15 + ["lbs", "insead", "johnson", "tepper", "mccombs", "kenan_flagler", "olin", "georgetown", "kelley", "owen"]
T50 = T25  # Extend with more schools as needed


def get_schools_for_tier(tier: str) -> list[str]:
    """Get school IDs for a given tier."""
    tiers = {
        "t1": M7,
        "t2": [s for s in T25 if s not in M7],
        "t3": [s for s in T50 if s not in T25],
        "all": None,  # All schools
    }
    return tiers.get(tier, M7)


def run_crawl(school_ids: list[str] | None, subpages: bool = False) -> dict:
    """Run the scraper pipeline for a set of schools.

    Args:
        school_ids: List of school IDs to crawl, or None for all
        subpages: If True, crawl admissions subpages (not just homepage)

    Returns:
        Dict with crawl results summary
    """
    start = datetime.now(timezone.utc)
    results = {"started_at": start.isoformat(), "schools": len(school_ids or []), "subpages": subpages}

    try:
        # Build command
        cmd = [sys.executable, "-m", "scraper.run", "crawl"]
        if school_ids:
            cmd.extend(["--schools", ",".join(school_ids)])

        logger.info("Starting crawl: %d schools, subpages=%s", len(school_ids or []), subpages)
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=3600, cwd=str(DATA_DIR.parent))

        results["exit_code"] = proc.returncode
        results["stdout_lines"] = len(proc.stdout.splitlines())
        results["stderr_lines"] = len(proc.stderr.splitlines())

        if proc.returncode == 0:
            logger.info("Crawl completed successfully")
            # Run extraction
            extract_cmd = [sys.executable, "-m", "scraper.run", "extract"]
            if school_ids:
                extract_cmd.extend(["--schools", ",".join(school_ids)])

            extract_proc = subprocess.run(extract_cmd, capture_output=True, text=True, timeout=7200, cwd=str(DATA_DIR.parent))
            results["extract_exit_code"] = extract_proc.returncode

            if extract_proc.returncode == 0:
                # Run merge
                merge_cmd = [sys.executable, "-m", "scraper.run", "merge"]
                subprocess.run(merge_cmd, capture_output=True, text=True, timeout=300, cwd=str(DATA_DIR.parent))
                results["merged"] = True

    except subprocess.TimeoutExpired:
        logger.error("Crawl timed out")
        results["error"] = "timeout"
    except Exception as exc:
        logger.error("Crawl failed: %s", exc)
        results["error"] = str(exc)

    results["duration_s"] = (datetime.now(timezone.utc) - start).total_seconds()

    # Log results
    log_path = DATA_DIR / "scraper_runs.jsonl"
    with open(log_path, "a") as f:
        f.write(json.dumps(results) + "\n")

    return results


def scheduled_crawl(tier: str = "t1") -> dict:
    """Entry point for scheduled crawls.

    Args:
        tier: "t1" (M7 weekly), "t2" (T25 monthly), "t3" (T50 quarterly), "all" (annual)
    """
    school_ids = get_schools_for_tier(tier)
    subpages = tier in ("t1", "t2")  # Full subpage crawl for top tiers

    logger.info("Scheduled crawl: tier=%s, schools=%d, subpages=%s", tier, len(school_ids or []), subpages)
    return run_crawl(school_ids, subpages=subpages)


# CLI entry point
if __name__ == "__main__":
    import argparse
    logging.basicConfig(level=logging.INFO)

    parser = argparse.ArgumentParser(description="Run scheduled scraper crawl")
    parser.add_argument("--tier", default="t1", choices=["t1", "t2", "t3", "all"],
                        help="School tier to crawl (default: t1/M7)")
    args = parser.parse_args()

    result = scheduled_crawl(args.tier)
    print(json.dumps(result, indent=2))
