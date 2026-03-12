"""Tests for extraction module."""
from scraper.extract import build_extraction_prompt, parse_extraction_response


def test_build_extraction_prompt():
    prompt = build_extraction_prompt("Harvard Business School", "This is page text...")
    assert "Harvard Business School" in prompt
    assert "essay_prompts" in prompt
    assert "JSON" in prompt


def test_parse_extraction_response_valid():
    raw = '```json\n{"essay_prompts": ["Why MBA?"], "tuition_usd": 74000}\n```'
    parsed = parse_extraction_response(raw)
    assert parsed["essay_prompts"] == ["Why MBA?"]
    assert parsed["tuition_usd"] == 74000


def test_parse_extraction_response_no_codeblock():
    raw = '{"essay_prompts": null, "tuition_usd": 50000}'
    parsed = parse_extraction_response(raw)
    assert parsed["tuition_usd"] == 50000


def test_parse_extraction_response_garbage():
    parsed = parse_extraction_response("I couldn't find any data")
    assert parsed == {}
