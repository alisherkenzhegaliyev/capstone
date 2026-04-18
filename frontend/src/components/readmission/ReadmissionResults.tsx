import { useState } from "react";
import type { ReadmissionInput, ReadmissionPrediction, LIMEFeature } from "../../types/readmission";
import { explainReadmissionLime } from "../../api/readmission";
import RiskGauge from "../shared/RiskGauge";
import SHAPChart from "../shared/SHAPChart";
import LIMEChart from "../shared/LIMEChart";

interface ReadmissionResultsProps {
  result: ReadmissionPrediction;
  patientData: ReadmissionInput;
  onReset: () => void;
}

const DIAG_LABEL: Record<string, string> = {
  Circulatory: "Circulatory", Diabetes: "Diabetes", Respiratory: "Respiratory",
  Digestive: "Digestive", Genitourinary: "Genitourinary", Musculoskeletal: "Musculoskeletal",
  Injury: "Injury", Neoplasms: "Neoplasms", Other: "Other", External: "External",
};

const ADMISSION_TYPE_LABEL: Record<number, string> = {
  1: "Emergency", 2: "Urgent", 3: "Elective", 4: "Newborn",
  5: "N/A", 6: "NULL", 7: "Trauma Center", 8: "Not Mapped",
};

const DISCHARGE_LABEL: Record<number, string> = {
  1: "Home", 2: "Short-term Hospital", 3: "Skilled Nursing", 5: "N/A",
  6: "Home + Health Svc", 7: "Left AMA", 18: "Home IV", 22: "Rehab", 25: "Psychiatric", 28: "Hospice",
};

export default function ReadmissionResults({ result, patientData, onReset }: ReadmissionResultsProps) {
  const [limeFeatures, setLimeFeatures] = useState<LIMEFeature[] | null>(null);
  const [limeLoading, setLimeLoading] = useState(false);

  const handleLime = async () => {
    setLimeLoading(true);
    try {
      const res = await explainReadmissionLime(patientData);
      setLimeFeatures(res.lime_explanation);
    } catch {
      alert("LIME explanation failed.");
    }
    setLimeLoading(false);
  };

  const meds = [
    "metformin", "insulin", "glipizide", "glyburide", "pioglitazone",
    "repaglinide", "nateglinide", "glimepiride", "rosiglitazone",
    "acarbose", "miglitol", "chlorpropamide",
  ] as const;
  const activeMeds = meds.filter((m) => {
    const val = patientData[m as keyof ReadmissionInput];
    return val && val !== "No";
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">30-Day Readmission Risk Assessment</h2>
          <p className="text-sm text-slate-500 mt-0.5">Based on UCI Diabetes 130-US Hospitals dataset</p>
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
        description="Probability of hospital readmission within 30 days of discharge"
        thresholds={{ low: 0.102, medium: 0.3, high: 1 }}
      />

      {/* LLM summary */}
      {result.summary && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-2">AI Summary</h3>
          <p className="text-sm text-slate-700 leading-relaxed">{result.summary}</p>
        </div>
      )}

      {/* Patient summary cards */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Patient Data Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="bg-slate-50 rounded-lg px-3 py-2">
            <div className="text-xs text-slate-400">Age</div>
            <div className="text-sm font-semibold text-slate-800">{patientData.age_bracket}</div>
          </div>
          <div className="bg-slate-50 rounded-lg px-3 py-2">
            <div className="text-xs text-slate-400">Gender</div>
            <div className="text-sm font-semibold text-slate-800">{patientData.gender}</div>
          </div>
          <div className="bg-slate-50 rounded-lg px-3 py-2">
            <div className="text-xs text-slate-400">Race</div>
            <div className="text-sm font-semibold text-slate-800">{patientData.race}</div>
          </div>
          <div className="bg-slate-50 rounded-lg px-3 py-2">
            <div className="text-xs text-slate-400">Days in Hospital</div>
            <div className="text-sm font-semibold text-slate-800">{patientData.time_in_hospital}</div>
          </div>
          <div className="bg-slate-50 rounded-lg px-3 py-2">
            <div className="text-xs text-slate-400">Admission</div>
            <div className="text-sm font-semibold text-slate-800">
              {ADMISSION_TYPE_LABEL[patientData.admission_type_id] ?? patientData.admission_type_id}
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg px-3 py-2">
            <div className="text-xs text-slate-400">Discharge</div>
            <div className="text-sm font-semibold text-slate-800">
              {DISCHARGE_LABEL[patientData.discharge_disposition_id] ?? patientData.discharge_disposition_id}
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg px-3 py-2">
            <div className="text-xs text-slate-400">Primary Dx</div>
            <div className="text-sm font-semibold text-slate-800">{DIAG_LABEL[patientData.diag_1_cat] ?? patientData.diag_1_cat}</div>
          </div>
          <div className="bg-slate-50 rounded-lg px-3 py-2">
            <div className="text-xs text-slate-400">Prior Inpatient</div>
            <div className="text-sm font-semibold text-slate-800">{patientData.number_inpatient} visits</div>
          </div>
          <div className="bg-slate-50 rounded-lg px-3 py-2">
            <div className="text-xs text-slate-400">HbA1c</div>
            <div className="text-sm font-semibold text-slate-800">{patientData.A1Cresult}</div>
          </div>
          <div className="bg-slate-50 rounded-lg px-3 py-2">
            <div className="text-xs text-slate-400">Medications</div>
            <div className="text-sm font-semibold text-slate-800">{patientData.num_medications} total</div>
          </div>
          <div className="bg-slate-50 rounded-lg px-3 py-2 col-span-2">
            <div className="text-xs text-slate-400 mb-1">Active Medications</div>
            <div className="text-sm font-semibold text-slate-800">
              {activeMeds.length > 0 ? activeMeds.join(", ") : "None specified"}
            </div>
          </div>
        </div>
      </div>

      {/* SHAP */}
      <SHAPChart
        features={result.shap_explanation.features}
        baseValue={result.shap_explanation.base_value}
        finalProbability={result.probability}
        title="What drives this patient's readmission risk? (SHAP)"
      />

      {/* LIME */}
      {!limeFeatures ? (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className="text-base font-semibold text-slate-900 mb-1">LIME — Alternative Explanation</h3>
              <p className="text-sm text-slate-500">
                LIME builds a simple linear model around this patient to explain the prediction locally.
                Factors with very small influence (&lt;0.5%) are automatically filtered out.
                Takes ~2–5 seconds.
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
