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

from pytorch_grad_cam import GradCAM, GradCAMPlusPlus
from pytorch_grad_cam.utils.image import show_cam_on_image
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget

logger = logging.getLogger(__name__)
router = APIRouter()

# ======================================================
# CONFIG
# ======================================================
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Place downloaded CheXNet weights here (required for real predictions)
WEIGHTS_PATH = Path("models/chexnet.pth.tar")

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
    model = torchvision.models.densenet121(weights="IMAGENET1K_V1")
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
<<<<<<< HEAD
    Pneumonia prediction endpoint for chest X-ray images.
    Accepts image files and returns predictions with confidence scores.
    Uses BiomedCLIP model loaded from Hugging Face Hub.
    """
    # Check if model and tokenizer are loaded
    if model is None or tokenizer is None or preprocess is None:
        raise HTTPException(
            status_code=503,
            detail="Model or tokenizer not loaded. Please check server logs for initialization errors."
        )
    
    # Validate file type
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif']
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    try:
        # Read image
        contents = await file.read()
        img = Image.open(BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to read image: {str(e)}"
        )

    try:
        # Preprocess image (matching Colab approach)
        img_tensor = preprocess(img).unsqueeze(0).to(device)

        # Tokenize all labels with context length (matching Colab)
        texts = tokenizer([TEMPLATE + l for l in LABELS], context_length=CONTEXT_LENGTH).to(device)

        # Inference (matching Colab approach)
        with torch.no_grad():
            image_features, text_features, logit_scale = model(img_tensor, texts)
            logits = (logit_scale * image_features @ text_features.t()).detach().softmax(dim=-1)
            sorted_indices = torch.argsort(logits, dim=-1, descending=True)
            
            # Convert to CPU numpy/lists
            logits = logits.cpu().numpy()[0]
            sorted_indices = sorted_indices.cpu().numpy()[0]

        # Build predictions list
        predictions = []
        for i, idx in enumerate(sorted_indices):
            predictions.append({
                "label": LABELS[idx],
                "confidence": float(logits[idx])
            })

        # Top prediction
        top = predictions[0]

        # Pneumonia detection logic (matching Colab)
        is_pneumonia = 'pneumonia' in top["label"].lower()

        return {
            "top_prediction": top,
            "all_predictions": predictions,
            "is_pneumonia": is_pneumonia,
            "filename": file.filename
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )


# ======================================================
# VISUALIZATION ENDPOINT WITH GRADCAM
# ======================================================
@router.post("/visualize")
async def visualize(file: UploadFile = File(...)):
    """
    Generate GradCAM visualization for chest X-ray images.
    Returns a JPG image with three panels: original, CAM heatmap, and overlay.
    """
    # Check if model and tokenizer are loaded
    if model is None or tokenizer is None or preprocess is None:
        raise HTTPException(
            status_code=503,
            detail="Model or tokenizer not loaded. Please check server logs for initialization errors."
        )
    
    # Validate file type
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif']
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    try:
        # Read image
        contents = await file.read()
        original_img = Image.open(BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to read image: {str(e)}"
        )

    try:
        # Preprocess image
        img_tensor = preprocess(original_img).unsqueeze(0).to(device)

        # Tokenize all labels
        texts = tokenizer([TEMPLATE + l for l in LABELS], context_length=CONTEXT_LENGTH).to(device)

        # Get prediction first
        with torch.no_grad():
            image_features, text_features, logit_scale = model(img_tensor, texts)
            logits = (logit_scale * image_features @ text_features.t()).detach().softmax(dim=-1)
            logits_np = logits[0].cpu().numpy()
            top_idx = int(np.argmax(logits_np))
            top_label = LABELS[top_idx]
            top_conf = float(logits_np[top_idx] * 100.0)

        # Generate GradCAM
        gradcam = GradCAM_BiomedCLIP(model)
        cam_flat = gradcam.compute_cam(
            image_tensor=img_tensor.detach(),
            texts=texts,
            target_index=top_idx,
            device=device
        )

        # Create heatmap overlay
        overlayed, heatmap, cam_resized = apply_gradcam_heatmap(original_img, cam_flat, alpha=0.4)

        # Create visualization with three panels
        fig, axes = plt.subplots(1, 3, figsize=(16, 5))

        # Original
        axes[0].imshow(original_img)
        axes[0].set_title("Original X-ray", fontsize=12, fontweight='bold')
        axes[0].axis("off")

        # CAM map only
        im1 = axes[1].imshow(cam_resized, cmap='jet')
        axes[1].set_title("Grad-CAM Activation", fontsize=12, fontweight='bold')
        axes[1].axis("off")
        plt.colorbar(im1, ax=axes[1], fraction=0.046, pad=0.04)

        # Overlay
        axes[2].imshow(overlayed)
        axes[2].set_title(f"{top_label}\n({top_conf:.1f}%)", fontsize=11, fontweight='bold')
        axes[2].axis("off")

        plt.tight_layout()

        # Save to BytesIO as JPG
        buf = BytesIO()
        plt.savefig(buf, format='jpg', dpi=150, bbox_inches='tight')
        buf.seek(0)
        plt.close()

        # Return as streaming response
        return StreamingResponse(
            buf,
            media_type="image/jpeg",
            headers={
                "Content-Disposition": f"inline; filename={Path(file.filename).stem}_gradcam.jpg"
            }
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Visualization failed: {str(e)}"
        )
=======
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

        return {
            "status": status,
            "findings": findings,
            "original_image": _ndarray_to_base64(original_display),
            "filename": file.filename,
            "threshold": CONFIDENCE_THRESHOLD,
            "model": "CheXNet (DenseNet-121)",
        }

    except Exception as exc:
        logger.exception("Prediction failed for %s", file.filename)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}")
>>>>>>> feature/ml-integration-clean
