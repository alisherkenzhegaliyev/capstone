"""
Test script for the pneumonia prediction API endpoint.
Place your chest X-ray image in the same directory as this script
and update the IMAGE_PATH variable.
"""

import requests

# Configuration
API_URL = "http://localhost:8000/predict"
IMAGE_PATH = "./static/Pneuma_2.jpg"  # Update this with your test image path

def test_predict():
    """Send a test image to the /predict endpoint"""
    try:
        with open(IMAGE_PATH, "rb") as f:
            files = {"file": (IMAGE_PATH, f, "image/jpeg")}
            response = requests.post(API_URL, files=files)
        
        if response.status_code == 200:
            result = response.json()
            print("=" * 80)
            print("✅ PREDICTION SUCCESSFUL")
            print("=" * 80)
            print(f"\n📄 Filename: {result.get('filename', 'Unknown')}")
            print(f"\nTop Prediction: {result['top_prediction']['label']}")
            print(f"Confidence: {result['top_prediction']['confidence']:.2%}")
            
            # Highlight pneumonia detection
            if result['is_pneumonia']:
                print(f"\n⚠️  PNEUMONIA DETECTED")
            else:
                print(f"\n✓ Normal/Healthy")
            
            print(f"\nTop 3 Predictions:")
            for i, pred in enumerate(result['all_predictions'][:3], 1):
                print(f"  {i}. {pred['label']}: {pred['confidence']:.2%}")
            
            print("\nAll Predictions:")
            for pred in result['all_predictions']:
                print(f"  - {pred['label']}: {pred['confidence']:.2%}")
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
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    test_predict()
