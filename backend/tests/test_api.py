from io import BytesIO
from types import SimpleNamespace
import unittest
from unittest.mock import patch

import numpy as np
import torch
from fastapi.testclient import TestClient
from PIL import Image

from .support import (
    auth_headers_for,
    create_verified_user,
    main,
    reset_database,
)


def _png_bytes(color: tuple[int, int, int] = (128, 128, 128)) -> bytes:
    image = Image.new("RGB", (8, 8), color=color)
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


class BackendApiTests(unittest.TestCase):
    def setUp(self) -> None:
        reset_database()
        self.user_email = "clinician@example.com"
        self.user_password = "ClinicianPass123!"
        create_verified_user(email=self.user_email, password=self.user_password)

    def test_protected_routes_require_authentication(self) -> None:
        with TestClient(main.app) as client:
            response = client.post("/chd/predict", json={"age": 60})
            self.assertEqual(response.status_code, 401)
            self.assertEqual(response.json()["detail"], "Authentication required.")

    def test_chd_predict_endpoint_returns_expected_payload(self) -> None:
        with TestClient(main.app) as client:
            headers = auth_headers_for(
                client, email=self.user_email, password=self.user_password
            )
            response = client.post(
                "/chd/predict",
                headers=headers,
                json={
                    "age": 62,
                    "sex": 1,
                    "total_cholesterol": 220,
                    "systolic_bp": 145,
                    "smoking": 1,
                    "diabetes": 0,
                    "bmi": 27,
                    "heart_rate": 70,
                    "glucose": 95,
                    "bp_meds": 1,
                    "prevalent_hypertension": 1,
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["risk_level"], "High")
        self.assertIn("shap_explanation", payload)
        self.assertEqual(payload["summary"], "CHD summary: High at 0.72")

    def test_chd_lime_endpoint_returns_explanation(self) -> None:
        with TestClient(main.app) as client:
            headers = auth_headers_for(
                client, email=self.user_email, password=self.user_password
            )
            response = client.post(
                "/chd/explain-lime",
                headers=headers,
                json={
                    "age": 62,
                    "sex": 1,
                    "total_cholesterol": 220,
                    "systolic_bp": 145,
                    "smoking": 1,
                    "diabetes": 0,
                    "bmi": 27,
                    "heart_rate": 70,
                    "glucose": 95,
                    "bp_meds": 1,
                    "prevalent_hypertension": 1,
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertIn("lime_explanation", response.json())

    def test_readmission_predict_translates_hyphenated_medication_keys(self) -> None:
        captured = {}

        def fake_encode_patient(raw):
            captured.update(raw)
            return {"encoded": "ok"}

        with patch("app.routers.readmission.encode_patient", side_effect=fake_encode_patient):
            with TestClient(main.app) as client:
                headers = auth_headers_for(
                    client, email=self.user_email, password=self.user_password
                )
                response = client.post(
                    "/readmission/predict",
                    headers=headers,
                    json={
                        "age_bracket": "[70-80]",
                        "gender": "Female",
                        "glyburide_metformin": "Steady",
                        "glipizide_metformin": "No",
                        "glimepiride_pioglitazone": "Up",
                        "metformin_rosiglitazone": "No",
                        "metformin_pioglitazone": "Down",
                    },
                )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(captured["glyburide-metformin"], "Steady")
        self.assertEqual(captured["glimepiride-pioglitazone"], "Up")
        self.assertEqual(captured["metformin-pioglitazone"], "Down")
        self.assertNotIn("glyburide_metformin", captured)

    def test_readmission_lime_endpoint_returns_explanation(self) -> None:
        with TestClient(main.app) as client:
            headers = auth_headers_for(
                client, email=self.user_email, password=self.user_password
            )
            response = client.post(
                "/readmission/explain-lime",
                headers=headers,
                json={"age_bracket": "[60-70]", "gender": "Male"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertIn("lime_explanation", response.json())

    def test_analyze_predict_returns_stubbed_result(self) -> None:
        class DummyModel:
            def __init__(self):
                self.features = SimpleNamespace(
                    denseblock4=SimpleNamespace(
                        denselayer16=SimpleNamespace(conv2="unused")
                    )
                )

            def __call__(self, _input_tensor):
                return torch.tensor([[0.1] * 13 + [0.95]], dtype=torch.float32)

        class DummyCam:
            def __init__(self, *args, **kwargs):
                pass

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                return False

            def __call__(self, input_tensor=None, targets=None):
                return np.zeros((1, 224, 224), dtype=np.float32)

        with patch("app.routers.analyze.model", DummyModel()), patch(
            "app.routers.analyze._is_grayscale_image", return_value=True
        ), patch(
            "app.routers.analyze.preprocess",
            return_value=(
                torch.zeros((1, 3, 224, 224), dtype=torch.float32),
                np.zeros((224, 224, 3), dtype=np.float32),
            ),
        ), patch("app.routers.analyze.GradCAM", DummyCam), patch(
            "app.routers.analyze.GradCAMPlusPlus", DummyCam
        ), patch(
            "app.routers.analyze.show_cam_on_image",
            return_value=np.full((224, 224, 3), 127, dtype=np.uint8),
        ), patch(
            "app.routers.analyze.summarize_xray", return_value="Synthetic summary"
        ):
            with TestClient(main.app) as client:
                headers = auth_headers_for(
                    client, email=self.user_email, password=self.user_password
                )
                response = client.post(
                    "/predict",
                    headers=headers,
                    files={"file": ("scan.png", _png_bytes(), "image/png")},
                )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ABNORMAL")
        self.assertEqual(payload["summary"], "Synthetic summary")
        self.assertTrue(payload["findings"][0]["has_heatmaps"])

    def test_analyze_rejects_unsupported_extension(self) -> None:
        with patch("app.routers.analyze.model", object()):
            with TestClient(main.app) as client:
                headers = auth_headers_for(
                    client, email=self.user_email, password=self.user_password
                )
                response = client.post(
                    "/predict",
                    headers=headers,
                    files={"file": ("notes.txt", b"not-an-image", "text/plain")},
                )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Unsupported file type", response.json()["detail"])

    def test_analyze_rejects_non_radiology_image(self) -> None:
        with patch("app.routers.analyze.model", object()), patch(
            "app.routers.analyze._is_grayscale_image", return_value=False
        ):
            with TestClient(main.app) as client:
                headers = auth_headers_for(
                    client, email=self.user_email, password=self.user_password
                )
                response = client.post(
                    "/predict",
                    headers=headers,
                    files={"file": ("scan.png", _png_bytes((255, 0, 0)), "image/png")},
                )

        self.assertEqual(response.status_code, 422)
        self.assertIn("Please upload a chest X-ray", response.json()["detail"])
