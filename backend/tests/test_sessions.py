"""Tests for session endpoints — start, state, chat, unlock."""


def test_start_session(client, mock_run_agent_graph):
    resp = client.post("/api/start_session", json={
        "session_id": "s1",
        "school_id": "hbs",
        "name": "Alice",
        "gmat": 740,
        "gpa": 3.8,
        "industry_background": "Consulting",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["profile"]["name"] == "Alice"
    assert data["target_school_id"] == "hbs"
    mock_run_agent_graph.assert_called_once()


def test_get_state_found(client, mock_run_agent_graph, seeded_session):
    resp = client.get("/api/state/test-session-1")
    assert resp.status_code == 200
    data = resp.json()
    assert data["profile"]["gmat"] == 740


def test_get_state_not_found(client):
    resp = client.get("/api/state/nonexistent")
    assert resp.status_code == 404


def test_chat_appends_message(client, mock_run_agent_graph, seeded_session):
    resp = client.post("/api/chat", json={
        "session_id": "test-session-1",
        "message": "Tell me about HBS culture",
    })
    assert resp.status_code == 200
    data = resp.json()
    # The user message should be in interview_history
    user_msgs = [m for m in data["interview_history"] if m["role"] == "user"]
    assert len(user_msgs) == 1
    assert "HBS culture" in user_msgs[0]["content"]


def test_chat_session_not_found(client):
    resp = client.post("/api/chat", json={
        "session_id": "nonexistent",
        "message": "hello",
    })
    assert resp.status_code == 404


def test_unlock_sets_paid(client, mock_run_agent_graph, seeded_session):
    resp = client.post("/api/unlock", json={
        "session_id": "test-session-1",
        "stripe_payment_intent_id": "pi_test_123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_paid"] is True


def test_unlock_session_not_found(client):
    resp = client.post("/api/unlock", json={
        "session_id": "nonexistent",
    })
    assert resp.status_code == 404


def test_start_session_validation_gmat(client):
    resp = client.post("/api/start_session", json={
        "session_id": "bad",
        "school_id": "hbs",
        "name": "Bob",
        "gmat": 100,
        "gpa": 3.5,
        "industry_background": "Tech",
    })
    assert resp.status_code == 422


def test_chat_message_too_long(client, seeded_session):
    resp = client.post("/api/chat", json={
        "session_id": "test-session-1",
        "message": "x" * 5001,
    })
    assert resp.status_code == 422
