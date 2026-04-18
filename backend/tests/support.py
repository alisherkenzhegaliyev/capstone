import importlib
import os
import sys
import types
from pathlib import Path

from sqlalchemy.orm import close_all_sessions


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

TEST_DB_PATH = BACKEND_DIR / "test_backend.sqlite3"

os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"
os.environ["JWT_SECRET"] = "test-secret"
os.environ["APP_LOGIN_EMAIL"] = "seeded@example.com"
os.environ["APP_LOGIN_PASSWORD"] = "SeededPass123!"


def _install_stub_service_modules() -> None:
    chd_module = types.ModuleType("app.services.chd_predictor")
    chd_module.predict_chd = lambda data: {
        "probability": 0.72,
        "prediction": 1,
        "risk_level": "High",
        "echo_age": data["age"],
    }
    chd_module.explain_shap = lambda data: {
        "base_value": 0.21,
        "features": [
            {
                "feature": "age",
                "display_name": "Age",
                "shap_value": 0.31,
                "direction": "increases",
            }
        ],
    }
    chd_module.explain_lime = lambda data: [
        {
            "feature_desc": "age > 55",
            "weight": 0.19,
            "direction": "increases",
        }
    ]
    sys.modules["app.services.chd_predictor"] = chd_module

    readmission_module = types.ModuleType("app.services.readmission_predictor")
    readmission_module.encode_patient = lambda raw: {"encoded": raw}
    readmission_module.predict_readmission = lambda data: {
        "probability": 0.44,
        "prediction": 1,
        "risk_level": "High",
        "encoded_payload": data,
    }
    readmission_module.explain_shap_readmission = lambda data: {
        "base_value": 0.14,
        "features": [
            {
                "feature": "time_in_hospital",
                "display_name": "Days in Hospital",
                "shap_value": 0.22,
                "direction": "increases",
            }
        ],
    }
    readmission_module.explain_lime_readmission = lambda data: [
        {
            "feature_desc": "time_in_hospital > 5",
            "weight": 0.11,
            "direction": "increases",
        }
    ]
    sys.modules["app.services.readmission_predictor"] = readmission_module

    summarizer_module = types.ModuleType("app.services.llm_summarizer")
    summarizer_module.summarize_chd = (
        lambda probability, risk_level, shap_features: (
            f"CHD summary: {risk_level} at {probability:.2f}"
        )
    )
    summarizer_module.summarize_readmission = (
        lambda probability, risk_level, shap_features: (
            f"Readmission summary: {risk_level} at {probability:.2f}"
        )
    )
    summarizer_module.summarize_xray = (
        lambda status, findings, threshold: f"X-ray summary: {status}"
    )
    sys.modules["app.services.llm_summarizer"] = summarizer_module


_install_stub_service_modules()

db = importlib.import_module("app.db")
models = importlib.import_module("app.models")
auth = importlib.import_module("app.auth")
main = importlib.import_module("app.main")


def reset_database() -> None:
    close_all_sessions()
    db.Base.metadata.drop_all(bind=db.engine)
    db.Base.metadata.create_all(bind=db.engine)


def create_verified_user(
    *,
    email: str = "doctor@example.com",
    password: str = "SecurePass123!",
    is_verified: bool = True,
):
    session = db.SessionLocal()
    try:
        user = models.User(
            email=email,
            password_hash=auth.hash_password(password),
            is_verified=is_verified,
            verification_code=auth.generate_verification_code(),
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return user
    finally:
        session.close()


def auth_headers_for(client, *, email: str, password: str) -> dict[str, str]:
    response = client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
