"""Tests for auth endpoints — signup, verify credentials."""

import db


def test_signup_success(client):
    resp = client.post("/api/auth/signup", json={
        "email": "new@example.com",
        "password": "securepass123",
        "name": "New User",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "new@example.com"
    assert data["name"] == "New User"
    assert "id" in data


def test_signup_duplicate_email(client, seeded_user):
    resp = client.post("/api/auth/signup", json={
        "email": "test@example.com",
        "password": "anotherpass1",
        "name": "Dupe",
    })
    assert resp.status_code == 409


def test_signup_short_password(client):
    resp = client.post("/api/auth/signup", json={
        "email": "short@example.com",
        "password": "123",
        "name": "Short",
    })
    assert resp.status_code == 422


def test_verify_credentials_success(client, seeded_user):
    resp = client.post("/api/auth/verify", json={
        "email": "test@example.com",
        "password": "anything",  # dev mode — "dev" hash accepts all
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "test@example.com"


def test_verify_credentials_wrong_email(client):
    resp = client.post("/api/auth/verify", json={
        "email": "nobody@example.com",
        "password": "password",
    })
    assert resp.status_code == 401


def test_verify_credentials_no_password_hash(client):
    # Create user without password_hash via in-memory
    db._MEMORY_USERS["nohash@example.com"] = {
        "id": "u1",
        "email": "nohash@example.com",
        "name": "No Hash",
    }
    resp = client.post("/api/auth/verify", json={
        "email": "nohash@example.com",
        "password": "anything",
    })
    assert resp.status_code == 401
