import { useState } from "react";
import type { CHDInput, CHDPrediction, LIMEFeature } from "../../types/chd";
import { explainCHDLime } from "../../api/chd";
import RiskGauge from "../shared/RiskGauge";
import SHAPChart from "../shared/SHAPChart";
import LIMEChart from "../shared/LIMEChart";

interface CHDResultsProps {
  result: CHDPrediction;
  patientData: CHDInput;
  onReset: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  age: "Age", sex: "Sex", total_cholesterol: "Total Cholesterol",
  systolic_bp: "Systolic BP", smoking: "Smoker", diabetes: "Diabetes",
  bmi: "BMI", heart_rate: "Heart Rate", glucose: "Glucose",
  bp_meds: "BP Medications", prevalent_hypertension: "Hypertension",
  cigs_per_day: "Cigarettes/Day", pulse_pressure: "Pulse Pressure",
};

function formatValue(key: string, val: number): string {
  if (key === "sex") return val === 1 ? "Male" : "Female";
  if (["smoking", "diabetes", "bp_meds", "prevalent_hypertension"].includes(key))
    return val === 1 ? "Yes" : "No";
  if (key === "total_cholesterol") return `${val} mg/dL`;
  if (key === "systolic_bp" || key === "pulse_pressure") return `${val} mmHg`;
  if (key === "glucose") return `${val} mg/dL`;
  if (key === "heart_rate") return `${val} bpm`;
  if (key === "bmi") return val.toFixed(1);
  if (key === "age") return `${val} yr`;
  return String(val);
}

export default function CHDResults({ result, patientData, onReset }: CHDResultsProps) {
  const [limeFeatures, setLimeFeatures] = useState<LIMEFeature[] | null>(null);
  const [limeLoading, setLimeLoading] = useState(false);

  const handleLime = async () => {
    setLimeLoading(true);
    try {
      const res = await explainCHDLime(patientData);
      setLimeFeatures(res.lime_explanation);
    } catch {
      alert("LIME explanation failed.");
    }
    setLimeLoading(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">10-Year CHD Risk Assessment</h2>
          <p className="text-sm text-slate-500 mt-0.5">Based on Framingham Heart Study model</p>
        </div>
        <button
          onClick={onReset}
          className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium"
        >
          ← New Assessment
        </button>
      </div>

      {/* Risk gauge */}
      <RiskGauge
        riskLevel={result.risk_level}
        probability={result.probability}
        description="Probability of developing coronary heart disease in the next 10 years"
        thresholds={{ low: 0.15, medium: 0.439, high: 1 }}
      />

      {/* LLM summary */}
      {result.summary && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-2">AI Summary</h3>
          <p className="text-sm text-slate-700 leading-relaxed">{result.summary}</p>
        </div>
      )}

      {/* Patient summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Patient Data Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {(Object.entries(patientData) as [string, number][]).map(([key, val]) => (
            <div key={key} className="bg-slate-50 rounded-lg px-3 py-2">
              <div className="text-xs text-slate-400">{FIELD_LABELS[key] ?? key}</div>
              <div className="text-sm font-semibold text-slate-800">{formatValue(key, val)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* SHAP */}
      <SHAPChart
        features={result.shap_explanation.features}
        baseValue={result.shap_explanation.base_value}
        finalProbability={result.probability}
        title="What drives this patient's risk? (SHAP)"
      />

      {/* LIME */}
      {!limeFeatures ? (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className="text-base font-semibold text-slate-900 mb-1">LIME — Alternative Explanation</h3>
              <p className="text-sm text-slate-500">
                LIME uses a different method: it builds a simple linear model around this patient
                to explain the prediction locally. Useful as a second opinion on the SHAP results.
                Takes ~2 seconds.
              </p>
            </div>
            <button
              onClick={handleLime}
              disabled={limeLoading}
              className="shrink-0 px-5 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium disabled:opacity-50 transition"
            >
              {limeLoading ? "Computing..." : "Generate"}
            </button>
          </div>
        </div>
      ) : (
        <LIMEChart features={limeFeatures} title="LIME — Alternative Local Explanation" />
      )}
    </div>
  );
}
