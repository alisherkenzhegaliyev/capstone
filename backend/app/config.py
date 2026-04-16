"""
Application configuration including model settings.
"""

from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BACKEND_DIR / "models"
STATIC_DIR = BACKEND_DIR / "static" / "annotated"


# Model configurations for document inspection
# Add/remove/modify models here without changing code logic
MODEL_CONFIGS = [
    {
        "path": str(MODELS_DIR / "qrcode.pt"),
        "conf_threshold": 0.65,
        "name": "QR Code Detector",
    },
    {
        "path": str(MODELS_DIR / "danik&stamp.pt"),
        "conf_threshold": 0.25,
        "name": "Signature Detector",
    },
    # Add your third model when ready:
    # {
    #     "path": str(MODELS_DIR / "stamp_detector.pt"),
    #     "conf_threshold": 0.65,
    #     "name": "Stamp Detector",
    # },
]
