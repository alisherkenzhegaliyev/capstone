import { useState } from "react";
import type { CHDInput } from "../../types/chd";

interface CHDFormProps {
  onSubmit: (data: CHDInput) => void;
  loading: boolean;
}

export default function CHDForm({ onSubmit, loading }: CHDFormProps) {
  const [form, setForm] = useState<CHDInput>({
    age: 55,
    sex: 1,
    total_cholesterol: 220,
    systolic_bp: 130,
    smoking: 0,
    diabetes: 0,
    bmi: 27.5,
    heart_rate: 75,
    glucose: 95,
    bp_meds: 0,
    prevalent_hypertension: 0,
    cigs_per_day: 0,
    pulse_pressure: 42,
  });

  const [diastolic, setDiastolic] = useState(88);

  const setField = (field: keyof CHDInput, value: number) => {
    const updated = { ...form, [field]: value };
    // Auto-derive pulse pressure
    if (field === "systolic_bp") {
      updated.pulse_pressure = value - diastolic;
    }
    // Auto-set cigs to 0 when non-smoker
    if (field === "smoking" && value === 0) {
      updated.cigs_per_day = 0;
    }
    setForm(updated);
  };

  const handleDiastolic = (val: number) => {
    setDiastolic(val);
    setForm((prev) => ({ ...prev, pulse_pressure: prev.systolic_bp - val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-xl font-bold text-slate-900 mb-6">Patient Information</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Age */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Age (years)</label>
          <input
            type="number" min={20} max={100} value={form.age}
            onChange={(e) => setField("age", +e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          />
        </div>

        {/* Sex */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Sex</label>
          <div className="flex gap-2">
            {[{ label: "Male", val: 1 }, { label: "Female", val: 0 }].map((opt) => (
              <button
                key={opt.val} type="button"
                onClick={() => setField("sex", opt.val)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                  form.sex === opt.val
                    ? "bg-red-500 text-white border-red-500"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Total Cholesterol */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Total Cholesterol (mg/dL)</label>
          <input
            type="number" min={100} max={600} value={form.total_cholesterol}
            onChange={(e) => setField("total_cholesterol", +e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          />
        </div>

        {/* Systolic BP */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Systolic BP (mmHg)</label>
          <input
            type="number" min={80} max={250} value={form.systolic_bp}
            onChange={(e) => setField("systolic_bp", +e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          />
        </div>

        {/* Diastolic BP (helper) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Diastolic BP (mmHg)</label>
          <input
            type="number" min={40} max={150} value={diastolic}
            onChange={(e) => handleDiastolic(+e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          />
          <span className="text-xs text-slate-400">Pulse pressure: {form.pulse_pressure}</span>
        </div>

        {/* BMI */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">BMI</label>
          <input
            type="number" step={0.1} min={10} max={60} value={form.bmi}
            onChange={(e) => setField("bmi", +e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          />
        </div>

        {/* Heart Rate */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Heart Rate (bpm)</label>
          <input
            type="number" min={40} max={200} value={form.heart_rate}
            onChange={(e) => setField("heart_rate", +e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          />
        </div>

        {/* Glucose */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Glucose (mg/dL)</label>
          <input
            type="number" min={40} max={400} value={form.glucose}
            onChange={(e) => setField("glucose", +e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          />
        </div>

        {/* Smoking */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Current Smoker</label>
          <div className="flex gap-2">
            {[{ label: "No", val: 0 }, { label: "Yes", val: 1 }].map((opt) => (
              <button
                key={opt.val} type="button"
                onClick={() => setField("smoking", opt.val)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                  form.smoking === opt.val
                    ? "bg-red-500 text-white border-red-500"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cigs per day */}
        {form.smoking === 1 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cigarettes/Day</label>
            <input
              type="number" min={0} max={80} value={form.cigs_per_day}
              onChange={(e) => setField("cigs_per_day", +e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
            />
          </div>
        )}

        {/* Diabetes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Diabetes</label>
          <div className="flex gap-2">
            {[{ label: "No", val: 0 }, { label: "Yes", val: 1 }].map((opt) => (
              <button
                key={opt.val} type="button"
                onClick={() => setField("diabetes", opt.val)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                  form.diabetes === opt.val
                    ? "bg-red-500 text-white border-red-500"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* BP Meds */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">On BP Medications</label>
          <div className="flex gap-2">
            {[{ label: "No", val: 0 }, { label: "Yes", val: 1 }].map((opt) => (
              <button
                key={opt.val} type="button"
                onClick={() => setField("bp_meds", opt.val)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                  form.bp_meds === opt.val
                    ? "bg-red-500 text-white border-red-500"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Hypertension */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Prevalent Hypertension</label>
          <div className="flex gap-2">
            {[{ label: "No", val: 0 }, { label: "Yes", val: 1 }].map((opt) => (
              <button
                key={opt.val} type="button"
                onClick={() => setField("prevalent_hypertension", opt.val)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                  form.prevalent_hypertension === opt.val
                    ? "bg-red-500 text-white border-red-500"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full py-3 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Analyzing..." : "Assess Risk"}
      </button>
    </form>
  );
}
