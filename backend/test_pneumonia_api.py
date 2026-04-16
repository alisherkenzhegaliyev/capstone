"""
Test script for the pneumonia prediction API endpoint.
Place your chest X-ray image in the same directory as this script
and update the IMAGE_PATH variable.
"""

import requests
from pathlib import Path

# Configuration
API_URL = "http://localhost:8000/predict"
IMAGE_PATH = Path(__file__).resolve().parent / "static" / "Pneuma_2.JPG"

def test_predict():
    """Send a test image to the /predict endpoint."""
    try:
        with open(IMAGE_PATH, "rb") as f:
            files = {"file": (IMAGE_PATH.name, f, "image/jpeg")}
            response = requests.post(API_URL, files=files)

        if response.status_code == 200:
            result = response.json()
            findings = result.get("findings", [])
            top_finding = findings[0] if findings else None
            print("=" * 80)
            print("✅ PREDICTION SUCCESSFUL")
            print("=" * 80)
            print(f"\n📄 Filename: {result.get('filename', 'Unknown')}")
            print(f"Overall status: {result.get('status', 'Unknown')}")

            if top_finding:
                print(f"\nTop Finding: {top_finding['class_name']}")
                print(f"Confidence: {top_finding['probability']:.2%}")
            else:
                print("\nNo findings returned.")

            pneumonia = next((item for item in findings if item["class_name"] == "Pneumonia"), None)
            if pneumonia and pneumonia["probability"] >= result.get("threshold", 0.0):
                print("\n⚠️  PNEUMONIA FLAGGED")
            else:
                print("\n✓ Pneumonia not flagged above threshold")

            print("\nTop 3 Findings:")
            for i, pred in enumerate(findings[:3], 1):
                print(f"  {i}. {pred['class_name']}: {pred['probability']:.2%}")

            print("=" * 80)
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.json())

    except FileNotFoundError:
        print(f"❌ Image file not found: {IMAGE_PATH}")
        print("Please update IMAGE_PATH to point to a valid chest X-ray image.")
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed. Make sure the backend server is running.")
        print("Start the server with: uvicorn app.main:app --reload")
    except Exception as exc:
        print(f"❌ Unexpected error: {exc}")

if __name__ == "__main__":
    test_predict()
