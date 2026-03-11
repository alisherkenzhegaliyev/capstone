"""
Application configuration including model settings.
"""

# Model configurations for document inspection
# Add/remove/modify models here without changing code logic
MODEL_CONFIGS = [
    {
        "path": "./models/qrcode.pt",
        "conf_threshold": 0.65,
        "name": "QR Code Detector"
    },
    {
        "path": "./models/danik&stamp.pt",
        "conf_threshold": 0.25,
        "name": "Signature Detector"
    },
    # Add your third model when ready:
    # {
    #     "path": "./models/stamp_detector.pt",
    #     "conf_threshold": 0.65,
    #     "name": "Stamp Detector"
    # },
]

# API Settings
STATIC_DIR = "static/annotated"
