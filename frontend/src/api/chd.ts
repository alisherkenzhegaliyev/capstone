import type { CHDInput, CHDPrediction, CHDLIMEResult } from "../types/chd";
import { apiClient } from "./client";

export async function predictCHD(data: CHDInput): Promise<CHDPrediction> {
  const res = await apiClient.post("/chd/predict", data);
  return res.data;
}

export async function explainCHDLime(data: CHDInput): Promise<CHDLIMEResult> {
  const res = await apiClient.post("/chd/explain-lime", data);
  return res.data;
}
