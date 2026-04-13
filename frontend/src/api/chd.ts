import axios from "axios";
import type { CHDInput, CHDPrediction, CHDLIMEResult } from "../types/chd";

const API_BASE = "http://localhost:8000";

export async function predictCHD(data: CHDInput): Promise<CHDPrediction> {
  const res = await axios.post(`${API_BASE}/chd/predict`, data);
  return res.data;
}

export async function explainCHDLime(data: CHDInput): Promise<CHDLIMEResult> {
  const res = await axios.post(`${API_BASE}/chd/explain-lime`, data);
  return res.data;
}
