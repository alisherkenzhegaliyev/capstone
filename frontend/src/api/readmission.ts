import type { ReadmissionInput, ReadmissionPrediction, ReadmissionLIMEResult } from "../types/readmission";
import { apiClient } from "./client";

export async function predictReadmission(data: ReadmissionInput): Promise<ReadmissionPrediction> {
  // Auto-derive 'change' field from medications
  const meds = [
    data.metformin, data.repaglinide, data.nateglinide, data.chlorpropamide,
    data.glimepiride, data.glipizide, data.glyburide, data.pioglitazone,
    data.rosiglitazone, data.acarbose, data.miglitol, data.insulin,
    data.glyburide_metformin, data.glipizide_metformin,
    data.glimepiride_pioglitazone, data.metformin_rosiglitazone, data.metformin_pioglitazone,
  ];
  const anyChanged = meds.some((m) => m === "Up" || m === "Down");

  const res = await apiClient.post("/readmission/predict", {
    ...data,
    change: anyChanged ? "Ch" : "No",
  });
  return res.data;
}

export async function explainReadmissionLime(data: ReadmissionInput): Promise<ReadmissionLIMEResult> {
  const meds = [
    data.metformin, data.repaglinide, data.nateglinide, data.chlorpropamide,
    data.glimepiride, data.glipizide, data.glyburide, data.pioglitazone,
    data.rosiglitazone, data.acarbose, data.miglitol, data.insulin,
    data.glyburide_metformin, data.glipizide_metformin,
    data.glimepiride_pioglitazone, data.metformin_rosiglitazone, data.metformin_pioglitazone,
  ];
  const anyChanged = meds.some((m) => m === "Up" || m === "Down");

  const res = await apiClient.post("/readmission/explain-lime", {
    ...data,
    change: anyChanged ? "Ch" : "No",
  });
  return res.data;
}
