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
import logging
from io import BytesIO
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torchvision
import torchvision.transforms as T
from fastapi import APIRouter, File, HTTPException, UploadFile
from PIL import Image

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

# Findings with probability >= this threshold are flagged as detected
CONFIDENCE_THRESHOLD = 0.3

# Maximum number of findings to pre-compute Grad-CAM heatmaps for
MAX_HEATMAPS = 5

# ImageNet normalisation — must match CheXNet training pipeline
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD  = [0.229, 0.224, 0.225]

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif"}

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
async def predict(file: UploadFile = File(...)):
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
        original_pil = Image.open(BytesIO(contents)).convert("RGB")
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
            if probs[i] >= CONFIDENCE_THRESHOLD
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
            idx = int(i)
            has_heatmaps = idx in heatmap_data
            findings.append({
                "class_index": idx,
                "class_name": CLASS_NAMES[idx],
                "probability": round(float(probs[idx]), 4),
                "has_heatmaps": has_heatmaps,
                "gradcam_image": heatmap_data.get(idx, {}).get("gradcam"),
                "gradcam_plus_image": heatmap_data.get(idx, {}).get("gradcam_plus"),
            })

        # --- Overall status ---
        status = "ABNORMAL" if any(probs[i] >= CONFIDENCE_THRESHOLD for i in range(N_CLASSES)) else "NORMAL"

        original_display = (img_rgb_norm * 255).astype(np.uint8)

        summary = await asyncio.to_thread(
            summarize_xray, status, findings, CONFIDENCE_THRESHOLD
        )

        return {
            "status": status,
            "findings": findings,
            "original_image": _ndarray_to_base64(original_display),
            "filename": file.filename,
            "threshold": CONFIDENCE_THRESHOLD,
            "model": "CheXNet (DenseNet-121)",
            "summary": summary,
        }

    except Exception as exc:
        logger.exception("Prediction failed for %s", file.filename)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}")
