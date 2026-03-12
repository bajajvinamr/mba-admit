"""Tests for the in-memory database layer."""

import db


def test_create_and_get_user():
    user = db.create_user("alice@example.com", "Alice", "hash123")
    assert user["email"] == "alice@example.com"
    assert "id" in user

    found = db.get_user_by_email("alice@example.com")
    assert found is not None
    assert found["id"] == user["id"]


def test_get_user_not_found():
    assert db.get_user_by_email("ghost@example.com") is None


def test_get_or_create_user():
    user1 = db.get_or_create_user("bob@example.com", "Bob")
    user2 = db.get_or_create_user("bob@example.com")
    assert user1["id"] == user2["id"]  # same user returned


def test_create_and_get_session():
    session = db.create_session("s1", "u1", "hbs", {"name": "Test"})
    assert session["id"] == "s1"
    assert session["school_id"] == "hbs"

    found = db.get_session("s1")
    assert found is not None
    assert found["profile"]["name"] == "Test"


def test_update_session():
    db.create_session("s2", "u1", "gsb", {"name": "Test2"})
    updated = db.update_session("s2", {"is_paid": True})
    assert updated["is_paid"] is True

    found = db.get_session("s2")
    assert found["is_paid"] is True


def test_session_not_found():
    assert db.get_session("nonexistent") is None
    assert db.update_session("nonexistent", {}) is None


def test_essay_versioning():
    v1 = db.save_essay_version("s1", "hbs", 0, "First draft", source="user")
    assert v1["version"] == 1

    v2 = db.save_essay_version("s1", "hbs", 0, "Second draft", source="ai_generated")
    assert v2["version"] == 2

    versions = db.get_essay_versions("s1", "hbs", 0)
    assert len(versions) == 2


def test_payments():
    p = db.create_payment("u1", "s1", "cs_test", 100000, "consult_call")
    assert p["status"] == "pending"

    updated = db.update_payment_status("cs_test", "succeeded")
    assert updated["status"] == "succeeded"


def test_user_school_list():
    entry = db.add_user_school("u1", "hbs", round="R1", notes="Dream school")
    assert entry["school_id"] == "hbs"
    assert entry["status"] == "researching"

    schools = db.get_user_schools("u1")
    assert len(schools) == 1

    db.update_user_school(entry["id"], {"status": "submitted"})
    schools = db.get_user_schools("u1")
    assert schools[0]["status"] == "submitted"

    db.delete_user_school(entry["id"])
    assert len(db.get_user_schools("u1")) == 0
