"""
Case 2: 30-Day Hospital Readmission Risk Prediction Service.
Uses LightGBM model trained on UCI Diabetes 130-US Hospitals data.
"""
import pickle
import json
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
import lime.lime_tabular


# Custom preprocessor class — must be defined before loading pickles
class ReadmissionPreprocessor(BaseEstimator, TransformerMixin):
    def __init__(self):
        self.numeric_cols_ = None
        self.imputer_ = SimpleImputer(strategy='median')
        self.scaler_ = StandardScaler()
        self.feature_names_ = None

    def fit(self, X, y=None):
        X = pd.DataFrame(X) if not isinstance(X, pd.DataFrame) else X
        self.feature_names_ = list(X.columns)
        base_numeric = [
            'age_numeric', 'time_in_hospital', 'num_lab_procedures',
            'num_procedures', 'num_medications', 'number_diagnoses',
            'number_outpatient', 'number_emergency', 'number_inpatient',
            'A1Cresult', 'max_glu_serum',
            'num_prior_visits', 'inpatient_ratio',
            'total_meds_prescribed', 'total_med_changes',
            'procedures_per_day', 'labs_per_day', 'meds_per_day',
        ]
        self.numeric_cols_ = [c for c in base_numeric if c in X.columns]
        self.imputer_.fit(X[self.numeric_cols_])
        self.scaler_.fit(self.imputer_.transform(X[self.numeric_cols_]))
        return self

    def transform(self, X, y=None):
        X = pd.DataFrame(X).copy() if not isinstance(X, pd.DataFrame) else X.copy()
        X[self.numeric_cols_] = self.scaler_.transform(
            self.imputer_.transform(X[self.numeric_cols_])
        )
        return X.values

    def get_feature_names_out(self):
        return self.feature_names_


# --- Encoding constants ---
AGE_TO_NUMERIC = {
    '[0-10]': 5, '[10-20]': 15, '[20-30]': 25, '[30-40]': 35,
    '[40-50]': 45, '[50-60]': 55, '[60-70]': 65, '[70-80]': 75,
    '[80-90]': 85, '[90-100]': 95,
}
MED_TO_BINARY = {'No': 0, 'Steady': 1, 'Up': 1, 'Down': 1}
MED_TO_CHANGED = {'No': 0, 'Steady': 0, 'Up': 1, 'Down': 1}
A1C_MAP = {'None': 0, 'Norm': 1, '>7': 2, '>8': 3}
GLU_MAP = {'None': 0, 'Norm': 1, '>200': 2, '>300': 3}

DIAG_CATEGORIES = [
    'Circulatory', 'Diabetes', 'Digestive', 'External', 'Genitourinary',
    'Injury', 'Musculoskeletal', 'Neoplasms', 'Other', 'Respiratory',
]
RACES = ['AfricanAmerican', 'Asian', 'Caucasian', 'Hispanic', 'Other', 'Unknown']
MEDICATIONS = [
    'metformin', 'repaglinide', 'nateglinide', 'chlorpropamide', 'glimepiride',
    'glipizide', 'glyburide', 'pioglitazone', 'rosiglitazone', 'acarbose',
    'miglitol', 'insulin', 'glyburide-metformin', 'glipizide-metformin',
    'glimepiride-pioglitazone', 'metformin-rosiglitazone', 'metformin-pioglitazone',
]
DISCHARGE_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 16, 17, 18, 22, 23, 24, 25, 27, 28]
ADMISSION_SOURCE_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 17, 20, 22, 25]
SPECIALTIES = [
    'AllergyandImmunology', 'Anesthesiology', 'Anesthesiology-Pediatric',
    'Cardiology', 'Cardiology-Pediatric', 'DCPTEAM', 'Dentistry',
    'Emergency/Trauma', 'Endocrinology', 'Endocrinology-Metabolism',
    'Family/GeneralPractice', 'Gastroenterology', 'Gynecology', 'Hematology',
    'Hematology/Oncology', 'Hospitalist', 'InfectiousDiseases', 'InternalMedicine',
    'Nephrology', 'Neurology', 'Neurophysiology',
    'Obsterics&Gynecology-GynecologicOnco', 'Obstetrics', 'ObstetricsandGynecology',
    'Oncology', 'Ophthalmology', 'Orthopedics', 'Orthopedics-Reconstructive',
    'Osteopath', 'Otolaryngology', 'OutreachServices', 'Pathology', 'Pediatrics',
    'Pediatrics-AllergyandImmunology', 'Pediatrics-CriticalCare',
    'Pediatrics-EmergencyMedicine', 'Pediatrics-Endocrinology',
    'Pediatrics-Hematology-Oncology', 'Pediatrics-InfectiousDiseases',
    'Pediatrics-Neurology', 'Pediatrics-Pulmonology', 'Perinatology',
    'PhysicalMedicineandRehabilitation', 'PhysicianNotFound', 'Podiatry',
    'Proctology', 'Psychiatry', 'Psychiatry-Addictive', 'Psychiatry-Child/Adolescent',
    'Psychology', 'Pulmonology', 'Radiologist', 'Radiology', 'Resident',
    'Rheumatology', 'Speech', 'Surgeon', 'Surgery-Cardiovascular',
    'Surgery-Cardiovascular/Thoracic', 'Surgery-Colon&Rectal', 'Surgery-General',
    'Surgery-Maxillofacial', 'Surgery-Neuro', 'Surgery-Pediatric', 'Surgery-Plastic',
    'Surgery-Thoracic', 'Surgery-Vascular', 'SurgicalSpecialty', 'Unknown', 'Urology',
]

FEATURE_DISPLAY_NAMES = {
    'age_numeric': 'Age', 'gender': 'Gender (Male)',
    'race_Caucasian': 'Race: Caucasian', 'race_AfricanAmerican': 'Race: African American',
    'race_Hispanic': 'Race: Hispanic', 'race_Asian': 'Race: Asian',
    'race_Other': 'Race: Other', 'race_Unknown': 'Race: Unknown',
    'time_in_hospital': 'Days in Hospital', 'num_lab_procedures': 'Lab Procedures',
    'num_procedures': 'Procedures', 'num_medications': 'Medications Count',
    'number_diagnoses': 'Number of Diagnoses',
    'number_outpatient': 'Prior Outpatient Visits', 'number_emergency': 'Prior Emergency Visits',
    'number_inpatient': 'Prior Inpatient Visits', 'num_prior_visits': 'Total Prior Visits',
    'inpatient_ratio': 'Inpatient Visit Ratio',
    'A1Cresult': 'HbA1c Result', 'max_glu_serum': 'Max Glucose Serum',
    'change': 'Any Medication Changed', 'diabetesMed': 'On Diabetes Medication',
    'insulin_prescribed': 'Insulin Prescribed', 'insulin_changed': 'Insulin Dose Changed',
    'metformin_prescribed': 'Metformin Prescribed', 'metformin_changed': 'Metformin Dose Changed',
    'glipizide_prescribed': 'Glipizide Prescribed', 'glyburide_prescribed': 'Glyburide Prescribed',
    'pioglitazone_prescribed': 'Pioglitazone Prescribed',
    'rosiglitazone_prescribed': 'Rosiglitazone Prescribed',
    'total_meds_prescribed': 'Total Medications Prescribed',
    'total_med_changes': 'Total Medication Changes',
    'procedures_per_day': 'Procedures per Day', 'labs_per_day': 'Lab Tests per Day',
    'meds_per_day': 'Medications per Day',
    'diag_1_cat_Circulatory': 'Primary Dx: Circulatory',
    'diag_1_cat_Diabetes': 'Primary Dx: Diabetes',
    'diag_1_cat_Respiratory': 'Primary Dx: Respiratory',
    'diag_2_cat_Circulatory': 'Secondary Dx: Circulatory',
    'diag_2_cat_Diabetes': 'Secondary Dx: Diabetes',
    'diag_3_cat_Circulatory': 'Tertiary Dx: Circulatory',
    'discharge_disposition_id_1': 'Discharged to Home',
    'discharge_disposition_id_2': 'Discharged to SNF',
    'discharge_disposition_id_3': 'Discharged to Skilled Nursing',
    'discharge_disposition_id_6': 'Discharged: Home w/ Health Service',
    'discharge_disposition_id_7': 'Left Against Medical Advice',
    'discharge_disposition_id_18': 'Discharged: Home IV Therapy',
    'discharge_disposition_id_22': 'Discharged to Rehab',
    'discharge_disposition_id_25': 'Discharged to Psychiatric Facility',
    'admission_type_id_1': 'Admission: Emergency',
    'admission_type_id_2': 'Admission: Urgent',
    'admission_type_id_3': 'Admission: Elective',
    'admission_source_id_7': 'Admitted from Emergency Dept',
    'admission_source_id_1': 'Admitted via Physician Referral',
    'medical_specialty_InternalMedicine': 'Specialty: Internal Medicine',
    'medical_specialty_Emergency/Trauma': 'Specialty: Emergency/Trauma',
    'medical_specialty_Cardiology': 'Specialty: Cardiology',
    'medical_specialty_Surgery-General': 'Specialty: General Surgery',
    'medical_specialty_Pulmonology': 'Specialty: Pulmonology',
    'medical_specialty_Unknown': 'Specialty: Unknown',
    'medical_specialty_PhysicianNotFound': 'Specialty: Not Recorded',
}


# Inject into __main__ so pickle can find it (class was saved from a Jupyter notebook)
import __main__
__main__.ReadmissionPreprocessor = ReadmissionPreprocessor

# --- Load artifacts ---
MODEL_DIR = Path(__file__).resolve().parent.parent.parent / "models" / "readmission"

with open(MODEL_DIR / "best_model_case2.pkl", "rb") as f:
    model = pickle.load(f)
with open(MODEL_DIR / "preprocessor_case2.pkl", "rb") as f:
    preprocessor = pickle.load(f)
with open(MODEL_DIR / "shap_explainer_case2.pkl", "rb") as f:
    shap_explainer = pickle.load(f)
with open(MODEL_DIR / "lime_config_case2.pkl", "rb") as f:
    lime_config = pickle.load(f)
with open(MODEL_DIR / "model_metadata_case2.json") as f:
    metadata = json.load(f)

FEATURE_NAMES = metadata["feature_names"]           # 207 features
THRESHOLD = metadata["best_model_threshold"]         # 0.102

lime_explainer = lime.lime_tabular.LimeTabularExplainer(**lime_config)

print(f"✅ Readmission model loaded: {metadata['best_model']}, threshold={THRESHOLD:.3f}")


def encode_patient(raw: dict) -> dict:
    """Convert ~30 raw form fields to 207-feature dict."""
    out = {}

    # Numeric/ordinal
    out['age_numeric'] = AGE_TO_NUMERIC.get(raw.get('age_bracket', '[50-60]'), 55)
    out['gender'] = 1 if raw.get('gender') == 'Male' else 0
    out['time_in_hospital'] = raw.get('time_in_hospital', 3)
    out['num_lab_procedures'] = raw.get('num_lab_procedures', 40)
    out['num_procedures'] = raw.get('num_procedures', 1)
    out['num_medications'] = raw.get('num_medications', 15)
    out['number_diagnoses'] = raw.get('number_diagnoses', 7)
    out['number_outpatient'] = raw.get('number_outpatient', 0)
    out['number_emergency'] = raw.get('number_emergency', 0)
    out['number_inpatient'] = raw.get('number_inpatient', 0)
    out['A1Cresult'] = A1C_MAP.get(raw.get('A1Cresult', 'None'), 0)
    out['max_glu_serum'] = GLU_MAP.get(raw.get('max_glu_serum', 'None'), 0)
    out['change'] = 1 if raw.get('change') == 'Ch' else 0
    out['diabetesMed'] = 1 if raw.get('diabetesMed') == 'Yes' else 0

    # Aggregates
    num_prior = out['number_outpatient'] + out['number_emergency'] + out['number_inpatient']
    out['num_prior_visits'] = num_prior
    out['inpatient_ratio'] = out['number_inpatient'] / (num_prior + 1)
    out['total_meds_prescribed'] = sum(MED_TO_BINARY.get(raw.get(m, 'No'), 0) for m in MEDICATIONS)
    out['total_med_changes'] = sum(MED_TO_CHANGED.get(raw.get(m, 'No'), 0) for m in MEDICATIONS)
    out['procedures_per_day'] = out['num_procedures'] / (out['time_in_hospital'] + 1)
    out['labs_per_day'] = out['num_lab_procedures'] / (out['time_in_hospital'] + 1)
    out['meds_per_day'] = out['num_medications'] / (out['time_in_hospital'] + 1)

    # Medications
    for med in MEDICATIONS:
        val = raw.get(med, 'No')
        out[f'{med}_prescribed'] = MED_TO_BINARY.get(val, 0)
        out[f'{med}_changed'] = MED_TO_CHANGED.get(val, 0)

    # Race
    race = raw.get('race', 'Unknown')
    for r in RACES:
        out[f'race_{r}'] = 1 if race == r else 0

    # Diagnoses
    for diag_field in ['diag_1', 'diag_2', 'diag_3']:
        cat = raw.get(f'{diag_field}_cat', 'Other')
        for c in DIAG_CATEGORIES:
            out[f'{diag_field}_cat_{c}'] = 1 if cat == c else 0

    # Admission type
    adm_type = int(raw.get('admission_type_id', 1))
    for i in range(1, 9):
        out[f'admission_type_id_{i}'] = 1 if adm_type == i else 0

    # Discharge disposition
    disc = int(raw.get('discharge_disposition_id', 1))
    for i in DISCHARGE_IDS:
        out[f'discharge_disposition_id_{i}'] = 1 if disc == i else 0

    # Admission source
    src = int(raw.get('admission_source_id', 7))
    for i in ADMISSION_SOURCE_IDS:
        out[f'admission_source_id_{i}'] = 1 if src == i else 0

    # Medical specialty
    spec = raw.get('medical_specialty', 'Unknown')
    for s in SPECIALTIES:
        out[f'medical_specialty_{s}'] = 1 if spec == s else 0

    return out


def predict_readmission(patient: dict) -> dict:
    df = pd.DataFrame([patient]).reindex(columns=FEATURE_NAMES, fill_value=0)
    X_proc = preprocessor.transform(df)
    proba = float(model.predict_proba(X_proc)[0, 1])
    if proba >= 0.3:
        risk_level = "High"
    elif proba >= THRESHOLD:
        risk_level = "Medium"
    else:
        risk_level = "Low"
    return {
        "probability": round(proba, 4),
        "prediction": int(proba >= THRESHOLD),
        "risk_level": risk_level,
    }


def explain_shap_readmission(patient: dict, top_n: int = 10) -> dict:
    df = pd.DataFrame([patient]).reindex(columns=FEATURE_NAMES, fill_value=0)
    X_proc = preprocessor.transform(df)
    sv = shap_explainer.shap_values(X_proc)
    if isinstance(sv, list):
        sv_row = sv[1][0]
    elif isinstance(sv, np.ndarray) and sv.ndim == 3:
        sv_row = sv[0, :, 1]
    else:
        sv_row = sv[0]
    expected = shap_explainer.expected_value
    if isinstance(expected, (list, np.ndarray)):
        base_value = float(expected[1])
    else:
        base_value = float(expected)

    contribs = sorted(
        zip(FEATURE_NAMES, sv_row.tolist()),
        key=lambda x: abs(x[1]), reverse=True,
    )
    features = [
        {
            "feature": f,
            "display_name": FEATURE_DISPLAY_NAMES.get(f, f),
            "shap_value": round(float(v), 4),
            "direction": "increases" if v > 0 else "decreases",
        }
        for f, v in contribs[:top_n]
    ]
    return {"base_value": round(base_value, 4), "features": features}


def explain_lime_readmission(patient: dict, top_n: int = 10) -> list[dict]:
    df = pd.DataFrame([patient]).reindex(columns=FEATURE_NAMES, fill_value=0)
    X_proc = preprocessor.transform(df)
    exp = lime_explainer.explain_instance(
        X_proc[0], model.predict_proba,
        num_features=top_n, num_samples=500,
    )
    return [
        {
            "feature_desc": feat,
            "weight": round(float(w), 4),
            "direction": "increases" if w > 0 else "decreases",
        }
        for feat, w in exp.as_list(label=1)
    ]
