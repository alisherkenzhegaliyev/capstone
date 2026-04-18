"""
LLM-powered image validation and plain-English summaries using Groq.
- classify_medical_image: Llama 4 Scout (vision) — gates the X-ray endpoint
- summarize_*: Llama 3.1 8B Instant (text) — appended to every predict response

All functions return None/True gracefully when GROQ_API_KEY is absent so the
prediction endpoints still work without the summarizer configured.
"""
import logging

from groq import Groq

from app.settings import GROQ_API_KEY, GROQ_TEXT_MODEL

logger = logging.getLogger(__name__)

_client: Groq | None = None

_SUMMARY_SYSTEM = (
    "You are a clinical AI assistant writing a brief interpretation for a physician. "
    "Be specific: name the exact values, confidence scores, and feature contributions given. "
    "Explain what the numbers mean clinically — do not just restate them. "
    "Write 3-4 sentences. No bullet points. "
    "Do not recommend treatments. End with one sentence noting this is a screening tool, not a diagnosis."
)


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
    detected = [f for f in findings if f["probability"] >= threshold]
    below = [f for f in findings if threshold > f["probability"] >= 0.05]

    detected_text = ", ".join(
        f"{f['class_name']} ({f['probability']:.1%})" for f in detected
    ) or "none"
    below_text = ", ".join(
        f"{f['class_name']} ({f['probability']:.1%})" for f in below[:4]
    ) or "none"

    return _summarize(
        f"CheXNet DenseNet-121 chest X-ray analysis. Status: {status}. "
        f"Threshold: {threshold:.0%}.\n"
        f"Flagged findings: {detected_text}.\n"
        f"Notable sub-threshold findings: {below_text}.\n"
        f"Write a radiology-style interpretation: discuss the flagged findings' confidence levels, "
        f"whether their co-occurrence is clinically meaningful, and any sub-threshold findings worth monitoring."
    )
