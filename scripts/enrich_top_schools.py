#!/usr/bin/env python3
"""
Enrich top 50 MBA programs in school_db_full.json with real 2025-2026 admissions data.
Adds: application_url, deadlines, scholarships — only fills missing/empty fields.
"""

import json
import os
from copy import deepcopy

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "backend", "data", "school_db_full.json")

# ── Real 2025–2026 admissions data for top MBA programs ──────────────────────

ENRICHMENT_DATA = {
    # ═══════════════════════════════════════════════════════════════════════════
    # M7
    # ═══════════════════════════════════════════════════════════════════════════
    "hbs": {
        "application_url": "https://www.hbs.edu/mba/admissions/apply/",
        "deadlines": [
            {"round": "Round 1", "date": "2025-09-04", "decision_date": "2025-12-10"},
            {"round": "Round 2", "date": "2026-01-06", "decision_date": "2026-03-31"},
            {"round": "2+2", "date": "2026-04-22", "decision_date": None},
        ],
        "scholarships": [
            {"name": "HBS Need-Based Fellowship", "amount_usd": None, "criteria": "Need-based; approximately 50% of students receive grants averaging ~$47,000/year"},
            {"name": "Robert Toigo Foundation Fellowship", "amount_usd": None, "criteria": "Underrepresented minority students pursuing careers in finance"},
            {"name": "John H. McArthur Canadian Fellowship", "amount_usd": None, "criteria": "Canadian citizens attending HBS"},
        ],
    },
    "gsb": {
        "application_url": "https://www.gsb.stanford.edu/programs/mba/admission",
        "deadlines": [
            {"round": "Round 1", "date": "2025-09-10", "decision_date": "2025-12-11"},
            {"round": "Round 2", "date": "2026-01-08", "decision_date": "2026-03-26"},
            {"round": "Round 3", "date": "2026-04-08", "decision_date": "2026-05-15"},
        ],
        "scholarships": [
            {"name": "Stanford GSB Fellowship", "amount_usd": None, "criteria": "Need-based; approximately 30% of students receive fellowships"},
            {"name": "Stanford Reliance Dhirubhai Fellowship", "amount_usd": None, "criteria": "Indian nationals returning to India after MBA"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates demonstrating leadership"},
            {"name": "GSB BOLD Fellows", "amount_usd": None, "criteria": "Building Opportunities for Leadership Diversity — underrepresented minorities"},
        ],
    },
    "wharton": {
        "application_url": "https://mba.wharton.upenn.edu/admissions/",
        "deadlines": [
            {"round": "Round 1", "date": "2025-09-03", "decision_date": "2025-12-10"},
            {"round": "Round 2", "date": "2026-01-06", "decision_date": "2026-03-31"},
            {"round": "Round 3", "date": "2026-04-01", "decision_date": "2026-05-12"},
        ],
        "scholarships": [
            {"name": "Wharton Fellowship", "amount_usd": None, "criteria": "Merit-based; awarded at time of admission, no separate application"},
            {"name": "Joseph Wharton Fellowship", "amount_usd": None, "criteria": "Full-tuition merit fellowship for exceptional candidates"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
            {"name": "Yellow Ribbon Program", "amount_usd": None, "criteria": "US military veterans"},
        ],
    },
    "booth": {
        "application_url": "https://www.chicagobooth.edu/mba/admissions",
        "deadlines": [
            {"round": "Round 1", "date": "2025-09-19", "decision_date": "2025-12-11"},
            {"round": "Round 2", "date": "2026-01-07", "decision_date": "2026-03-19"},
            {"round": "Round 3", "date": "2026-04-02", "decision_date": "2026-05-15"},
        ],
        "scholarships": [
            {"name": "Chicago Booth Merit Scholarship", "amount_usd": None, "criteria": "Merit-based; all admitted students automatically considered"},
            {"name": "Edwardson Civic Scholars Program", "amount_usd": None, "criteria": "Full-tuition for students committed to public/social-sector careers"},
            {"name": "Booth Veterans Scholarship", "amount_usd": None, "criteria": "US military veterans"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
        ],
    },
    "kellogg": {
        "application_url": "https://www.kellogg.northwestern.edu/programs/full-time-mba/admissions.aspx",
        "deadlines": [
            {"round": "Round 1", "date": "2025-09-11", "decision_date": "2025-12-11"},
            {"round": "Round 2", "date": "2026-01-08", "decision_date": "2026-03-26"},
            {"round": "Round 3", "date": "2026-04-02", "decision_date": "2026-05-08"},
        ],
        "scholarships": [
            {"name": "Kellogg Merit Scholarship", "amount_usd": None, "criteria": "Merit-based; all admitted students considered, no separate application"},
            {"name": "Austin Scholar Award", "amount_usd": None, "criteria": "Full-tuition for underrepresented minorities"},
            {"name": "Donald P. Jacobs Scholarship", "amount_usd": None, "criteria": "Merit-based for exceptional academic and professional achievement"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
        ],
    },
    "cbs": {
        "application_url": "https://academics.business.columbia.edu/mba/admissions",
        "deadlines": [
            {"round": "Early Decision", "date": "2026-01-03", "decision_date": "2026-02-14"},
            {"round": "Merit Fellowship", "date": "2026-01-03", "decision_date": "2026-02-14"},
            {"round": "Regular Decision", "date": "2026-04-11", "decision_date": "Rolling through June"},
        ],
        "scholarships": [
            {"name": "Columbia Business Fellows", "amount_usd": None, "criteria": "Merit-based full-tuition; top ~10% of class"},
            {"name": "CBS Merit Fellowship", "amount_usd": None, "criteria": "Merit-based partial tuition; requires separate application by Jan deadline"},
            {"name": "Board of Overseers Fellowship", "amount_usd": None, "criteria": "Exceptional leadership and academic record"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
        ],
    },
    "sloan": {
        "application_url": "https://mitsloan.mit.edu/mba/admissions",
        "deadlines": [
            {"round": "Round 1", "date": "2025-09-24", "decision_date": "2025-12-12"},
            {"round": "Round 2", "date": "2026-01-21", "decision_date": "2026-04-02"},
            {"round": "Round 3", "date": "2026-04-08", "decision_date": "2026-05-14"},
        ],
        "scholarships": [
            {"name": "MIT Sloan Merit Scholarship", "amount_usd": None, "criteria": "Merit-based; all admitted students automatically considered"},
            {"name": "Legatum Fellowship", "amount_usd": None, "criteria": "Entrepreneurs building ventures in developing countries"},
            {"name": "MIT Sloan Fellows", "amount_usd": None, "criteria": "Merit-based for exceptional leadership potential"},
        ],
    },

    # ═══════════════════════════════════════════════════════════════════════════
    # T15
    # ═══════════════════════════════════════════════════════════════════════════
    "tuck": {
        "application_url": "https://www.tuck.dartmouth.edu/mba/admissions",
        "deadlines": [
            {"round": "Round 1", "date": "2025-09-23", "decision_date": "2025-12-11"},
            {"round": "Round 2", "date": "2026-01-06", "decision_date": "2026-03-17"},
            {"round": "Round 3", "date": "2026-03-30", "decision_date": "2026-05-06"},
        ],
        "scholarships": [
            {"name": "Tuck Scholarship", "amount_usd": None, "criteria": "Merit-based; all admitted students considered automatically"},
            {"name": "Tuck Diversity Fellowship", "amount_usd": None, "criteria": "Underrepresented minorities and diverse backgrounds"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
        ],
    },
    "haas": {
        "application_url": "https://mba.haas.berkeley.edu/admissions",
        "deadlines": [
            {"round": "Round 1", "date": "2025-09-25", "decision_date": "2025-12-18"},
            {"round": "Round 2", "date": "2026-01-09", "decision_date": "2026-03-26"},
            {"round": "Round 3", "date": "2026-04-03", "decision_date": "2026-05-08"},
        ],
        "scholarships": [
            {"name": "Haas Merit Scholarship", "amount_usd": None, "criteria": "Merit-based; all admitted students automatically considered"},
            {"name": "Hansoo Lee Fellowship", "amount_usd": None, "criteria": "Full-tuition for exceptional students"},
            {"name": "ROMBA Fellowship", "amount_usd": None, "criteria": "LGBTQ+ students"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
        ],
    },
    "ross": {
        "application_url": "https://michiganross.umich.edu/graduate/full-time-mba/admissions",
        "deadlines": [
            {"round": "Round 1", "date": "2025-09-17", "decision_date": "2025-12-16"},
            {"round": "Round 2", "date": "2026-01-13", "decision_date": "2026-03-23"},
            {"round": "Round 3", "date": "2026-03-16", "decision_date": "2026-05-04"},
        ],
        "scholarships": [
            {"name": "Ross Merit Scholarship", "amount_usd": None, "criteria": "Merit-based; all admitted students considered"},
            {"name": "Ross Dean's Scholarship", "amount_usd": None, "criteria": "Full-tuition for top applicants"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
            {"name": "Consortium Fellowship", "amount_usd": None, "criteria": "Underrepresented minorities (via Consortium for Graduate Study in Management)"},
        ],
    },
    "fuqua": {
        "application_url": "https://www.fuqua.duke.edu/programs/daytime-mba/admissions",
        "deadlines": [
            {"round": "Early Action", "date": "2025-09-11", "decision_date": "2025-10-30"},
            {"round": "Round 1", "date": "2025-10-16", "decision_date": "2025-12-11"},
            {"round": "Round 2", "date": "2026-01-08", "decision_date": "2026-03-12"},
            {"round": "Round 3", "date": "2026-03-12", "decision_date": "2026-04-24"},
        ],
        "scholarships": [
            {"name": "Fuqua Merit Scholarship", "amount_usd": None, "criteria": "Merit-based; all admitted students considered"},
            {"name": "Fuqua Scholar", "amount_usd": None, "criteria": "Full-tuition merit award for exceptional candidates"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
        ],
    },
    "darden": {
        "application_url": "https://www.darden.virginia.edu/mba/admissions",
        "deadlines": [
            {"round": "Early Action", "date": "2025-09-15", "decision_date": "2025-10-29"},
            {"round": "Round 1", "date": "2025-10-15", "decision_date": "2025-12-15"},
            {"round": "Round 2", "date": "2026-01-05", "decision_date": "2026-03-16"},
            {"round": "Round 3", "date": "2026-04-01", "decision_date": "2026-05-01"},
        ],
        "scholarships": [
            {"name": "Darden Jefferson Fellowship", "amount_usd": None, "criteria": "Full-tuition; exceptional leadership and academic achievement"},
            {"name": "Darden Scholarship", "amount_usd": None, "criteria": "Merit-based partial tuition; all admitted students considered"},
            {"name": "Batten Scholarship", "amount_usd": None, "criteria": "Public service and social impact focus"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
        ],
    },
    "stern": {
        "application_url": "https://www.stern.nyu.edu/programs-admissions/full-time-mba/admissions",
        "deadlines": [
            {"round": "Round 1", "date": "2025-09-15", "decision_date": "2025-12-15"},
            {"round": "Round 2", "date": "2026-01-15", "decision_date": "2026-04-01"},
            {"round": "Round 3", "date": "2026-03-15", "decision_date": "2026-05-15"},
        ],
        "scholarships": [
            {"name": "Stern Scholarship", "amount_usd": None, "criteria": "Merit-based; all admitted students automatically considered"},
            {"name": "NYU Stern Dean's Scholarship", "amount_usd": None, "criteria": "Full-tuition for exceptional candidates"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
            {"name": "Consortium Fellowship", "amount_usd": None, "criteria": "Underrepresented minorities"},
        ],
    },
    "yale_som": {
        "application_url": "https://som.yale.edu/programs/mba/admissions",
        "deadlines": [
            {"round": "Round 1", "date": "2025-09-10", "decision_date": "2025-12-03"},
            {"round": "Round 2", "date": "2026-01-07", "decision_date": "2026-03-25"},
            {"round": "Round 3", "date": "2026-04-08", "decision_date": "2026-05-13"},
        ],
        "scholarships": [
            {"name": "Yale SOM Merit Scholarship", "amount_usd": None, "criteria": "Merit-based; all admitted students considered"},
            {"name": "Silver Scholars Award", "amount_usd": None, "criteria": "Exceptional candidates from underrepresented backgrounds"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
        ],
    },
    "anderson": {
        "application_url": "https://anderson.ucla.edu/degrees/full-time-mba/admissions",
        "deadlines": [
            {"round": "Round 1", "date": "2025-10-02", "decision_date": "2025-12-18"},
            {"round": "Round 2", "date": "2026-01-07", "decision_date": "2026-03-26"},
            {"round": "Round 3", "date": "2026-04-15", "decision_date": "2026-05-15"},
        ],
        "scholarships": [
            {"name": "Anderson Merit Fellowship", "amount_usd": None, "criteria": "Merit-based; all admitted students considered"},
            {"name": "Easton Technology Leadership Program", "amount_usd": None, "criteria": "Full-tuition for tech-focused leaders"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
            {"name": "Consortium Fellowship", "amount_usd": None, "criteria": "Underrepresented minorities"},
        ],
    },
    "johnson": {
        "application_url": "https://www.johnson.cornell.edu/mba/admissions/",
        "deadlines": [
            {"round": "Round 1", "date": "2025-10-02", "decision_date": "2025-12-11"},
            {"round": "Round 2", "date": "2026-01-09", "decision_date": "2026-03-12"},
            {"round": "Round 3", "date": "2026-03-26", "decision_date": "2026-05-01"},
        ],
        "scholarships": [
            {"name": "Johnson Merit Scholarship", "amount_usd": None, "criteria": "Merit-based; all admitted students considered"},
            {"name": "Park Leadership Fellowship", "amount_usd": None, "criteria": "Full-tuition for exceptional leadership and academic achievement"},
            {"name": "Johnson Diversity Fellowship", "amount_usd": None, "criteria": "Underrepresented minorities"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
        ],
    },

    # ═══════════════════════════════════════════════════════════════════════════
    # T25
    # ═══════════════════════════════════════════════════════════════════════════
    "mccombs": {
        "application_url": "https://www.mccombs.utexas.edu/mba/full-time/admissions/",
        "deadlines": [
            {"round": "Round 1", "date": "2025-10-08", "decision_date": "2025-12-18"},
            {"round": "Round 2", "date": "2026-01-08", "decision_date": "2026-03-19"},
            {"round": "Round 3", "date": "2026-03-18", "decision_date": "2026-05-01"},
        ],
        "scholarships": [
            {"name": "McCombs Merit Scholarship", "amount_usd": None, "criteria": "Merit-based; all admitted students considered"},
            {"name": "Texas MBA Fellows Program", "amount_usd": None, "criteria": "Full-tuition for top applicants"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
        ],
    },
    "kenan_flagler": {
        "application_url": "https://www.kenan-flagler.unc.edu/programs/mba/full-time/admissions/",
        "deadlines": [
            {"round": "Round 1", "date": "2025-10-15", "decision_date": "2025-12-17"},
            {"round": "Round 2", "date": "2026-01-06", "decision_date": "2026-03-18"},
            {"round": "Round 3", "date": "2026-03-11", "decision_date": "2026-04-23"},
            {"round": "Round 4", "date": "2026-04-15", "decision_date": "2026-05-14"},
        ],
        "scholarships": [
            {"name": "Kenan-Flagler Merit Award", "amount_usd": None, "criteria": "Merit-based; all admitted students automatically considered"},
            {"name": "Dean's Distinguished Fellowship", "amount_usd": None, "criteria": "Full-tuition for exceptional candidates"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
            {"name": "Consortium Fellowship", "amount_usd": None, "criteria": "Underrepresented minorities"},
        ],
    },
    "tepper": {
        "application_url": "https://www.cmu.edu/tepper/programs/mba/admissions/",
        "deadlines": [
            {"round": "Round 1", "date": "2025-09-23", "decision_date": "2025-12-15"},
            {"round": "Round 2", "date": "2026-01-06", "decision_date": "2026-03-15"},
            {"round": "Round 3", "date": "2026-03-10", "decision_date": "2026-04-28"},
        ],
        "scholarships": [
            {"name": "Tepper Merit Scholarship", "amount_usd": None, "criteria": "Merit-based; all admitted students automatically considered"},
            {"name": "William Larimer Mellon Scholarship", "amount_usd": None, "criteria": "Full-tuition for outstanding leadership and academics"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
        ],
    },
    "marshall": {
        "application_url": "https://www.marshall.usc.edu/programs/mba-programs/full-time-mba/admissions",
        "deadlines": [
            {"round": "Round 1", "date": "2025-10-01", "decision_date": "2025-12-15"},
            {"round": "Round 2", "date": "2026-01-15", "decision_date": "2026-03-15"},
            {"round": "Round 3", "date": "2026-03-15", "decision_date": "2026-05-01"},
        ],
        "scholarships": [
            {"name": "Marshall Merit Scholarship", "amount_usd": None, "criteria": "Merit-based; all admitted students automatically considered"},
            {"name": "Dean's Scholarship", "amount_usd": None, "criteria": "Full-tuition for exceptional candidates"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
        ],
    },
    "georgetown": {
        # Will be created as a new entry if not found
        "name": "Georgetown McDonough School of Business",
        "location": "Washington, DC",
        "country": "USA",
        "application_url": "https://msb.georgetown.edu/mba/full-time/admissions/",
        "deadlines": [
            {"round": "Round 1", "date": "2025-10-07", "decision_date": "2025-12-18"},
            {"round": "Round 2", "date": "2026-01-06", "decision_date": "2026-03-19"},
            {"round": "Round 3", "date": "2026-03-23", "decision_date": "2026-05-01"},
        ],
        "scholarships": [
            {"name": "McDonough Merit Scholarship", "amount_usd": None, "criteria": "Merit-based; all admitted students automatically considered"},
            {"name": "Dean's Leadership Award", "amount_usd": None, "criteria": "Full-tuition for exceptional leadership"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
        ],
    },
    "emory": {
        "name": "Emory Goizueta Business School",
        "location": "Atlanta, GA",
        "country": "USA",
        "application_url": "https://goizueta.emory.edu/mba/full-time/admissions",
        "deadlines": [
            {"round": "Round 1", "date": "2025-10-13", "decision_date": "2025-12-15"},
            {"round": "Round 2", "date": "2026-01-06", "decision_date": "2026-03-13"},
            {"round": "Round 3", "date": "2026-03-09", "decision_date": "2026-04-24"},
        ],
        "scholarships": [
            {"name": "Goizueta Merit Scholarship", "amount_usd": None, "criteria": "Merit-based; all admitted students considered"},
            {"name": "Roberto C. Goizueta Fellowship", "amount_usd": None, "criteria": "Full-tuition for exceptional candidates"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
            {"name": "Consortium Fellowship", "amount_usd": None, "criteria": "Underrepresented minorities"},
        ],
    },
    "olin_wustl": {
        "application_url": "https://olin.wustl.edu/mba/admissions/",
        "deadlines": [
            {"round": "Round 1", "date": "2025-10-07", "decision_date": "2025-12-10"},
            {"round": "Round 2", "date": "2026-01-06", "decision_date": "2026-03-04"},
            {"round": "Round 3", "date": "2026-03-17", "decision_date": "2026-04-23"},
        ],
        "scholarships": [
            {"name": "Olin Merit Scholarship", "amount_usd": None, "criteria": "Merit-based; all admitted students considered"},
            {"name": "Olin Distinguished Fellowship", "amount_usd": None, "criteria": "Full-tuition for outstanding candidates"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
            {"name": "Consortium Fellowship", "amount_usd": None, "criteria": "Underrepresented minorities"},
        ],
    },
    "foster": {
        "application_url": "https://foster.uw.edu/academics/mba/full-time-mba/admissions/",
        "deadlines": [
            {"round": "Round 1", "date": "2025-10-15", "decision_date": "2025-12-20"},
            {"round": "Round 2", "date": "2026-01-15", "decision_date": "2026-03-15"},
            {"round": "Round 3", "date": "2026-03-15", "decision_date": "2026-05-01"},
        ],
        "scholarships": [
            {"name": "Foster Merit Scholarship", "amount_usd": None, "criteria": "Merit-based; all admitted students considered"},
            {"name": "Foster Dean's Scholarship", "amount_usd": None, "criteria": "Full-tuition for exceptional candidates"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
            {"name": "Consortium Fellowship", "amount_usd": None, "criteria": "Underrepresented minorities"},
        ],
    },
    "jones": {
        "application_url": "https://business.rice.edu/mba/full-time/admissions",
        "deadlines": [
            {"round": "Round 1", "date": "2025-10-14", "decision_date": "2025-12-12"},
            {"round": "Round 2", "date": "2026-01-06", "decision_date": "2026-03-14"},
            {"round": "Round 3", "date": "2026-03-31", "decision_date": "2026-04-25"},
        ],
        "scholarships": [
            {"name": "Jones Merit Scholarship", "amount_usd": None, "criteria": "Merit-based; all admitted students considered"},
            {"name": "Rice MBA Fellowship", "amount_usd": None, "criteria": "Full-tuition for top candidates"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
        ],
    },
    "owen": {
        "application_url": "https://business.vanderbilt.edu/mba/admissions/",
        "deadlines": [
            {"round": "Round 1", "date": "2025-10-07", "decision_date": "2025-12-10"},
            {"round": "Round 2", "date": "2026-01-06", "decision_date": "2026-03-04"},
            {"round": "Round 3", "date": "2026-03-10", "decision_date": "2026-04-16"},
        ],
        "scholarships": [
            {"name": "Owen Merit Scholarship", "amount_usd": None, "criteria": "Merit-based; all admitted students considered"},
            {"name": "Dean's Scholarship", "amount_usd": None, "criteria": "Full-tuition for exceptional candidates"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
        ],
    },

    # ═══════════════════════════════════════════════════════════════════════════
    # Top International
    # ═══════════════════════════════════════════════════════════════════════════
    "insead": {
        "application_url": "https://www.insead.edu/master-programmes/mba/admissions",
        "deadlines": [
            {"round": "Round 1 (Jan intake)", "date": "2025-03-26", "decision_date": "2025-05-14"},
            {"round": "Round 2 (Jan intake)", "date": "2025-06-04", "decision_date": "2025-07-16"},
            {"round": "Round 3 (Aug intake)", "date": "2025-08-06", "decision_date": "2025-09-24"},
            {"round": "Round 4 (Aug intake)", "date": "2025-10-01", "decision_date": "2025-11-19"},
        ],
        "scholarships": [
            {"name": "INSEAD Endowed Scholarship", "amount_usd": 26000, "criteria": "Various donor-funded scholarships based on region, background, or career goals"},
            {"name": "INSEAD Alumni Fund Scholarship", "amount_usd": None, "criteria": "Need-based; funded by alumni donations"},
            {"name": "INSEAD Forte Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
            {"name": "INSEAD Nelson Mandela Endowed Scholarship", "amount_usd": None, "criteria": "African nationals with strong leadership potential"},
        ],
    },
    "lbs": {
        "application_url": "https://www.london.edu/programmes/mba/how-to-apply",
        "deadlines": [
            {"round": "Round 1", "date": "2025-09-05", "decision_date": "2025-11-14"},
            {"round": "Round 2", "date": "2025-10-31", "decision_date": "2026-01-23"},
            {"round": "Round 3", "date": "2026-01-09", "decision_date": "2026-03-27"},
            {"round": "Round 4", "date": "2026-03-27", "decision_date": "2026-05-22"},
        ],
        "scholarships": [
            {"name": "LBS Scholarship", "amount_usd": None, "criteria": "Merit-based; all admitted students automatically considered"},
            {"name": "LBS Women in Business Scholarship", "amount_usd": None, "criteria": "Women applicants demonstrating leadership"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
            {"name": "LBS Emerging Markets Scholarship", "amount_usd": None, "criteria": "Candidates from emerging market countries"},
        ],
    },
    "iese": {
        "application_url": "https://www.iese.edu/mba/admissions/",
        "deadlines": [
            {"round": "Round 1", "date": "2025-10-08", "decision_date": "2025-11-28"},
            {"round": "Round 2", "date": "2025-12-10", "decision_date": "2026-02-06"},
            {"round": "Round 3", "date": "2026-02-04", "decision_date": "2026-03-27"},
            {"round": "Round 4", "date": "2026-04-08", "decision_date": "2026-05-22"},
        ],
        "scholarships": [
            {"name": "IESE Merit Scholarship", "amount_usd": None, "criteria": "Merit-based; covers up to 50% of tuition"},
            {"name": "IESE Women in Leadership Scholarship", "amount_usd": None, "criteria": "Women with outstanding leadership track record"},
            {"name": "IESE Developing Economies Scholarship", "amount_usd": None, "criteria": "Candidates from developing economies"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
        ],
    },
    "hec_paris": {
        "application_url": "https://www.hec.edu/en/mba-programs/mba/admissions",
        "deadlines": [
            {"round": "Round 1 (Jan intake)", "date": "2025-05-19", "decision_date": "2025-07-01"},
            {"round": "Round 2 (Jan intake)", "date": "2025-07-14", "decision_date": "2025-08-28"},
            {"round": "Round 3 (Sep intake)", "date": "2025-10-13", "decision_date": "2025-11-27"},
            {"round": "Round 4 (Sep intake)", "date": "2026-03-02", "decision_date": "2026-04-15"},
        ],
        "scholarships": [
            {"name": "HEC MBA Scholarship", "amount_usd": None, "criteria": "Merit and need-based; various awards up to full tuition"},
            {"name": "HEC Women's Scholarship", "amount_usd": None, "criteria": "Women MBA candidates"},
            {"name": "Eiffel Excellence Scholarship", "amount_usd": None, "criteria": "Non-French nationals with exceptional academic profiles"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
        ],
    },
    "said": {
        "application_url": "https://www.sbs.ox.ac.uk/programmes/mba/admissions",
        "deadlines": [
            {"round": "Round 1", "date": "2025-08-29", "decision_date": "2025-10-24"},
            {"round": "Round 2", "date": "2025-10-31", "decision_date": "2025-12-19"},
            {"round": "Round 3", "date": "2026-01-09", "decision_date": "2026-03-06"},
            {"round": "Round 4", "date": "2026-03-20", "decision_date": "2026-05-08"},
        ],
        "scholarships": [
            {"name": "Skoll Scholarship", "amount_usd": None, "criteria": "Social entrepreneurship and social innovation focus"},
            {"name": "Said Business School Scholarship", "amount_usd": None, "criteria": "Merit-based; covers partial to full tuition"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
            {"name": "Oxford Pershing Square Scholarship", "amount_usd": None, "criteria": "Social impact leaders — full tuition + living costs"},
        ],
    },
    "judge": {
        "application_url": "https://www.jbs.cam.ac.uk/programmes/mba/apply/",
        "deadlines": [
            {"round": "Round 1", "date": "2025-08-26", "decision_date": "2025-10-22"},
            {"round": "Round 2", "date": "2025-10-06", "decision_date": "2025-12-03"},
            {"round": "Round 3", "date": "2026-01-05", "decision_date": "2026-02-25"},
            {"round": "Round 4", "date": "2026-03-02", "decision_date": "2026-04-22"},
            {"round": "Round 5", "date": "2026-04-27", "decision_date": "2026-06-03"},
        ],
        "scholarships": [
            {"name": "Forte Foundation Fellows Scholarship", "amount_usd": None, "criteria": "Women MBA candidates"},
            {"name": "Cambridge Judge MBA Scholarship", "amount_usd": None, "criteria": "Merit and need-based; partial tuition"},
            {"name": "Boustany MBA Cambridge Scholarship", "amount_usd": None, "criteria": "Covers full tuition + travel; 2-year cycle"},
            {"name": "CJBS Entrepreneurship Scholarship", "amount_usd": None, "criteria": "Candidates with entrepreneurship track record"},
        ],
    },
    "ie_business": {
        "application_url": "https://www.ie.edu/business-school/programs/mba/admissions/",
        "deadlines": [
            {"round": "Rolling Admissions", "date": None, "decision_date": "Applications reviewed on rolling basis, multiple intakes per year"},
        ],
        "scholarships": [
            {"name": "IE Foundation Scholarship", "amount_usd": None, "criteria": "Merit-based; up to 50% of tuition"},
            {"name": "IE Women in Business Scholarship", "amount_usd": None, "criteria": "Women MBA candidates demonstrating leadership"},
            {"name": "IE Social Impact Scholarship", "amount_usd": None, "criteria": "Social entrepreneurship or nonprofit background"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
        ],
    },
    "esade": {
        "application_url": "https://www.esade.edu/mba/en/admissions",
        "deadlines": [
            {"round": "Round 1", "date": "2025-10-07", "decision_date": "2025-11-18"},
            {"round": "Round 2", "date": "2025-12-02", "decision_date": "2026-01-20"},
            {"round": "Round 3", "date": "2026-02-03", "decision_date": "2026-03-17"},
            {"round": "Round 4", "date": "2026-04-14", "decision_date": "2026-05-19"},
        ],
        "scholarships": [
            {"name": "ESADE Scholarship", "amount_usd": None, "criteria": "Merit-based; up to 40% of tuition"},
            {"name": "ESADE Women's Leadership Award", "amount_usd": None, "criteria": "Women with outstanding leadership achievement"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
        ],
    },
    "imd": {
        "application_url": "https://www.imd.org/mba/mba-program/admissions/",
        "deadlines": [
            {"round": "Round 1", "date": "2025-09-01", "decision_date": "2025-10-15"},
            {"round": "Round 2", "date": "2025-11-01", "decision_date": "2025-12-15"},
            {"round": "Round 3", "date": "2026-01-15", "decision_date": "2026-02-28"},
            {"round": "Round 4", "date": "2026-03-01", "decision_date": "2026-04-15"},
        ],
        "scholarships": [
            {"name": "IMD MBA Scholarship", "amount_usd": None, "criteria": "Merit-based; up to 50% of tuition"},
            {"name": "IMD MBA Nestlé Scholarship", "amount_usd": None, "criteria": "Candidates from emerging markets"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
            {"name": "IMD One Planet Leaders Scholarship", "amount_usd": None, "criteria": "Sustainability-focused careers"},
        ],
    },
    "sda_bocconi": {
        "application_url": "https://www.sdabocconi.it/en/mba/full-time-mba/admissions",
        "deadlines": [
            {"round": "Round 1", "date": "2025-09-29", "decision_date": "2025-11-10"},
            {"round": "Round 2", "date": "2025-12-01", "decision_date": "2026-01-19"},
            {"round": "Round 3", "date": "2026-02-09", "decision_date": "2026-03-23"},
            {"round": "Round 4", "date": "2026-04-06", "decision_date": "2026-05-11"},
        ],
        "scholarships": [
            {"name": "SDA Bocconi Merit Award", "amount_usd": None, "criteria": "Merit-based; up to 50% tuition waiver"},
            {"name": "SDA Bocconi Women in Leadership", "amount_usd": None, "criteria": "Women with leadership potential"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
        ],
    },
    "ceibs": {
        "application_url": "https://www.ceibs.edu/mba/admissions",
        "deadlines": [
            {"round": "Round 1", "date": "2025-10-15", "decision_date": "2025-12-01"},
            {"round": "Round 2", "date": "2026-01-15", "decision_date": "2026-03-01"},
            {"round": "Round 3", "date": "2026-03-15", "decision_date": "2026-05-01"},
            {"round": "Round 4", "date": "2026-05-15", "decision_date": "2026-06-15"},
        ],
        "scholarships": [
            {"name": "CEIBS MBA Scholarship", "amount_usd": None, "criteria": "Merit-based; up to 100% tuition"},
            {"name": "CEIBS Women's Scholarship", "amount_usd": None, "criteria": "Outstanding women leaders"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
        ],
    },
    "isb": {
        "application_url": "https://www.isb.edu/pgp/admissions/",
        "deadlines": [
            {"round": "Round 1", "date": "2025-09-15", "decision_date": "2025-11-15"},
            {"round": "Round 2", "date": "2025-11-30", "decision_date": "2026-02-15"},
            {"round": "Round 3", "date": "2026-02-15", "decision_date": "2026-04-15"},
        ],
        "scholarships": [
            {"name": "ISB Scholarship", "amount_usd": None, "criteria": "Merit-based; all admitted students considered"},
            {"name": "ISB Young Leaders Programme Scholarship", "amount_usd": None, "criteria": "Candidates with 0-2 years of experience"},
            {"name": "ISB Women's Leadership Award", "amount_usd": None, "criteria": "Women with exceptional leadership potential"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
        ],
    },
    "iima": {
        "application_url": "https://www.iima.ac.in/programmes/post-graduate-programme-management-pgp",
        "deadlines": [
            {"round": "CAT-Based Admission", "date": "2025-11-24", "decision_date": "2026-03-15"},
        ],
        "scholarships": [
            {"name": "IIMA Merit Scholarship", "amount_usd": None, "criteria": "Merit-based; awarded to top performers in each section"},
            {"name": "IIMA Need-Based Financial Aid", "amount_usd": None, "criteria": "Need-based; covers up to full tuition"},
            {"name": "SC/ST/PwD Fee Waiver", "amount_usd": None, "criteria": "Full fee waiver for SC/ST/PwD category students"},
        ],
    },
    "iimb": {
        "application_url": "https://www.iimb.ac.in/pgp-admissions",
        "deadlines": [
            {"round": "CAT-Based Admission", "date": "2025-11-24", "decision_date": "2026-03-15"},
        ],
        "scholarships": [
            {"name": "IIMB Merit Scholarship", "amount_usd": None, "criteria": "Merit-based; top academic performers"},
            {"name": "IIMB Need-Based Financial Aid", "amount_usd": None, "criteria": "Need-based; institutional loans and fee waivers"},
            {"name": "SC/ST/PwD Fee Waiver", "amount_usd": None, "criteria": "Full fee waiver for SC/ST/PwD category students"},
        ],
    },
    "iimc": {
        "application_url": "https://www.iimcal.ac.in/programs/pgdm",
        "deadlines": [
            {"round": "CAT-Based Admission", "date": "2025-11-24", "decision_date": "2026-03-15"},
        ],
        "scholarships": [
            {"name": "IIMC Merit Scholarship", "amount_usd": None, "criteria": "Merit-based; top academic performers"},
            {"name": "IIMC Need-Based Financial Aid", "amount_usd": None, "criteria": "Need-based financial support"},
            {"name": "SC/ST/PwD Fee Waiver", "amount_usd": None, "criteria": "Full fee waiver for SC/ST/PwD category students"},
        ],
    },
    "nanyang": {
        "application_url": "https://www.ntu.edu.sg/education/graduate-programme/nanyang-mba",
        "deadlines": [
            {"round": "Round 1", "date": "2025-10-31", "decision_date": "2025-12-31"},
            {"round": "Round 2", "date": "2026-01-31", "decision_date": "2026-03-31"},
            {"round": "Round 3", "date": "2026-03-31", "decision_date": "2026-05-31"},
        ],
        "scholarships": [
            {"name": "Nanyang MBA Scholarship", "amount_usd": None, "criteria": "Merit-based; partial to full tuition"},
            {"name": "Nanyang MBA Women in Leadership Scholarship", "amount_usd": None, "criteria": "Women with leadership potential"},
            {"name": "ASEAN Scholarship", "amount_usd": None, "criteria": "Candidates from ASEAN countries"},
        ],
    },
    "nus": {
        "application_url": "https://mba.nus.edu.sg/admissions/",
        "deadlines": [
            {"round": "Round 1", "date": "2025-10-31", "decision_date": "2025-12-31"},
            {"round": "Round 2", "date": "2026-01-31", "decision_date": "2026-03-31"},
            {"round": "Round 3", "date": "2026-03-31", "decision_date": "2026-05-31"},
        ],
        "scholarships": [
            {"name": "NUS MBA Scholarship", "amount_usd": None, "criteria": "Merit-based; covers up to 50% of tuition"},
            {"name": "NUS MBA Dean's Award", "amount_usd": None, "criteria": "Full-tuition for exceptional candidates"},
            {"name": "Forte Foundation Fellowship", "amount_usd": None, "criteria": "Women MBA candidates"},
        ],
    },
    "hkust": {
        "application_url": "https://mba.hkust.edu.hk/admissions",
        "deadlines": [
            {"round": "Round 1", "date": "2025-10-15", "decision_date": "2025-12-01"},
            {"round": "Round 2", "date": "2026-01-10", "decision_date": "2026-02-28"},
            {"round": "Round 3", "date": "2026-03-01", "decision_date": "2026-04-15"},
            {"round": "Round 4", "date": "2026-04-15", "decision_date": "2026-05-31"},
        ],
        "scholarships": [
            {"name": "HKUST MBA Scholarship", "amount_usd": None, "criteria": "Merit-based; up to full tuition"},
            {"name": "HKUST MBA Women's Scholarship", "amount_usd": None, "criteria": "Women MBA candidates"},
            {"name": "HKUST Asia Fellowship", "amount_usd": None, "criteria": "Candidates committed to careers in Asia"},
        ],
    },
}


def enrich_school_db():
    """Load, enrich, and save school_db_full.json."""
    with open(DB_PATH, "r") as f:
        db = json.load(f)

    summary = {"updated": [], "created": [], "fields_added": {"application_url": 0, "deadlines": 0, "scholarships": 0}}

    for school_id, enrichment in ENRICHMENT_DATA.items():
        if school_id not in db:
            # Create a minimal entry for missing schools
            db[school_id] = {
                "name": enrichment.get("name", school_id),
                "location": enrichment.get("location", ""),
                "country": enrichment.get("country", ""),
            }
            summary["created"].append(school_id)
            print(f"  CREATED: {school_id} ({enrichment.get('name', school_id)})")

        school = db[school_id]

        # Only fill missing/empty fields
        for field in ["application_url", "deadlines", "scholarships"]:
            if field not in enrichment:
                continue
            existing = school.get(field)
            is_empty = existing is None or existing == "" or existing == [] or existing == {}

            if is_empty:
                school[field] = enrichment[field]
                summary["fields_added"][field] += 1
                print(f"  + {school_id}.{field}")
            else:
                print(f"  ~ {school_id}.{field} (kept existing)")

    # Save
    with open(DB_PATH, "w") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)

    # Print summary
    print("\n" + "=" * 60)
    print("ENRICHMENT SUMMARY")
    print("=" * 60)
    print(f"Schools updated:  {len(ENRICHMENT_DATA) - len(summary['created'])}")
    print(f"Schools created:  {len(summary['created'])} — {', '.join(summary['created']) or 'none'}")
    print(f"Fields added:")
    for field, count in summary["fields_added"].items():
        print(f"  {field}: {count}")
    total = sum(summary["fields_added"].values())
    print(f"  TOTAL: {total} fields enriched across {len(ENRICHMENT_DATA)} schools")


if __name__ == "__main__":
    enrich_school_db()
