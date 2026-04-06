"""ML-based admissions prediction using real GMAT Club decision data.

Trains a logistic regression model per school to predict admit probability
based on GMAT, GPA, years of experience, and application round.

Uses scikit-learn — lightweight, no GPU needed, fast inference.

Usage:
    from ml.admit_predictor import predict_admission, get_model_stats
    result = predict_admission("hbs", gmat=740, gpa=3.7, yoe=4, round="R1")
"""

import json
import logging
import pickle
from pathlib import Path
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
MODEL_DIR = Path(__file__).resolve().parent / "models"
MODEL_DIR.mkdir(exist_ok=True)

MODELS_FILE = MODEL_DIR / "admit_models.pkl"
MIN_SAMPLES = 50  # Minimum decisions to train a school-specific model


def _load_decisions() -> list[dict]:
    """Load decision data."""
    decisions_file = DATA_DIR / "gmatclub_decisions.json"
    if not decisions_file.exists():
        return []
    with open(decisions_file) as f:
        return json.load(f)


def _is_positive_outcome(status: str) -> Optional[bool]:
    """Map status to binary outcome. None = exclude from training."""
    s = status.lower()
    if any(x in s for x in ["admitted", "matriculating"]):
        return True
    if any(x in s for x in ["denied", "rejected"]):
        return False
    # Exclude ambiguous statuses: waitlisted, interviewed, invited, withdrawn
    return None


def _encode_round(round_str: str) -> float:
    """Encode application round as numeric feature."""
    r = (round_str or "").strip().upper()
    if "R1" in r or "EARLY" in r:
        return 1.0
    if "R2" in r:
        return 2.0
    if "R3" in r:
        return 3.0
    return 2.0  # default to R2


def train_models() -> dict:
    """Train per-school logistic regression models.

    Returns dict of school_id -> {model, scaler, stats}.
    """
    try:
        from sklearn.linear_model import LogisticRegression
        from sklearn.preprocessing import StandardScaler
    except ImportError:
        logger.error("scikit-learn not installed. Run: pip install scikit-learn")
        return {}

    decisions = _load_decisions()
    if not decisions:
        logger.warning("No decision data available for training")
        return {}

    # Group by school
    school_data: dict[str, list[tuple[list[float], int]]] = {}

    for d in decisions:
        sid = d.get("school_id", "")
        if not sid:
            continue

        outcome = _is_positive_outcome(d.get("status", ""))
        if outcome is None:
            continue

        gmat = d.get("gmat") or d.get("gmat_focus")
        gpa = d.get("gpa")
        yoe = d.get("yoe")
        round_val = _encode_round(d.get("round", ""))

        # Need at least GMAT
        if gmat is None:
            continue

        features = [
            float(gmat),
            float(gpa) if gpa else 3.5,  # impute missing GPA
            float(yoe) if yoe else 4.0,  # impute missing YOE
            round_val,
        ]

        school_data.setdefault(sid, []).append((features, int(outcome)))

    models = {}
    for sid, data in school_data.items():
        if len(data) < MIN_SAMPLES:
            continue

        X = np.array([d[0] for d in data])
        y = np.array([d[1] for d in data])

        # Need both positive and negative outcomes
        if len(set(y)) < 2:
            continue

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        model = LogisticRegression(
            max_iter=500,
            class_weight="balanced",
            random_state=42,
        )
        model.fit(X_scaled, y)

        # Stats
        train_accuracy = model.score(X_scaled, y)
        admit_rate = float(y.mean())
        avg_gmat_admitted = float(X[y == 1, 0].mean()) if y.sum() > 0 else None

        models[sid] = {
            "model": model,
            "scaler": scaler,
            "stats": {
                "samples": len(data),
                "admit_rate": round(admit_rate * 100, 1),
                "train_accuracy": round(train_accuracy * 100, 1),
                "avg_gmat_admitted": round(avg_gmat_admitted) if avg_gmat_admitted else None,
            },
        }

    logger.info(f"Trained {len(models)} school models from {len(decisions)} decisions")

    # Save
    with open(MODELS_FILE, "wb") as f:
        pickle.dump(models, f)

    return models


def _load_models() -> dict:
    """Load trained models from disk, or train if not available."""
    if MODELS_FILE.exists():
        try:
            with open(MODELS_FILE, "rb") as f:
                return pickle.load(f)
        except Exception as e:
            logger.warning(f"Failed to load models: {e}")

    return train_models()


# Lazy-loaded global
_MODELS: dict = {}


def _get_models() -> dict:
    global _MODELS
    if not _MODELS:
        _MODELS = _load_models()
    return _MODELS


def predict_admission(
    school_id: str,
    gmat: int,
    gpa: float = 3.5,
    yoe: int = 4,
    app_round: str = "R2",
) -> dict:
    """Predict admission probability for a specific school.

    Returns:
        {
            "school_id": str,
            "probability_pct": float,
            "confidence": str,
            "model_stats": dict,
            "factors": dict,
        }
    """
    models = _get_models()

    if school_id not in models:
        return {
            "school_id": school_id,
            "probability_pct": None,
            "confidence": "no_model",
            "error": f"No model available for {school_id}. Need {MIN_SAMPLES}+ decisions.",
        }

    entry = models[school_id]
    model = entry["model"]
    scaler = entry["scaler"]
    stats = entry["stats"]

    features = np.array([[float(gmat), float(gpa), float(yoe), _encode_round(app_round)]])
    features_scaled = scaler.transform(features)

    probability = model.predict_proba(features_scaled)[0][1]
    probability_pct = round(float(probability) * 100, 1)

    # Confidence based on sample size
    samples = stats["samples"]
    if samples >= 500:
        confidence = "high"
    elif samples >= 200:
        confidence = "medium"
    else:
        confidence = "low"

    # Feature importance
    coefs = model.coef_[0]
    feature_names = ["gmat", "gpa", "yoe", "round"]
    importance = {
        name: round(float(abs(c)), 3)
        for name, c in zip(feature_names, coefs)
    }

    return {
        "school_id": school_id,
        "probability_pct": probability_pct,
        "confidence": confidence,
        "model_stats": stats,
        "factors": importance,
    }


def predict_batch(
    school_ids: list[str],
    gmat: int,
    gpa: float = 3.5,
    yoe: int = 4,
    app_round: str = "R2",
) -> list[dict]:
    """Predict admission probability for multiple schools."""
    return [
        predict_admission(sid, gmat, gpa, yoe, app_round)
        for sid in school_ids
    ]


def get_model_stats() -> dict:
    """Get overview of all trained models."""
    models = _get_models()
    return {
        "total_models": len(models),
        "schools": {
            sid: entry["stats"]
            for sid, entry in sorted(models.items(), key=lambda x: -x[1]["stats"]["samples"])
        },
    }
