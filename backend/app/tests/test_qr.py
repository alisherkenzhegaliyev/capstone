from ultralytics import YOLO
from PIL import Image
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[2]
MODEL_PATH = BACKEND_DIR / "models" / "qrcode.pt"

CONF = 0.65
def main():
    if len(sys.argv) < 2:
        print("Usage: python test_qr.py <image_path>")
        return

    image_path = Path(sys.argv[1]).expanduser().resolve()
    if not image_path.exists():
        print(f"❌ Image file not found: {image_path}")
        return

    if not MODEL_PATH.exists():
        print(f"❌ QR model not found: {MODEL_PATH}")
        return

    print(f"🔍 Running inference on {image_path}")

    # Load YOLO model
    model = YOLO(str(MODEL_PATH))

    # Run prediction
    results = model.predict(str(image_path), conf=CONF)

    # Parse and print results
    for result in results:
        for box in result.boxes:
            cls = int(box.cls[0])
            conf = float(box.conf[0])
            x1, y1, x2, y2 = box.xyxy[0].tolist()

            print(f"\n📌 Detection:")
            print(f" Class: {result.names[cls]}")
            print(f" Confidence: {conf:.3f}")
            print(f" BBox: [{x1:.1f}, {y1:.1f}, {x2:.1f}, {y2:.1f}]")

    # Save annotated image
    annotated = results[0].plot()
    out = BACKEND_DIR / "static" / "annotated.jpg"
    Image.fromarray(annotated[..., ::-1]).save(out)
    print(f"\n✅ Annotated result saved to {out}")

if __name__ == "__main__":
    main()
