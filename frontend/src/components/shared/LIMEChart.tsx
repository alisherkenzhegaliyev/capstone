// Feature name → human-readable label mapping
const DISPLAY_MAP: Record<string, string> = {
  // Demographics
  age_numeric: "Age", gender: "Gender (Male)",
  race_Caucasian: "Race: Caucasian", race_AfricanAmerican: "Race: African American",
  race_Hispanic: "Race: Hispanic", race_Asian: "Race: Asian",
  race_Other: "Race: Other", race_Unknown: "Race: Unknown",
  // CHD features
  age: "Age", sex: "Sex (Male)", total_cholesterol: "Total Cholesterol",
  systolic_bp: "Systolic Blood Pressure", smoking: "Current Smoker",
  diabetes: "Diabetes", bmi: "BMI", heart_rate: "Heart Rate",
  glucose: "Glucose Level", bp_meds: "BP Medications",
  prevalent_hypertension: "Hypertension", cigs_per_day: "Cigarettes/Day",
  pulse_pressure: "Pulse Pressure",
  // Hospital stay
  time_in_hospital: "Days in Hospital", num_lab_procedures: "Lab Procedures",
  num_procedures: "Procedures", num_medications: "Medications Count",
  number_diagnoses: "Number of Diagnoses",
  number_outpatient: "Prior Outpatient Visits", number_emergency: "Prior Emergency Visits",
  number_inpatient: "Prior Inpatient Visits", num_prior_visits: "Total Prior Visits",
  inpatient_ratio: "Inpatient Visit Ratio",
  A1Cresult: "HbA1c Result", max_glu_serum: "Max Glucose Serum",
  change: "Any Medication Changed", diabetesMed: "On Diabetes Medication",
  total_meds_prescribed: "Total Medications Prescribed",
  total_med_changes: "Total Medication Changes",
  procedures_per_day: "Procedures per Day", labs_per_day: "Lab Tests per Day",
  meds_per_day: "Medications per Day",
  // Medications
  insulin_prescribed: "Insulin Prescribed", metformin_prescribed: "Metformin Prescribed",
  glipizide_prescribed: "Glipizide Prescribed", glyburide_prescribed: "Glyburide Prescribed",
  pioglitazone_prescribed: "Pioglitazone Prescribed",
  // Discharge/admission
  discharge_disposition_id_1: "Discharged to Home",
  discharge_disposition_id_3: "Discharged to Skilled Nursing",
  discharge_disposition_id_6: "Discharged: Home w/ Health Service",
  discharge_disposition_id_7: "Left Against Medical Advice",
  discharge_disposition_id_22: "Discharged to Rehab",
  discharge_disposition_id_28: "Discharged to Hospice",
  admission_type_id_1: "Admission: Emergency", admission_type_id_2: "Admission: Urgent",
  admission_type_id_3: "Admission: Elective",
  admission_source_id_7: "Admitted from Emergency Dept",
  admission_source_id_1: "Admitted via Physician Referral",
  // Medical specialty
  medical_specialty_InternalMedicine: "Specialty: Internal Medicine",
  "medical_specialty_Emergency/Trauma": "Specialty: Emergency/Trauma",
  medical_specialty_Cardiology: "Specialty: Cardiology",
  "medical_specialty_Surgery-General": "Specialty: General Surgery",
  medical_specialty_Pulmonology: "Specialty: Pulmonology",
  medical_specialty_Unknown: "Specialty: Unknown",
  // Diagnoses
  diag_1_cat_Circulatory: "Primary Dx: Circulatory", diag_1_cat_Diabetes: "Primary Dx: Diabetes",
  diag_2_cat_Circulatory: "Secondary Dx: Circulatory", diag_2_cat_Diabetes: "Secondary Dx: Diabetes",
};

/**
 * Parse a LIME feature description like:
 *   "medical_specialty_Urology <= 0.00"  → { name: "medical_specialty_Urology", present: false }
 *   "race_Unknown > 0.00"                → { name: "race_Unknown", present: true }
 *   "num_inpatient > 1.50"               → { name: "num_inpatient", condition: "> 1.50" }
 */
function parseLimeDesc(desc: string): { label: string; context: string } {
  // Extract feature name (everything before the operator)
  const match = desc.match(/^(.+?)\s*(<=|>=|>|<)\s*([\d.]+)$/);
  if (!match) return { label: desc, context: "" };

  const [, rawFeature, op, val] = match;
  const feature = rawFeature.trim();
  const threshold = parseFloat(val);

  // Try to get a human-readable name
  const displayName =
    DISPLAY_MAP[feature] ??
    // Auto-humanize: "medical_specialty_Neurology" → "Specialty: Neurology"
    (() => {
      if (feature.startsWith("medical_specialty_"))
        return `Specialty: ${feature.replace("medical_specialty_", "").replace(/_/g, " ")}`;
      if (feature.startsWith("race_"))
        return `Race: ${feature.replace("race_", "")}`;
      if (feature.startsWith("diag_1_cat_"))
        return `Primary Dx: ${feature.replace("diag_1_cat_", "")}`;
      if (feature.startsWith("diag_2_cat_"))
        return `Secondary Dx: ${feature.replace("diag_2_cat_", "")}`;
      if (feature.startsWith("diag_3_cat_"))
        return `Tertiary Dx: ${feature.replace("diag_3_cat_", "")}`;
      if (feature.startsWith("discharge_disposition_id_"))
        return `Discharge disposition #${feature.replace("discharge_disposition_id_", "")}`;
      if (feature.startsWith("admission_type_id_"))
        return `Admission type #${feature.replace("admission_type_id_", "")}`;
      if (feature.startsWith("admission_source_id_"))
        return `Admission source #${feature.replace("admission_source_id_", "")}`;
      if (feature.endsWith("_prescribed"))
        return `${feature.replace("_prescribed", "").replace(/_/g, " ")} prescribed`;
      if (feature.endsWith("_changed"))
        return `${feature.replace("_changed", "").replace(/_/g, " ")} dose changed`;
      return feature.replace(/_/g, " ");
    })();

  // Build context string
  // For binary features (threshold near 0): show presence/absence
  const isBinary = threshold <= 0.5;
  let context = "";
  if (isBinary) {
    const isPresent = op === ">" || op === ">=";
    context = isPresent ? "present" : "not present";
  } else {
    context = `${op} ${val}`;
  }

  return { label: displayName, context };
}

interface LIMEFeature {
  feature_desc: string;
  weight: number;
  direction: "increases" | "decreases";
}

interface LIMEChartProps {
  features: LIMEFeature[];
  title?: string;
}

export default function LIMEChart({ features, title = "LIME Explanation" }: LIMEChartProps) {
  // Filter out near-zero noise (< 0.5% of max) and absent-binary noise
  const NOISE_THRESHOLD = 0.005;
  const meaningful = features.filter((f) => Math.abs(f.weight) >= NOISE_THRESHOLD);

  if (!meaningful.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-500">No significant local factors identified.</p>
      </div>
    );
  }

  const maxAbs = Math.max(...meaningful.map((f) => Math.abs(f.weight)), 0.001);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>
      <p className="text-sm text-slate-500 mb-5">
        LIME builds a simple local model around this patient to explain the prediction.
        Each factor shows how much it pushes the risk up or down <em>for this specific patient</em>.
        Minor factors (&lt;0.5% influence) are hidden.
      </p>

      <div className="space-y-4">
        {meaningful.map((f, i) => {
          const { label, context } = parseLimeDesc(f.feature_desc);
          const pct = (Math.abs(f.weight) / maxAbs) * 100;
          const isPositive = f.weight > 0;

          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`shrink-0 w-2 h-2 rounded-full ${isPositive ? "bg-red-400" : "bg-blue-400"}`}
                  />
                  <span className="text-sm font-medium text-slate-800 truncate" title={label}>
                    {label}
                  </span>
                  {context && (
                    <span className="shrink-0 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {context}
                    </span>
                  )}
                </div>
                <span
                  className={`shrink-0 text-xs font-semibold ml-3 ${isPositive ? "text-red-600" : "text-blue-600"}`}
                >
                  {isPositive ? "▲" : "▼"} {isPositive ? "+" : ""}
                  {f.weight.toFixed(3)}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${isPositive ? "bg-red-400" : "bg-blue-400"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isPositive
                  ? `This factor increases predicted risk`
                  : `This factor decreases predicted risk`}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex gap-6 mt-5 pt-4 border-t border-slate-100 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
          Increases risk
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />
          Decreases risk
        </span>
      </div>
    </div>
  );
}
