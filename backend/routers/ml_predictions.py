"""ML-powered admissions prediction endpoints.

Uses logistic regression models trained on 67K+ real GMAT Club decisions
to predict admission probability per school.
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ml", tags=["ml-predictions"])


class PredictionRequest(BaseModel):
    school_ids: list[str] = Field(min_length=1, max_length=20)
    gmat: int = Field(ge=200, le=800)
    gpa: float = Field(default=3.5, ge=0, le=4.0)
    yoe: int = Field(default=4, ge=0, le=30)
    app_round: str = Field(default="R2")


@router.post("/predict")
def predict_admission(req: PredictionRequest):
    """Predict admission probability at multiple schools using ML models.

    Models are trained on 67,000+ real admissions decisions from GMAT Club.
    Returns probability, confidence level, and feature importance per school.
    """
    from ml.admit_predictor import predict_batch, get_model_stats

    results = predict_batch(
        school_ids=req.school_ids,
        gmat=req.gmat,
        gpa=req.gpa,
        yoe=req.yoe,
        app_round=req.app_round,
    )

    # Sort by probability (highest first), putting errors at end
    results.sort(key=lambda x: x.get("probability_pct") or -1, reverse=True)

    return {
        "predictions": results,
        "profile": {
            "gmat": req.gmat,
            "gpa": req.gpa,
            "yoe": req.yoe,
            "round": req.app_round,
        },
        "data_source": "GMAT Club Decision Tracker (67,000+ decisions)",
    }


@router.get("/models")
def model_stats():
    """Get statistics on all trained ML models."""
    from ml.admit_predictor import get_model_stats
    return get_model_stats()


@router.get("/predict/{school_id}")
def predict_single(
    school_id: str,
    gmat: int = Query(..., ge=200, le=800),
    gpa: float = Query(3.5, ge=0, le=4.0),
    yoe: int = Query(4, ge=0, le=30),
    app_round: str = Query("R2"),
):
    """Quick single-school prediction via GET."""
    from ml.admit_predictor import predict_admission as _predict

    result = _predict(school_id, gmat, gpa, yoe, app_round)
    if result.get("probability_pct") is None:
        raise HTTPException(404, result.get("error", "No model available"))
    return result
