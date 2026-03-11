import { useState } from "react";
import type { ReadmissionInput } from "../../types/readmission";

interface ReadmissionFormProps {
  onSubmit: (data: ReadmissionInput) => void;
  loading: boolean;
}

const AGE_BRACKETS = ["[0-10]", "[10-20]", "[20-30]", "[30-40]", "[40-50]", "[50-60]", "[60-70]", "[70-80]", "[80-90]", "[90-100]"];
const DIAG_CATEGORIES = ["Circulatory", "Diabetes", "Digestive", "External", "Genitourinary", "Injury", "Musculoskeletal", "Neoplasms", "Other", "Respiratory"];
const MED_OPTIONS = ["No", "Steady", "Up", "Down"];

const ADMISSION_TYPES = [
  { id: 1, label: "Emergency" }, { id: 2, label: "Urgent" }, { id: 3, label: "Elective" },
  { id: 4, label: "Newborn" }, { id: 5, label: "Not Available" }, { id: 6, label: "NULL" },
  { id: 7, label: "Trauma Center" }, { id: 8, label: "Not Mapped" },
];

const DISCHARGE_DISPOSITIONS = [
  { id: 1, label: "Discharged to Home" }, { id: 2, label: "Short-term Hospital" },
  { id: 3, label: "Skilled Nursing Facility" }, { id: 5, label: "Not Available" },
  { id: 6, label: "Home w/ Health Service" }, { id: 7, label: "Left AMA" },
  { id: 18, label: "Home IV Therapy" }, { id: 22, label: "Rehab Facility" },
  { id: 25, label: "Psychiatric Facility" }, { id: 28, label: "Hospice" },
];

const ADMISSION_SOURCES = [
  { id: 1, label: "Physician Referral" }, { id: 2, label: "Clinic Referral" },
  { id: 3, label: "HMO Referral" }, { id: 4, label: "Transfer from Hospital" },
  { id: 7, label: "Emergency Department" }, { id: 6, label: "Transfer from SNF" },
];

const COMMON_SPECIALTIES = [
  "InternalMedicine", "Emergency/Trauma", "Cardiology", "Surgery-General",
  "Pulmonology", "Gastroenterology", "Neurology", "Nephrology",
  "Orthopedics", "Family/GeneralPractice", "Oncology", "Hematology/Oncology",
  "Endocrinology", "Psychiatry", "Urology", "Unknown",
];

const COMMON_MEDS = ["metformin", "insulin", "glipizide", "glyburide", "pioglitazone"] as const;
const RARE_MEDS = [
  "repaglinide", "nateglinide", "chlorpropamide", "glimepiride",
  "rosiglitazone", "acarbose", "miglitol",
  "glyburide_metformin", "glipizide_metformin",
  "glimepiride_pioglitazone", "metformin_rosiglitazone", "metformin_pioglitazone",
] as const;

const MED_DISPLAY: Record<string, string> = {
  metformin: "Metformin", insulin: "Insulin", glipizide: "Glipizide",
  glyburide: "Glyburide", pioglitazone: "Pioglitazone",
  repaglinide: "Repaglinide", nateglinide: "Nateglinide",
  chlorpropamide: "Chlorpropamide", glimepiride: "Glimepiride",
  rosiglitazone: "Rosiglitazone", acarbose: "Acarbose", miglitol: "Miglitol",
  glyburide_metformin: "Glyburide-Metformin", glipizide_metformin: "Glipizide-Metformin",
  glimepiride_pioglitazone: "Glimepiride-Pioglitazone",
  metformin_rosiglitazone: "Metformin-Rosiglitazone",
  metformin_pioglitazone: "Metformin-Pioglitazone",
};

const DEFAULT_FORM: ReadmissionInput = {
  age_bracket: "[50-60]", gender: "Male", race: "Unknown",
  admission_type_id: 1, discharge_disposition_id: 1, admission_source_id: 7,
  medical_specialty: "Unknown",
  time_in_hospital: 3, num_lab_procedures: 40, num_procedures: 1,
  num_medications: 15, number_diagnoses: 7,
  number_outpatient: 0, number_emergency: 0, number_inpatient: 0,
  max_glu_serum: "None", A1Cresult: "None", diabetesMed: "No",
  diag_1_cat: "Other", diag_2_cat: "Other", diag_3_cat: "Other",
  metformin: "No", repaglinide: "No", nateglinide: "No", chlorpropamide: "No",
  glimepiride: "No", glipizide: "No", glyburide: "No", pioglitazone: "No",
  rosiglitazone: "No", acarbose: "No", miglitol: "No", insulin: "No",
  glyburide_metformin: "No", glipizide_metformin: "No",
  glimepiride_pioglitazone: "No", metformin_rosiglitazone: "No", metformin_pioglitazone: "No",
};

function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 text-sm font-semibold text-slate-700 hover:bg-slate-100"
      >
        {title}
        <span className="text-lg">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string | number;
  onChange: (v: string) => void;
  options: { value: string | number; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function NumberField({ label, value, onChange, min = 0, max = 999 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type="number" min={min} max={max} value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
      />
    </div>
  );
}

export default function ReadmissionForm({ onSubmit, loading }: ReadmissionFormProps) {
  const [form, setForm] = useState<ReadmissionInput>({ ...DEFAULT_FORM });
  const [showRareMeds, setShowRareMeds] = useState(false);

  const set = <K extends keyof ReadmissionInput>(key: K, value: ReadmissionInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <h2 className="text-xl font-bold text-slate-900 mb-2">Patient Information</h2>

      {/* Demographics */}
      <Section title="Demographics">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectField label="Age Bracket" value={form.age_bracket}
            onChange={(v) => set("age_bracket", v)}
            options={AGE_BRACKETS.map((b) => ({ value: b, label: b }))} />
          <SelectField label="Gender" value={form.gender}
            onChange={(v) => set("gender", v)}
            options={[{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }]} />
          <SelectField label="Race" value={form.race}
            onChange={(v) => set("race", v)}
            options={["Caucasian", "AfricanAmerican", "Hispanic", "Asian", "Other", "Unknown"].map((r) => ({ value: r, label: r.replace("AfricanAmerican", "African American") }))} />
        </div>
      </Section>

      {/* Admission Info */}
      <Section title="Admission Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField label="Admission Type" value={form.admission_type_id}
            onChange={(v) => set("admission_type_id", +v)}
            options={ADMISSION_TYPES.map((a) => ({ value: a.id, label: a.label }))} />
          <SelectField label="Discharge Disposition" value={form.discharge_disposition_id}
            onChange={(v) => set("discharge_disposition_id", +v)}
            options={DISCHARGE_DISPOSITIONS.map((d) => ({ value: d.id, label: d.label }))} />
          <SelectField label="Admission Source" value={form.admission_source_id}
            onChange={(v) => set("admission_source_id", +v)}
            options={ADMISSION_SOURCES.map((a) => ({ value: a.id, label: a.label }))} />
          <SelectField label="Medical Specialty" value={form.medical_specialty}
            onChange={(v) => set("medical_specialty", v)}
            options={COMMON_SPECIALTIES.map((s) => ({ value: s, label: s.replace(/([A-Z])/g, " $1").trim() }))} />
        </div>
      </Section>

      {/* Hospital Stay */}
      <Section title="Hospital Stay">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NumberField label="Days in Hospital" value={form.time_in_hospital} onChange={(v) => set("time_in_hospital", v)} min={1} max={14} />
          <NumberField label="Lab Procedures" value={form.num_lab_procedures} onChange={(v) => set("num_lab_procedures", v)} />
          <NumberField label="Procedures (non-lab)" value={form.num_procedures} onChange={(v) => set("num_procedures", v)} />
          <NumberField label="Medications Count" value={form.num_medications} onChange={(v) => set("num_medications", v)} />
          <NumberField label="Number of Diagnoses" value={form.number_diagnoses} onChange={(v) => set("number_diagnoses", v)} />
        </div>
      </Section>

      {/* Prior Visits */}
      <Section title="Prior Visit History (past year)">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NumberField label="Outpatient Visits" value={form.number_outpatient} onChange={(v) => set("number_outpatient", v)} />
          <NumberField label="Emergency Visits" value={form.number_emergency} onChange={(v) => set("number_emergency", v)} />
          <NumberField label="Inpatient Visits" value={form.number_inpatient} onChange={(v) => set("number_inpatient", v)} />
        </div>
      </Section>

      {/* Lab Results */}
      <Section title="Lab Results">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField label="Max Glucose Serum" value={form.max_glu_serum}
            onChange={(v) => set("max_glu_serum", v)}
            options={[{ value: "None", label: "Not tested" }, { value: "Norm", label: "Normal" }, { value: ">200", label: ">200 mg/dL" }, { value: ">300", label: ">300 mg/dL" }]} />
          <SelectField label="HbA1c (A1C Result)" value={form.A1Cresult}
            onChange={(v) => set("A1Cresult", v)}
            options={[{ value: "None", label: "Not tested" }, { value: "Norm", label: "Normal" }, { value: ">7", label: ">7%" }, { value: ">8", label: ">8%" }]} />
        </div>
      </Section>

      {/* Diagnoses */}
      <Section title="Diagnosis Categories">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectField label="Primary Diagnosis" value={form.diag_1_cat}
            onChange={(v) => set("diag_1_cat", v)}
            options={DIAG_CATEGORIES.map((c) => ({ value: c, label: c }))} />
          <SelectField label="Secondary Diagnosis" value={form.diag_2_cat}
            onChange={(v) => set("diag_2_cat", v)}
            options={DIAG_CATEGORIES.map((c) => ({ value: c, label: c }))} />
          <SelectField label="Additional Diagnosis" value={form.diag_3_cat}
            onChange={(v) => set("diag_3_cat", v)}
            options={DIAG_CATEGORIES.map((c) => ({ value: c, label: c }))} />
        </div>
      </Section>

      {/* Medications */}
      <Section title="Medications" defaultOpen={false}>
        <div className="mb-3">
          <SelectField label="On Diabetes Medication" value={form.diabetesMed}
            onChange={(v) => set("diabetesMed", v)}
            options={[{ value: "No", label: "No" }, { value: "Yes", label: "Yes" }]} />
        </div>
        <p className="text-xs text-slate-500 mb-3">For each medication: No = not prescribed, Steady = unchanged, Up = dose increased, Down = dose decreased</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {COMMON_MEDS.map((med) => (
            <SelectField key={med} label={MED_DISPLAY[med]} value={form[med]}
              onChange={(v) => set(med, v)}
              options={MED_OPTIONS.map((o) => ({ value: o, label: o }))} />
          ))}
        </div>
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowRareMeds(!showRareMeds)}
            className="text-sm text-red-500 hover:text-red-600 font-medium"
          >
            {showRareMeds ? "Hide additional medications" : "Show all medications..."}
          </button>
        </div>
        {showRareMeds && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
            {RARE_MEDS.map((med) => (
              <SelectField key={med} label={MED_DISPLAY[med]} value={form[med]}
                onChange={(v) => set(med, v)}
                options={MED_OPTIONS.map((o) => ({ value: o, label: o }))} />
            ))}
          </div>
        )}
      </Section>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Analyzing..." : "Assess Readmission Risk"}
      </button>
    </form>
  );
}
