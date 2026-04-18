export interface ReadmissionInput {
  age_bracket: string;
  gender: string;
  race: string;
  admission_type_id: number;
  discharge_disposition_id: number;
  admission_source_id: number;
  medical_specialty: string;
  time_in_hospital: number;
  num_lab_procedures: number;
  num_procedures: number;
  num_medications: number;
  number_diagnoses: number;
  number_outpatient: number;
  number_emergency: number;
  number_inpatient: number;
  max_glu_serum: string;
  A1Cresult: string;
  diabetesMed: string;
  diag_1_cat: string;
  diag_2_cat: string;
  diag_3_cat: string;
  // Medications
  metformin: string;
  repaglinide: string;
  nateglinide: string;
  chlorpropamide: string;
  glimepiride: string;
  glipizide: string;
  glyburide: string;
  pioglitazone: string;
  rosiglitazone: string;
  acarbose: string;
  miglitol: string;
  insulin: string;
  glyburide_metformin: string;
  glipizide_metformin: string;
  glimepiride_pioglitazone: string;
  metformin_rosiglitazone: string;
  metformin_pioglitazone: string;
}

export interface SHAPFeature {
  feature: string;
  display_name: string;
  shap_value: number;
  direction: "increases" | "decreases";
}

export interface SHAPExplanation {
  base_value: number;
  features: SHAPFeature[];
}

export interface LIMEFeature {
  feature_desc: string;
  weight: number;
  direction: "increases" | "decreases";
}

export interface ReadmissionPrediction {
  probability: number;
  prediction: number;
  risk_level: "High" | "Medium" | "Low";
  shap_explanation: SHAPExplanation;
  summary: string | null;
}

export interface ReadmissionLIMEResult {
  probability: number;
  prediction: number;
  risk_level: "High" | "Medium" | "Low";
  lime_explanation: LIMEFeature[];
}
