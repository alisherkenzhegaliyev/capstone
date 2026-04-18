"""
Case 1: CHD Risk Prediction API endpoints.
"""
import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import Prediction, User
from app.services.chd_predictor import predict_chd, explain_shap, explain_lime
from app.services.llm_summarizer import summarize_chd

router = APIRouter()


class PatientCHD(BaseModel):
    age: float
    sex: int
    total_cholesterol: float
    systolic_bp: float
    smoking: int
    diabetes: int
    bmi: float
    heart_rate: float
    glucose: float
    bp_meds: int
    prevalent_hypertension: int
    cigs_per_day: float = 0.0
    pulse_pressure: float = 0.0


@router.post("/predict")
def chd_predict(
    patient: PatientCHD,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = patient.model_dump()
    result = predict_chd(data)
    shap_exp = explain_shap(data)
    summary = summarize_chd(result["probability"], result["risk_level"], shap_exp["features"])
    prediction_result = {**result, "shap_explanation": shap_exp, "summary": summary}

    prediction_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    entry = {
        "id": prediction_id,
        "createdAt": now.isoformat(),
        "feature": "chd",
        "input": data,
        "result": prediction_result,
    }

    db.add(Prediction(
        id=prediction_id,
        user_id=current_user.id,
        feature="chd",
        entry_json=json.dumps(entry),
        created_at=now,
    ))
    db.commit()

    return {**prediction_result, "prediction_id": prediction_id}


@router.post("/explain-lime")
def chd_lime(patient: PatientCHD):
    data = patient.model_dump()
    result = predict_chd(data)
    lime_exp = explain_lime(data)
    return {**result, "lime_explanation": lime_exp}
