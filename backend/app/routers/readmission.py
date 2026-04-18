"""
Case 2: Hospital Readmission Risk Prediction API endpoints.
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
from app.services.readmission_predictor import (
    encode_patient, predict_readmission,
    explain_shap_readmission, explain_lime_readmission,
)
from app.services.llm_summarizer import summarize_readmission

router = APIRouter()


class PatientReadmission(BaseModel):
    age_bracket: str = '[50-60]'
    gender: str = 'Male'
    race: str = 'Unknown'
    admission_type_id: int = 1
    discharge_disposition_id: int = 1
    admission_source_id: int = 7
    medical_specialty: str = 'Unknown'
    time_in_hospital: int = 3
    num_lab_procedures: int = 40
    num_procedures: int = 1
    num_medications: int = 15
    number_diagnoses: int = 7
    number_outpatient: int = 0
    number_emergency: int = 0
    number_inpatient: int = 0
    max_glu_serum: str = 'None'
    A1Cresult: str = 'None'
    change: str = 'No'
    diabetesMed: str = 'No'
    diag_1_cat: str = 'Other'
    diag_2_cat: str = 'Other'
    diag_3_cat: str = 'Other'
    # Medications
    metformin: str = 'No'
    repaglinide: str = 'No'
    nateglinide: str = 'No'
    chlorpropamide: str = 'No'
    glimepiride: str = 'No'
    glipizide: str = 'No'
    glyburide: str = 'No'
    pioglitazone: str = 'No'
    rosiglitazone: str = 'No'
    acarbose: str = 'No'
    miglitol: str = 'No'
    insulin: str = 'No'
    glyburide_metformin: str = 'No'
    glipizide_metformin: str = 'No'
    glimepiride_pioglitazone: str = 'No'
    metformin_rosiglitazone: str = 'No'
    metformin_pioglitazone: str = 'No'


def _to_raw(patient: PatientReadmission) -> dict:
    """Convert Pydantic model to raw dict with hyphenated medication keys."""
    raw = patient.model_dump()
    raw['glyburide-metformin'] = raw.pop('glyburide_metformin')
    raw['glipizide-metformin'] = raw.pop('glipizide_metformin')
    raw['glimepiride-pioglitazone'] = raw.pop('glimepiride_pioglitazone')
    raw['metformin-rosiglitazone'] = raw.pop('metformin_rosiglitazone')
    raw['metformin-pioglitazone'] = raw.pop('metformin_pioglitazone')
    return raw


@router.post("/predict")
def readmission_predict(
    patient: PatientReadmission,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    raw = _to_raw(patient)
    encoded = encode_patient(raw)
    result = predict_readmission(encoded)
    shap_exp = explain_shap_readmission(encoded)
    summary = summarize_readmission(result["probability"], result["risk_level"], shap_exp["features"])
    prediction_result = {**result, "shap_explanation": shap_exp, "summary": summary}

    prediction_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    entry = {
        "id": prediction_id,
        "createdAt": now.isoformat(),
        "feature": "readmission",
        "input": patient.model_dump(),
        "result": prediction_result,
    }

    db.add(Prediction(
        id=prediction_id,
        user_id=current_user.id,
        feature="readmission",
        entry_json=json.dumps(entry),
        created_at=now,
    ))
    db.commit()

    return {**prediction_result, "prediction_id": prediction_id}


@router.post("/explain-lime")
def readmission_lime(patient: PatientReadmission):
    raw = _to_raw(patient)
    encoded = encode_patient(raw)
    result = predict_readmission(encoded)
    lime_exp = explain_lime_readmission(encoded)
    return {**result, "lime_explanation": lime_exp}
