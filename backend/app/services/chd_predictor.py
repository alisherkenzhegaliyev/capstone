"""
Case 1: 10-Year Coronary Heart Disease Risk Prediction Service.
Uses Random Forest model trained on Framingham Heart Study data.
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
class ClinicalPreprocessor(BaseEstimator, TransformerMixin):
    def __init__(self):
        self.imputer = SimpleImputer(strategy='median')
        self.scaler = StandardScaler()

    def fit(self, X, y=None):
        self.imputer.fit(X)
        self.scaler.fit(self.imputer.transform(X))
        return self

    def transform(self, X, y=None):
        return self.scaler.transform(self.imputer.transform(X))


# Inject into __main__ so pickle can find it (class was saved from a Jupyter notebook)
import __main__
__main__.ClinicalPreprocessor = ClinicalPreprocessor

# --- Load artifacts ---
MODEL_DIR = Path(__file__).resolve().parent.parent.parent / "models" / "coronary"

with open(MODEL_DIR / "best_model_v2.pkl", "rb") as f:
    model = pickle.load(f)
with open(MODEL_DIR / "preprocessor.pkl", "rb") as f:
    preprocessor = pickle.load(f)
with open(MODEL_DIR / "shap_explainer.pkl", "rb") as f:
    shap_explainer = pickle.load(f)
with open(MODEL_DIR / "lime_config.pkl", "rb") as f:
    lime_config = pickle.load(f)
with open(MODEL_DIR / "model_metadata_v2.json") as f:
    metadata = json.load(f)

FEATURE_NAMES = metadata["features"]["feature_names"]  # 13 features
THRESHOLD = metadata["thresholds"]["Random Forest"]     # 0.439
DISPLAY_NAMES = metadata["features"]["feature_display_names"]

lime_explainer = lime.lime_tabular.LimeTabularExplainer(**lime_config)

print(f"✅ CHD model loaded: {metadata['model_info']['best_model_name']}, threshold={THRESHOLD:.3f}")


def predict_chd(patient: dict) -> dict:
    df = pd.DataFrame([patient])[FEATURE_NAMES]
    X_proc = pd.DataFrame(preprocessor.transform(df), columns=FEATURE_NAMES)
    proba = float(model.predict_proba(X_proc)[0, 1])
    MEDIUM_THRESHOLD = 0.15
    if proba >= THRESHOLD:
        risk_level = "High"
    elif proba >= MEDIUM_THRESHOLD:
        risk_level = "Medium"
    else:
        risk_level = "Low"
    return {
        "probability": round(proba, 4),
        "prediction": int(proba >= THRESHOLD),
        "risk_level": risk_level,
    }


def explain_shap(patient: dict, top_n: int = 10) -> dict:
    df = pd.DataFrame([patient])[FEATURE_NAMES]
    X_proc = preprocessor.transform(df)
    sv = shap_explainer.shap_values(X_proc)
    # Handle both old API (list of arrays) and new API (3D ndarray)
    if isinstance(sv, list):
        sv_row = sv[1][0]   # list[pos_class][sample_0] → shape (n_features,)
    elif isinstance(sv, np.ndarray) and sv.ndim == 3:
        sv_row = sv[0, :, 1]  # (samples, features, classes)[0, :, pos_class]
    else:
        sv_row = sv[0]        # (samples, features)[0]
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
            "display_name": DISPLAY_NAMES.get(f, f),
            "shap_value": round(float(v), 4),
            "direction": "increases" if v > 0 else "decreases",
        }
        for f, v in contribs[:top_n]
    ]
    return {"base_value": round(base_value, 4), "features": features}


def explain_lime(patient: dict, top_n: int = 10) -> list[dict]:
    df = pd.DataFrame([patient])[FEATURE_NAMES]
    X_proc = preprocessor.transform(df)
    exp = lime_explainer.explain_instance(
        X_proc[0], model.predict_proba,
        num_features=top_n, num_samples=1000,
    )
    return [
        {
            "feature_desc": feat,
            "weight": round(float(w), 4),
            "direction": "increases" if w > 0 else "decreases",
        }
        for feat, w in exp.as_list(label=1)
    ]
