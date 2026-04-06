"""Supabase client initialization.

Usage:
    from db.client import supabase
    result = supabase.table("profiles").select("*").eq("user_id", uid).execute()

Requires environment variables:
    SUPABASE_URL=https://your-project.supabase.co
    SUPABASE_SERVICE_KEY=eyJ...  (service role key for backend)

To set up:
    1. Create a Supabase project at supabase.com
    2. Run db/schema.sql in the SQL editor
    3. Add SUPABASE_URL and SUPABASE_SERVICE_KEY to backend/.env
    4. pip install supabase
"""

import os
import logging
from functools import lru_cache

logger = logging.getLogger(__name__)

_client = None


def get_supabase():
    """Get or create the Supabase client (lazy singleton)."""
    global _client
    if _client is not None:
        return _client

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY")

    if not url or not key:
        logger.warning(
            "Supabase not configured (missing SUPABASE_URL or SUPABASE_SERVICE_KEY). "
            "User persistence disabled — falling back to localStorage on frontend."
        )
        return None

    try:
        from supabase import create_client
        _client = create_client(url, key)
        logger.info("Supabase client initialized: %s", url)
        return _client
    except ImportError:
        logger.warning("supabase-py not installed. Run: pip install supabase")
        return None
    except Exception as e:
        logger.error("Failed to initialize Supabase: %s", e)
        return None


# Convenience alias
supabase = None


def init():
    """Initialize on first use."""
    global supabase
    supabase = get_supabase()
