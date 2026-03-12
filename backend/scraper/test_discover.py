"""Tests for discovery and utility functions."""
from scraper.utils import normalize_school_name, deduplicate_schools, slugify


def test_normalize_school_name():
    assert normalize_school_name("The Wharton School") == "wharton school"
    assert normalize_school_name("Harvard Business School") == "harvard business school"
    assert normalize_school_name("  MIT Sloan  ") == "mit sloan"


def test_slugify():
    assert slugify("Harvard Business School") == "harvard_business_school"
    assert slugify("IIM Ahmedabad") == "iim_ahmedabad"
    assert slugify("INSEAD") == "insead"


def test_deduplicate_schools():
    schools = [
        {"name": "Harvard Business School", "location": "Boston, MA", "ft_rank": 4},
        {"name": "HBS - Harvard Business School", "location": "Boston, MA", "qs_rank": 3},
        {"name": "Stanford GSB", "location": "Stanford, CA", "ft_rank": 1},
    ]
    result = deduplicate_schools(schools)
    assert len(result) == 2
    harvard = [s for s in result if "Harvard" in s["name"]][0]
    assert "ft_rank" in harvard
    assert "qs_rank" in harvard
