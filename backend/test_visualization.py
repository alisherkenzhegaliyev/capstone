"""
Test script for saving the strongest Grad-CAM visualization from /predict.
"""
import base64
import requests
import sys
from pathlib import Path

# API endpoint
BASE_URL = "http://localhost:8000"
PREDICT_ENDPOINT = f"{BASE_URL}/predict"

def test_visualize_endpoint(image_path):
    """Test the /predict endpoint and save the best available heatmap."""

    if not Path(image_path).exists():
        print(f"❌ Error: Image file not found: {image_path}")
        return False

    print(f"\n{'='*80}")
    print(f"Testing /predict endpoint with: {image_path}")
    print('='*80)

    try:
        # Open and send the image
        with open(image_path, 'rb') as f:
            files = {'file': (Path(image_path).name, f, 'image/jpeg')}
            response = requests.post(PREDICT_ENDPOINT, files=files, timeout=30)

        print(f"\nStatus Code: {response.status_code}")

        if response.status_code == 200:
            payload = response.json()
            findings = payload.get("findings", [])
            top_visualized = next(
                (
                    item for item in findings
                    if item.get("gradcam_plus_image") or item.get("gradcam_image")
                ),
                None,
            )

            if not top_visualized:
                print("❌ No Grad-CAM image returned for this prediction.")
                return False

            data_uri = top_visualized.get("gradcam_plus_image") or top_visualized.get("gradcam_image")
            _, encoded = data_uri.split(",", 1)
            image_bytes = base64.b64decode(encoded)

            output_filename = Path(image_path).stem + "_visualization.jpg"
            output_path = Path(__file__).resolve().parent / "static" / output_filename
            output_path.parent.mkdir(exist_ok=True)

            with open(output_path, 'wb') as f:
                f.write(image_bytes)

            print(f"✅ Visualization saved to: {output_path}")
            print(f"📊 Image size: {len(image_bytes)} bytes")
            print(f"Top visualized finding: {top_visualized['class_name']}")
            return True
        else:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False

    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to the API server.")
        print("   Make sure the server is running with: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
        return False
    except Exception as exc:
        print(f"❌ Error: {exc}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
    else:
        # Default test image (adjust path as needed)
        print("Usage: python test_visualization.py <path_to_xray_image>")
        print("\nSearching for test images in common locations...")
        
        # Try to find any image in common test locations
        test_paths = [
            "test_images/",
            "../test_images/",
            "static/",
        ]
        
        found = False
        for test_dir in test_paths:
            if Path(test_dir).exists():
                images = list(Path(test_dir).glob("*.jpg")) + list(Path(test_dir).glob("*.png"))
                if images:
                    image_path = str(images[0])
                    print(f"Found test image: {image_path}")
                    found = True
                    break
        
        if not found:
            print("❌ No test images found. Please provide an image path.")
            sys.exit(1)
    
    success = test_visualize_endpoint(image_path)
    sys.exit(0 if success else 1)
