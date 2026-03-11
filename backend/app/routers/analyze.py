import torch
from pathlib import Path
from io import BytesIO
import numpy as np
import cv2
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt

import torch.nn.functional as F
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from PIL import Image

from open_clip import create_model_from_pretrained, get_tokenizer

router = APIRouter()

# ======================================================
# CONFIG — BiomedCLIP Model Configuration
# ======================================================
MODEL_HUB_NAME = 'hf-hub:microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224'
CONTEXT_LENGTH = 256

# MAIN LABEL LIST USING BEST PRACTICES (matching Colab configuration)
LABELS = [
    'normal chest X-ray',
    'pneumonia chest X-ray',
    'bacterial pneumonia chest X-ray',
    'viral pneumonia chest X-ray',
    'chest X-ray with lung infection',
    'healthy lungs chest X-ray',
    'chest X-ray with consolidation',
    'chest X-ray with infiltrates',
]

TEMPLATE = 'this is a photo of '

# Set device
device = torch.device('cuda') if torch.cuda.is_available() else torch.device('cpu')

# ======================================================
# LOAD MODEL, TOKENIZER & PREPROCESS
# ======================================================
print("Loading BiomedCLIP from Hugging Face Hub...")
try:
    model, preprocess = create_model_from_pretrained(MODEL_HUB_NAME)
    tokenizer = get_tokenizer(MODEL_HUB_NAME)
    
    print(f"Using device: {device}")
    model.to(device)
    model.eval()
    print("✅ Model loaded successfully and ready!")
    
except Exception as e:
    print(f"Error loading model: {e}")
    model = None
    tokenizer = None
    preprocess = None

print("Backend ready.")


# ======================================================
# GRADCAM CLASS FOR BIOMEDCLIP (ViT)
# ======================================================
class GradCAM_BiomedCLIP:
    """
    Minimal Grad-CAM-style implementation for BiomedCLIP's ViT visual encoder.
    We hook into the last transformer block (norm1) and compute token-wise
    importance, which we then reshape into a 2D patch map (e.g., 14x14).
    """
    def __init__(self, model):
        self.model = model
        self.activations = None  # [B, seq_len, dim]
        self.gradients = None    # [B, seq_len, dim]

    def _save_activations(self, module, inp, out):
        self.activations = out

    def _save_gradients(self, module, grad_input, grad_output):
        # grad_output is a tuple; we want gradient wrt activations
        self.gradients = grad_output[0]

    def get_target_layer(self):
        """
        Get the last meaningful layer in the visual transformer for Grad-CAM.
        This follows current OpenCLIP / timm structure.
        """
        visual = self.model.visual

        # OpenCLIP vision tower usually has a "trunk" with "blocks"
        if hasattr(visual, "trunk"):
            trunk = visual.trunk
            if hasattr(trunk, "blocks") and len(trunk.blocks) > 0:
                last_block = trunk.blocks[-1]
                # Prefer norm1 if it exists (good for ViT Grad-CAM)
                if hasattr(last_block, "norm1"):
                    return last_block.norm1
                return last_block

        # Fallback: just return the whole visual module (not ideal, but safe)
        return visual

    def compute_cam(self, image_tensor, texts, target_index, device):
        """
        image_tensor: (1, 3, H, W) preprocessed image
        texts: tokenized labels (N_labels, ...)
        target_index: index of the label we want CAM for
        """
        # Get target layer and register hooks
        target_layer = self.get_target_layer()
        fwd_handle = target_layer.register_forward_hook(self._save_activations)
        bwd_handle = target_layer.register_full_backward_hook(self._save_gradients)

        # Forward (with gradients enabled for image)
        image_tensor = image_tensor.to(device)
        image_tensor.requires_grad_(True)

        # Full BiomedCLIP forward using encode_image / encode_text
        image_features = self.model.encode_image(image_tensor)
        text_features = self.model.encode_text(texts)

        # Similarity score for the chosen label
        # (cosine-like similarity, but we treat it as scalar we can backprop through)
        similarity = (image_features @ text_features.t())[0, target_index]

        # Backward
        self.model.zero_grad(set_to_none=True)
        similarity.backward(retain_graph=False)

        # Remove hooks
        fwd_handle.remove()
        bwd_handle.remove()

        # Sanity checks
        if self.activations is None or self.gradients is None:
            raise RuntimeError("GradCAM: activations or gradients were not captured")

        # activations: [1, seq_len, dim], gradients: [1, seq_len, dim]
        activations = self.activations[0]  # [seq_len, dim]
        gradients = self.gradients[0]      # [seq_len, dim]

        # Remove CLS token if present (usually first token)
        if activations.shape[0] > 196:  # more than 14x14 patches
            activations = activations[1:]
            gradients = gradients[1:]

        # Global average pooling of gradients over embedding dim
        weights = gradients.mean(dim=1)         # [seq_len]
        cam = (activations * weights.unsqueeze(1)).sum(dim=1)  # [seq_len]

        cam = F.relu(cam)

        # Normalize
        cam = cam.detach().cpu().numpy()
        cam = cam - cam.min()
        if cam.max() > 0:
            cam = cam / cam.max()

        return cam  # 1D array over patches


print("✅ GradCAM_BiomedCLIP helper defined.")


# ======================================================
# GRADCAM HEATMAP OVERLAY FUNCTION
# ======================================================
def apply_gradcam_heatmap(original_img_pil, cam_flat, alpha=0.4):
    """
    Overlay Grad-CAM heatmap on original image.

    Args:
        original_img_pil: PIL Image object (RGB)
        cam_flat: 1D CAM vector over ViT patches or 2D map
        alpha: heatmap transparency

    Returns:
        overlayed (H,W,3), heatmap (H,W,3), cam_resized (H,W) arrays
    """
    original_np = np.array(original_img_pil)
    h, w = original_np.shape[:2]

    # Convert CAM to 2D map
    cam = np.array(cam_flat)
    if cam.ndim == 1:
        # Treat as flattened patch grid (e.g., 14x14)
        patch_side = int(np.sqrt(len(cam)))
        cam_map = cam.reshape(patch_side, patch_side)
    elif cam.ndim == 2:
        cam_map = cam
    else:
        raise ValueError(f"Unexpected CAM shape: {cam.shape}")

    # Resize CAM to image size
    cam_resized = cv2.resize(cam_map, (w, h))

    # Normalize again for visualization (0–1)
    cam_resized = cam_resized - cam_resized.min()
    if cam_resized.max() > 0:
        cam_resized = cam_resized / cam_resized.max()

    # Create heatmap
    heatmap = np.uint8(255 * cam_resized)
    heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
    heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)

    # Blend original and heatmap
    overlayed = cv2.addWeighted(original_np, 1 - alpha, heatmap, alpha, 0)

    return overlayed, heatmap, cam_resized


# ======================================================
# PREDICTION ENDPOINT
# ======================================================
@router.post("/predict")
async def predict(file: UploadFile = File(...)):
    """
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
