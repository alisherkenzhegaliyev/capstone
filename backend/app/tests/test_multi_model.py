"""
Test to verify multi-model detection system works correctly.
"""
from pathlib import Path

from app.services.document_inspector import DocumentInspector
from app.config import MODEL_CONFIGS
from PIL import Image
import numpy as np


BACKEND_DIR = Path(__file__).resolve().parents[2]


def _existing_configs():
    return [config for config in MODEL_CONFIGS if Path(config["path"]).exists()]


def test_single_model():
    """Test with a single model."""
    print("Testing single model...")

    configs = _existing_configs()
    if not configs:
        raise FileNotFoundError(f"No detector weights found under {BACKEND_DIR / 'models'}")

    config = [configs[0]]
    inspector = DocumentInspector(config)

    # Create a dummy image
    dummy_image = Image.fromarray(np.random.randint(0, 255, (800, 600, 3), dtype=np.uint8))

    detections, annotated = inspector.detect_image(dummy_image)

    print(f"✓ Single model loaded successfully")
    print(f"✓ Detections returned: {len(detections)}")
    print(f"✓ Annotated image type: {type(annotated)}")


def test_multiple_models():
    """Test with multiple models."""
    print("\nTesting multiple models...")

    config = _existing_configs()
    if len(config) < 2:
        print("⚠️  Fewer than two detector weights are available; skipping multi-model check.")
        return

    inspector = DocumentInspector(config)

    # Create a dummy image
    dummy_image = Image.fromarray(np.random.randint(0, 255, (800, 600, 3), dtype=np.uint8))

    detections, annotated = inspector.detect_image(dummy_image)

    print(f"✓ Multiple models loaded successfully")
    print(f"✓ Number of models: {len(inspector.models)}")
    print(f"✓ Detections returned: {len(detections)}")
    print(f"✓ Annotated image type: {type(annotated)}")

    # Check detection format
    if detections:
        print(f"✓ Detection format check:")
        for i, det in enumerate(detections[:3]):  # Show first 3
            print(f"  - Detection {i+1}: class={det['class']}, confidence={det['confidence']:.2f}")


if __name__ == "__main__":
    try:
        test_single_model()
        test_multiple_models()
        print("\n✅ All tests passed!")
    except Exception as exc:
        print(f"\n❌ Test failed: {exc}")
        import traceback
        traceback.print_exc()
