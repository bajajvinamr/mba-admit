"""Tests for the Interview Simulator endpoints — start, respond, difficulty, validation."""

from unittest.mock import patch


MOCK_INTERVIEW_RESPONSE = {
    "message": "Tell me about a leadership challenge you faced.",
    "feedback": None,
    "is_finished": False,
    "question_number": 1,
    "total_questions": 5,
    "question_category": "behavioral_leadership",
}

MOCK_FINAL_RESPONSE = {
    "message": "Thank you for the interview. Here is your feedback.",
    "feedback": {
        "conciseness": 7,
        "star_method": 8,
        "narrative_strength": 6,
        "communication_clarity": 7,
        "authenticity": 8,
        "self_awareness": 6,
        "school_fit": 7,
        "overall_score": 72,
        "overall_feedback": "Strong performance overall.",
        "per_question_notes": ["Good opening", "Needs more depth"],
    },
    "is_finished": True,
    "question_number": 5,
    "total_questions": 5,
    "question_category": "school_signature",
}


@patch("routers.interview.simulate_interview_pass", return_value=MOCK_INTERVIEW_RESPONSE)
def test_interview_start_returns_valid_shape(mock_sim, client):
    """Starting an interview returns proper JSON structure."""
    resp = client.post("/api/interview/start", json={"school_id": "hbs"})
    assert resp.status_code == 200
    data = resp.json()
    assert "message" in data
    assert "feedback" in data
    assert "is_finished" in data
    assert data["is_finished"] is False
    assert data["feedback"] is None
    assert len(data["message"]) > 0


@patch("routers.interview.simulate_interview_pass", return_value=MOCK_INTERVIEW_RESPONSE)
def test_interview_start_with_difficulty(mock_sim, client):
    """Starting with a difficulty level is accepted."""
    resp = client.post("/api/interview/start", json={
        "school_id": "hbs",
        "difficulty": "pressure",
        "question_count": 7,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "message" in data
    # Verify the mock was called with the right args
    mock_sim.assert_called_once()
    call_kwargs = mock_sim.call_args
    # Check school_id was passed
    assert call_kwargs[0][0] == "hbs" or call_kwargs[1].get("school_id") == "hbs"


@patch("routers.interview.simulate_interview_pass", return_value=MOCK_INTERVIEW_RESPONSE)
def test_interview_start_default_difficulty(mock_sim, client):
    """Missing difficulty defaults gracefully (no 422)."""
    resp = client.post("/api/interview/start", json={"school_id": "gsb"})
    assert resp.status_code == 200


@patch("routers.interview.simulate_interview_pass", return_value=MOCK_INTERVIEW_RESPONSE)
def test_interview_respond_valid(mock_sim, client):
    """Sending a response with history returns next question."""
    resp = client.post("/api/interview/respond", json={
        "school_id": "hbs",
        "history": [
            {"role": "ai", "content": "Tell me about yourself."},
            {"role": "user", "content": "I led a team of 10 at McKinsey."},
        ],
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "message" in data
    assert data["is_finished"] is False


@patch("routers.interview.simulate_interview_pass", return_value=MOCK_FINAL_RESPONSE)
def test_interview_final_response_has_feedback(mock_sim, client):
    """On the final question, feedback is returned with all metrics."""
    history = []
    for i in range(5):
        history.append({"role": "ai", "content": f"Question {i+1}"})
        history.append({"role": "user", "content": f"Answer {i+1}"})

    resp = client.post("/api/interview/respond", json={
        "school_id": "wharton",
        "history": history,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_finished"] is True
    fb = data["feedback"]
    assert fb is not None
    assert "conciseness" in fb
    assert "star_method" in fb
    assert "narrative_strength" in fb
    assert "overall_score" in fb
    assert "overall_feedback" in fb
    assert isinstance(fb["overall_score"], int)
    assert 0 <= fb["overall_score"] <= 100


@patch("routers.interview.simulate_interview_pass", return_value=MOCK_INTERVIEW_RESPONSE)
def test_interview_start_missing_school_rejects(mock_sim, client):
    """Missing school_id returns 422."""
    resp = client.post("/api/interview/start", json={})
    assert resp.status_code == 422


@patch("routers.interview.simulate_interview_pass", return_value=MOCK_INTERVIEW_RESPONSE)
def test_interview_respond_empty_history_ok(mock_sim, client):
    """Empty history (fresh start via respond) still works."""
    resp = client.post("/api/interview/respond", json={
        "school_id": "kellogg",
        "history": [],
    })
    assert resp.status_code == 200


@patch("routers.interview.simulate_interview_pass", return_value=MOCK_INTERVIEW_RESPONSE)
def test_interview_new_question_fields(mock_sim, client):
    """Response includes question_number, total_questions, question_category."""
    resp = client.post("/api/interview/start", json={"school_id": "booth"})
    assert resp.status_code == 200
    data = resp.json()
    assert "question_number" in data
    assert "total_questions" in data
    assert "question_category" in data
    assert isinstance(data["question_number"], int)
    assert isinstance(data["total_questions"], int)


@patch("routers.interview.simulate_interview_pass", return_value=MOCK_FINAL_RESPONSE)
def test_interview_feedback_per_question_notes(mock_sim, client):
    """Final feedback includes per_question_notes array."""
    resp = client.post("/api/interview/respond", json={
        "school_id": "insead",
        "history": [
            {"role": "ai", "content": "Q"},
            {"role": "user", "content": "A"},
        ],
    })
    data = resp.json()
    fb = data["feedback"]
    assert "per_question_notes" in fb
    assert isinstance(fb["per_question_notes"], list)
    assert len(fb["per_question_notes"]) > 0


@patch("routers.interview.simulate_interview_pass", return_value=MOCK_INTERVIEW_RESPONSE)
def test_interview_various_schools(mock_sim, client):
    """Verify interview works for multiple school IDs without 500 errors."""
    school_ids = ["hbs", "gsb", "wharton", "kellogg", "booth", "insead", "cbs", "sloan", "tuck", "ross"]
    for sid in school_ids:
        resp = client.post("/api/interview/start", json={"school_id": sid})
        assert resp.status_code == 200, f"Failed for school: {sid}"
