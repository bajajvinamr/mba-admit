"""Tests for crawl engine."""
from pathlib import Path
from scraper.crawl import build_page_urls, save_crawl_result, is_already_crawled


def test_build_page_urls():
    urls = build_page_urls("https://www.hbs.edu/mba")
    assert len(urls) > 0
    assert any("admissions" in u[0] for u in urls)


def test_save_and_check_crawl(tmp_path):
    save_crawl_result(
        school_id="test_school",
        page_name="admissions",
        html="<html><body>Hello</body></html>",
        text="Hello",
        url="https://example.com/admissions",
        output_dir=tmp_path,
    )
    assert is_already_crawled("test_school", "admissions", output_dir=tmp_path)
    assert not is_already_crawled("test_school", "essays", output_dir=tmp_path)
