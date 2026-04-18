"""
Chest X-ray screening router using CheXNet (DenseNet-121) with Grad-CAM and Grad-CAM++.

Architecture:
  - DenseNet-121 backbone with 14-class classifier head matching
    the arnoweng/CheXNet checkpoint format (Linear(1024, 14)).
  - All 14 NIH ChestX-ray14 pathologies are evaluated per image.
  - sigmoid(output) gives per-class probabilities.

Weight download (required for meaningful predictions):
  1. Go to https://github.com/arnoweng/CheXNet
  2. Download model.pth.tar from the releases section
  3. Place it at:  capstone-main/backend/models/chexnet.pth.tar

Explainability:
  - GradCAM and GradCAM++ via the pytorch-grad-cam library (grad-cam package)
  - Target layer: model.features.denseblock4 (last conv block in DenseNet-121)
  - Heatmaps are pre-computed for the top N findings above the confidence threshold
  - All images returned as base64 PNG strings in a single /predict call

Endpoints:
  POST /predict   - returns status + 14 ranked findings + per-finding heatmaps + original image
"""

import asyncio
import base64
import json
import logging
import uuid
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

try:
    import pydicom
    PYDICOM_AVAILABLE = True
except ImportError:
    PYDICOM_AVAILABLE = False

import numpy as np
import torch
import torch.nn as nn
import torchvision
import torchvision.transforms as T
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from PIL import Image
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import Prediction, User
from app.redis_client import get_redis
from app.services.llm_summarizer import summarize_xray

from pytorch_grad_cam import GradCAM, GradCAMPlusPlus
from pytorch_grad_cam.utils.image import show_cam_on_image
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget

logger = logging.getLogger(__name__)
router = APIRouter()

# ======================================================
# CONFIG
# ======================================================
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
BACKEND_DIR = Path(__file__).resolve().parents[2]

# Place downloaded CheXNet weights here (required for real predictions)
WEIGHTS_PATH = BACKEND_DIR / "models" / "chexnet.pth.tar"

N_CLASSES = 14

# NIH ChestX-ray14 class names (order matches the arnoweng/CheXNet checkpoint)
CLASS_NAMES = [
    "Atelectasis",        # 0
    "Cardiomegaly",       # 1
    "Effusion",           # 2
    "Infiltration",       # 3
    "Mass",               # 4
    "Nodule",             # 5
    "Pneumonia",          # 6
    "Pleural Thickening", # 7
    "Consolidation",      # 8
    "Edema",              # 9
    "Emphysema",          # 10
    "Fibrosis",           # 11
    "Pneumothorax",       # 12
    "Hernia",             # 13
]

# Per-class thresholds tuned on NIH ChestX-ray14 test set (5000 images)
# via Youden's index (maximises sensitivity + specificity - 1)
PER_CLASS_THRESHOLDS = {
    "Atelectasis":       0.573,
    "Cardiomegaly":      0.492,
    "Effusion":          0.568,
    "Infiltration":      0.553,
    "Mass":              0.550,
    "Nodule":            0.407,
    "Pneumonia":         0.596,
    "Pleural Thickening":0.258,
    "Consolidation":     0.552,
    "Edema":             0.555,
    "Emphysema":         0.556,
    "Fibrosis":          0.523,
    "Pneumothorax":      0.347,
    "Hernia":            0.448,
}

# Fallback threshold if a class is not in PER_CLASS_THRESHOLDS
CONFIDENCE_THRESHOLD = 0.5

# Maximum number of findings to pre-compute Grad-CAM heatmaps for
MAX_HEATMAPS = 5

# ImageNet normalisation — must match CheXNet training pipeline
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD  = [0.229, 0.224, 0.225]

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".dcm"}

# ======================================================
# MODEL LOADING
# ======================================================
def _build_model() -> nn.Module:
    """
    Build DenseNet-121 with a 14-class head matching the arnoweng/CheXNet
    checkpoint format.
    """
    # Avoid network downloads at startup; use the local CheXNet checkpoint when
    # available and otherwise keep the randomly initialized backbone.
    model = torchvision.models.densenet121(weights=None)
    num_features = model.classifier.in_features  # 1024
    model.classifier = nn.Linear(num_features, N_CLASSES)

    if WEIGHTS_PATH.exists():
        logger.info("Loading CheXNet weights from %s", WEIGHTS_PATH)
        checkpoint = torch.load(WEIGHTS_PATH, map_location=DEVICE)
        state_dict = checkpoint.get("state_dict", checkpoint)
        remapped = {}
        for k, v in state_dict.items():
            k = k.replace("module.", "")
            k = k.replace("densenet121.", "")
            k = k.replace("classifier.0.", "classifier.")
            k = k.replace(".norm.1.", ".norm1.")
            k = k.replace(".norm.2.", ".norm2.")
            k = k.replace(".conv.1.", ".conv1.")
            k = k.replace(".conv.2.", ".conv2.")
            remapped[k] = v
        model.load_state_dict(remapped)
        logger.info("CheXNet weights loaded successfully")
    else:
        logger.warning(
            "CheXNet weights not found at %s — predictions are RANDOM (ImageNet init only). "
            "Download model.pth.tar from https://github.com/arnoweng/CheXNet",
            WEIGHTS_PATH,
        )

    model.to(DEVICE)
    model.eval()
    return model


WEIGHTS_LOADED = WEIGHTS_PATH.exists()

print("Loading CheXNet model (DenseNet-121)...")
try:
    model = _build_model()
    print(f"Model ready on {DEVICE}")
except Exception as exc:
    logger.error("Failed to load model: %s", exc)
    model = None

# ======================================================
# PREPROCESSING
# ======================================================
_normalise = T.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD)
_to_tensor = T.ToTensor()


def _is_grayscale_image(img: Image.Image) -> bool:
    """
    X-rays are true grayscale: per-pixel HSV saturation is near zero everywhere.
    Regular photos have saturation in at least a significant portion of pixels
    (skin tones, clothing, backgrounds).

    Uses the 75th-percentile saturation so even a minority of colourful pixels
    (e.g. a neutral cap but visible skin) triggers rejection.
    Threshold: 8% saturation at p75 — well above X-ray noise (~1-3%) but
    below any real photograph (~15-50%).
    """
    arr = np.array(img.convert("RGB"), dtype=np.float32) / 255.0
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    saturation = np.where(max_c > 1e-6, (max_c - min_c) / max_c, 0.0)
    return float(np.percentile(saturation, 75)) < 0.08


def preprocess(pil_img: Image.Image):
    """
    Resize to 224x224, convert to RGB, return:
      - img_tensor: [1, 3, 224, 224] normalised tensor on DEVICE
      - img_rgb_norm: (224, 224, 3) float32 ndarray in [0, 1] for show_cam_on_image
    """
    img_resized = pil_img.resize((224, 224)).convert("RGB")
    img_np = np.array(img_resized, dtype=np.float32) / 255.0
    img_tensor = _normalise(_to_tensor(img_resized)).unsqueeze(0).to(DEVICE)
    return img_tensor, img_np


# ======================================================
# HELPERS
# ======================================================
def _ndarray_to_base64(arr: np.ndarray) -> str:
    """Convert a (H, W, 3) uint8 RGB array to a data-URI base64 PNG string."""
    pil_img = Image.fromarray(arr.astype(np.uint8))
    buf = BytesIO()
    pil_img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    return f"data:image/png;base64,{b64}"


# ======================================================
# PREDICTION ENDPOINT
# ======================================================
@router.post("/predict")
async def predict(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Accepts a chest X-ray image and returns:
      - status: "ABNORMAL" or "NORMAL"
      - findings: all 14 pathologies ranked by probability, with Grad-CAM
        heatmaps for the top findings above the confidence threshold
      - original_image: base64 PNG of the resized 224x224 input
      - filename, threshold, model metadata
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded — check server logs.")
    if not WEIGHTS_LOADED:
        raise HTTPException(
            status_code=503,
            detail="CheXNet weights are missing. Download model.pth.tar from https://github.com/arnoweng/CheXNet and place it at backend/models/chexnet.pth.tar.",
        )

    # --- Validate file type ---
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # --- Read image ---
    try:
        contents = await file.read()
        if ext == ".dcm":
            if not PYDICOM_AVAILABLE:
                raise HTTPException(status_code=500, detail="pydicom is not installed. Run: pip install pydicom")
            ds = pydicom.dcmread(BytesIO(contents))
            pixel_array = ds.pixel_array.astype(np.float32)
            # Normalise to 0-255
            pixel_array -= pixel_array.min()
            if pixel_array.max() > 0:
                pixel_array /= pixel_array.max()
            pixel_array = (pixel_array * 255).astype(np.uint8)
            # DICOM may be grayscale (2D) or multi-frame; handle both
            if pixel_array.ndim == 2:
                original_pil = Image.fromarray(pixel_array, mode="L").convert("RGB")
            else:
                original_pil = Image.fromarray(pixel_array).convert("RGB")
        else:
            original_pil = Image.open(BytesIO(contents)).convert("RGB")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read image: {exc}")

    # --- Gate: reject non-medical images before running CheXNet ---
    if not _is_grayscale_image(original_pil):
        raise HTTPException(
            status_code=422,
            detail="Please upload a chest X-ray. The submitted image does not appear to be a radiological scan.",
        )

    try:
        # --- Preprocess ---
        img_tensor, img_rgb_norm = preprocess(original_pil)

        # --- Forward pass ---
        with torch.no_grad():
            logits = model(img_tensor)                           # [1, 14]
            probs = torch.sigmoid(logits[0]).cpu().numpy()       # (14,)

        # --- Determine which findings get heatmaps ---
        ranked_indices = np.argsort(probs)[::-1]  # descending probability
        heatmap_indices = [
            int(i) for i in ranked_indices[:MAX_HEATMAPS]
            if probs[i] >= PER_CLASS_THRESHOLDS.get(CLASS_NAMES[int(i)], CONFIDENCE_THRESHOLD)
        ]

        # --- Grad-CAM for top findings ---
        target_layers = [model.features.denseblock4.denselayer16.conv2]
        heatmap_data = {}  # class_index -> {"gradcam": b64, "gradcam_plus": b64}

        if heatmap_indices:
            img_for_cam = img_tensor.clone().detach().requires_grad_(True)
            with GradCAM(model=model, target_layers=target_layers) as cam_obj:
                for cls_idx in heatmap_indices:
                    targets = [ClassifierOutputTarget(cls_idx)]
                    grayscale = cam_obj(input_tensor=img_for_cam, targets=targets)
                    overlay = show_cam_on_image(img_rgb_norm, grayscale[0], use_rgb=True)
                    heatmap_data.setdefault(cls_idx, {})["gradcam"] = _ndarray_to_base64(overlay)

            img_for_cam = img_tensor.clone().detach().requires_grad_(True)
            with GradCAMPlusPlus(model=model, target_layers=target_layers) as cam_pp_obj:
                for cls_idx in heatmap_indices:
                    targets = [ClassifierOutputTarget(cls_idx)]
                    grayscale = cam_pp_obj(input_tensor=img_for_cam, targets=targets)
                    overlay = show_cam_on_image(img_rgb_norm, grayscale[0], use_rgb=True)
                    heatmap_data.setdefault(cls_idx, {})["gradcam_plus"] = _ndarray_to_base64(overlay)

        # --- Build findings list (all 14, sorted by probability) ---
        findings = []
        for i in ranked_indices:
            idx       = int(i)
            name      = CLASS_NAMES[idx]
            threshold = PER_CLASS_THRESHOLDS.get(name, CONFIDENCE_THRESHOLD)
            findings.append({
                "class_index":      idx,
                "class_name":       name,
                "probability":      round(float(probs[idx]), 4),
                "threshold":        threshold,
                "detected":         bool(probs[idx] >= threshold),
                "has_heatmaps":     idx in heatmap_data,
                "gradcam_image":    heatmap_data.get(idx, {}).get("gradcam"),
                "gradcam_plus_image": heatmap_data.get(idx, {}).get("gradcam_plus"),
            })

        # --- Overall status ---
        status = "ABNORMAL" if any(f["detected"] for f in findings) else "NORMAL"

        original_display = (img_rgb_norm * 255).astype(np.uint8)

        summary = await asyncio.to_thread(
            summarize_xray, status, findings, CONFIDENCE_THRESHOLD
        )

        prediction_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        original_image_b64 = _ndarray_to_base64(original_display)

        response = {
            "status": status,
            "findings": findings,
            "original_image": original_image_b64,
            "filename": file.filename,
            "thresholds": "per-class (Youden-optimised on NIH ChestX-ray14)",
            "model": "CheXNet (DenseNet-121)",
            "summary": summary,
            "prediction_id": prediction_id,
        }

        # Full entry for Redis (7-day TTL) — includes base64 images
        full_entry = {
            "id": prediction_id,
            "createdAt": now.isoformat(),
            "feature": "xray",
            "prediction": response,
        }

        # Slim entry for Postgres — strip images to keep DB lean
        slim_findings = [
            {**f, "gradcam_image": None, "gradcam_plus_image": None}
            for f in findings
        ]
        slim_entry = {
            "id": prediction_id,
            "createdAt": now.isoformat(),
            "feature": "xray",
            "prediction": {**response, "original_image": "", "findings": slim_findings},
        }

        r = get_redis()
        if r:
            try:
                r.setex(f"xray:{prediction_id}", 7 * 24 * 3600, json.dumps(full_entry))
            except Exception as exc:
                logger.warning("Redis cache write failed: %s", exc)

        db.add(Prediction(
            id=prediction_id,
            user_id=current_user.id,
            feature="xray",
            entry_json=json.dumps(slim_entry),
            created_at=now,
        ))
        db.commit()

        return response

    except Exception as exc:
        logger.exception("Prediction failed for %s", file.filename)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}")
