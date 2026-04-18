export interface CHDInput {
  age: number;
  sex: number;
  total_cholesterol: number;
  systolic_bp: number;
  smoking: number;
  diabetes: number;
  bmi: number;
  heart_rate: number;
  glucose: number;
  bp_meds: number;
  prevalent_hypertension: number;
  cigs_per_day: number;
  pulse_pressure: number;
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

export interface CHDPrediction {
  probability: number;
  prediction: number;
  risk_level: "High" | "Low";
  shap_explanation: SHAPExplanation;
  summary: string | null;
}

export interface CHDLIMEResult {
  probability: number;
  prediction: number;
  risk_level: "High" | "Low";
  lime_explanation: LIMEFeature[];
}
