import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CHDForm from "../components/chd/CHDForm";
import CHDResults from "../components/chd/CHDResults";
import ReadmissionForm from "../components/readmission/ReadmissionForm";
import ReadmissionResults from "../components/readmission/ReadmissionResults";
import { predictCHD } from "../api/chd";
import { predictReadmission } from "../api/readmission";
import type { CHDInput, CHDPrediction } from "../types/chd";
import type { ReadmissionInput, ReadmissionPrediction } from "../types/readmission";

type Tab = "chd" | "readmission";

export default function ClinicalPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("chd");
  const [loading, setLoading] = useState(false);

  // CHD state
  const [chdResult, setChdResult] = useState<CHDPrediction | null>(null);
  const [chdInput, setChdInput] = useState<CHDInput | null>(null);

  // Readmission state
  const [readmResult, setReadmResult] = useState<ReadmissionPrediction | null>(null);
  const [readmInput, setReadmInput] = useState<ReadmissionInput | null>(null);

  const handleCHD = async (data: CHDInput) => {
    setLoading(true);
    try {
      const result = await predictCHD(data);
      setChdResult(result);
      setChdInput(data);
    } catch (err) {
      console.error(err);
      alert("Prediction failed. Is the backend running?");
    }
    setLoading(false);
  };

  const handleReadmission = async (data: ReadmissionInput) => {
    setLoading(true);
    try {
      const result = await predictReadmission(data);
      setReadmResult(result);
      setReadmInput(data);
    } catch (err) {
      console.error(err);
      alert("Prediction failed. Is the backend running?");
    }
    setLoading(false);
  };

  const resetCHD = () => { setChdResult(null); setChdInput(null); };
  const resetReadm = () => { setReadmResult(null); setReadmInput(null); };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate("/")}
              className="text-sm text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1"
            >
              ← Back to Home
            </button>
            <h1 className="text-lg font-bold text-slate-900">Clinical Decision Support</h1>
            <div className="w-24" />
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 py-2">
            <button
              onClick={() => setTab("chd")}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition ${
                tab === "chd"
                  ? "bg-red-500 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              10-Year CHD Risk
            </button>
            <button
              onClick={() => setTab("readmission")}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition ${
                tab === "readmission"
                  ? "bg-red-500 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              30-Day Readmission Risk
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {tab === "chd" && (
          chdResult && chdInput
            ? <CHDResults result={chdResult} patientData={chdInput} onReset={resetCHD} />
            : <CHDForm onSubmit={handleCHD} loading={loading} />
        )}
        {tab === "readmission" && (
          readmResult && readmInput
            ? <ReadmissionResults result={readmResult} patientData={readmInput} onReset={resetReadm} />
            : <ReadmissionForm onSubmit={handleReadmission} loading={loading} />
        )}
      </div>
    </div>
  );
}
