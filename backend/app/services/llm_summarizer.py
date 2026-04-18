"""
LLM-powered image validation and plain-English summaries using Groq.
- classify_medical_image: Llama 4 Scout (vision) — gates the X-ray endpoint
- summarize_*: Llama 3.1 8B Instant (text) — appended to every predict response

All functions return None/True gracefully when GROQ_API_KEY is absent so the
prediction endpoints still work without the summarizer configured.
"""
import base64
import logging
from io import BytesIO

from groq import Groq
from PIL import Image

from app.settings import GROQ_API_KEY, GROQ_TEXT_MODEL, GROQ_VISION_MODEL

logger = logging.getLogger(__name__)

_client: Groq | None = None

_SUMMARY_SYSTEM = (
    "You are a clinical AI assistant writing a brief interpretation for a physician. "
    "Be specific: name the exact values, confidence scores, and feature contributions given. "
    "Explain what the numbers mean clinically — do not just restate them. "
    "Write 3-4 sentences. No bullet points. "
    "Do not recommend treatments. End with one sentence noting this is a screening tool, not a diagnosis."
)


def classify_medical_image(pil_img: Image.Image) -> bool:
    """
    Returns True if the image is a chest X-ray or medical scan, False otherwise.
    Falls back to True (allow through) when Groq is unavailable so the heuristic
    in the caller can still gate the request.
    """
    client = _get_client()
    if client is None:
        return True  # no Groq key — defer to caller's heuristic

    try:
        # Resize to 512px wide to keep the payload small
        img = pil_img.copy().convert("RGB")
        img.thumbnail((512, 512))
        buf = BytesIO()
        img.save(buf, format="JPEG", quality=75)
        b64 = base64.b64encode(buf.getvalue()).decode()

        response = client.chat.completions.create(
            model=GROQ_VISION_MODEL,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
                    },
                    {
                        "type": "text",
                        "text": (
                            "Is this image a chest X-ray or other medical radiological scan "
                            "(e.g. CT, MRI, X-ray)? Answer with a single word: yes or no."
                        ),
                    },
                ],
            }],
            max_tokens=5,
        )
        answer = response.choices[0].message.content.strip().lower()
        return answer.startswith("yes")
    except Exception as exc:
        logger.warning("Vision classifier failed: %s — allowing image through", exc)
        return True  # fail open: let heuristic decide


def _get_client() -> Groq | None:
    global _client
    if not GROQ_API_KEY:
        return None
    if _client is None:
        _client = Groq(api_key=GROQ_API_KEY)
    return _client


def _summarize(prompt: str) -> str | None:
    client = _get_client()
    if client is None:
        return None
    try:
        response = client.chat.completions.create(
            model=GROQ_TEXT_MODEL,
            messages=[
                {"role": "system", "content": _SUMMARY_SYSTEM},
                {"role": "user", "content": prompt},
            ],
            max_tokens=300,
        )
        return response.choices[0].message.content
    except Exception as exc:
        logger.warning("LLM summarizer failed: %s", exc)
        return None


def summarize_chd(
    probability: float,
    risk_level: str,
    shap_features: list[dict],
) -> str | None:
    increasing = [f for f in shap_features if f["direction"] == "increases"][:3]
    decreasing = [f for f in shap_features if f["direction"] == "decreases"][:2]
    inc_text = ", ".join(
        f"{f['display_name']} (SHAP +{abs(f['shap_value']):.3f})" for f in increasing
    ) or "none dominant"
    dec_text = ", ".join(
        f"{f['display_name']} (SHAP -{abs(f['shap_value']):.3f})" for f in decreasing
    ) or "none dominant"
    return _summarize(
        f"Framingham Random Forest: {probability:.1%} 10-year CHD probability, {risk_level} risk.\n"
        f"Risk-increasing factors: {inc_text}.\n"
        f"Risk-decreasing factors: {dec_text}.\n"
        f"Interpret for a cardiologist: explain what the top drivers suggest about this patient's "
        f"cardiovascular profile and how {probability:.1%} compares to the ~10% population baseline."
    )


def summarize_readmission(
    probability: float,
    risk_level: str,
    shap_features: list[dict],
) -> str | None:
    increasing = [f for f in shap_features if f["direction"] == "increases"][:3]
    decreasing = [f for f in shap_features if f["direction"] == "decreases"][:2]
    inc_text = ", ".join(
        f"{f['display_name']} (SHAP +{abs(f['shap_value']):.3f})" for f in increasing
    ) or "none dominant"
    dec_text = ", ".join(
        f"{f['display_name']} (SHAP -{abs(f['shap_value']):.3f})" for f in decreasing
    ) or "none dominant"
    return _summarize(
        f"LightGBM: {probability:.1%} 30-day readmission probability, {risk_level} risk.\n"
        f"Risk-increasing factors: {inc_text}.\n"
        f"Risk-decreasing factors: {dec_text}.\n"
        f"Interpret for a hospitalist: explain what the drivers reveal about this patient's "
        f"readmission vulnerability and whether {probability:.1%} is elevated vs the ~10-15% diabetic baseline."
    )


def summarize_xray(
    status: str,
    findings: list[dict],
    threshold: float,
) -> str | None:
    detected = [f for f in findings if f.get("detected", False)]
    below = [f for f in findings if not f.get("detected", False) and f["probability"] >= 0.1]

    detected_text = ", ".join(
        f"{f['class_name']} ({f['probability']:.1%})" for f in detected
    ) or "none"
    below_text = ", ".join(
        f"{f['class_name']} ({f['probability']:.1%})" for f in below[:4]
    ) or "none"

    return _summarize(
        f"CheXNet DenseNet-121 chest X-ray analysis. Overall status: {status}.\n"
        f"Findings above per-class confidence threshold: {detected_text}.\n"
        f"Notable sub-threshold findings: {below_text}.\n"
        f"The overall status is {status}. If NORMAL, do not alarm the reader — summarise calmly. "
        f"If ABNORMAL, discuss the detected findings' confidence levels and clinical significance. "
        f"Mention any sub-threshold findings worth monitoring. "
        f"Write 3-4 sentences in a radiology-style tone. End with one sentence noting this is a screening tool."
    )
