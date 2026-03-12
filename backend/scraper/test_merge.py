"""Tests for merge logic."""
from scraper.merge import merge_school_data


def test_merge_overwrites_with_scraped():
    existing = {
        "hbs": {
            "name": "Harvard Business School",
            "gmat_avg": 730,
            "essay_prompts": ["generic prompt"],
        }
    }
    scraped = {
        "hbs": {
            "name": "Harvard Business School",
            "essay_prompts": ["Real HBS prompt here"],
            "tuition_usd": 74910,
            "data_quality": {"confidence": 0.9, "verified_fields": ["essay_prompts"]},
        }
    }
    merged = merge_school_data(existing, scraped)
    assert merged["hbs"]["essay_prompts"] == ["Real HBS prompt here"]
    assert merged["hbs"]["tuition_usd"] == 74910
    assert merged["hbs"]["gmat_avg"] == 730


def test_merge_adds_new_schools():
    existing = {"hbs": {"name": "HBS"}}
    scraped = {"new_school": {"name": "New School", "tuition_usd": 50000}}
    merged = merge_school_data(existing, scraped)
    assert "new_school" in merged
    assert "hbs" in merged


def test_merge_skips_null_scraped_fields():
    existing = {"hbs": {"name": "HBS", "gmat_avg": 730}}
    scraped = {"hbs": {"name": "HBS", "gmat_avg": None, "tuition_usd": 74000}}
    merged = merge_school_data(existing, scraped)
    assert merged["hbs"]["gmat_avg"] == 730
    assert merged["hbs"]["tuition_usd"] == 74000
