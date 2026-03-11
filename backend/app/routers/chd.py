"""
Case 1: CHD Risk Prediction API endpoints.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.chd_predictor import predict_chd, explain_shap, explain_lime

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
def chd_predict(patient: PatientCHD):
    data = patient.model_dump()
    result = predict_chd(data)
    shap_exp = explain_shap(data)
    return {**result, "shap_explanation": shap_exp}


@router.post("/explain-lime")
def chd_lime(patient: PatientCHD):
    data = patient.model_dump()
    result = predict_chd(data)
    lime_exp = explain_lime(data)
    return {**result, "lime_explanation": lime_exp}
