import type { AnalyzeResponse, BatchAnalyzeResponse, XrayPrediction } from "../types/types";
import { apiClient } from "./client";

export async function analyzePdf(file: File): Promise<AnalyzeResponse> {
  const formData = new FormData();
  formData.append("pdf_file", file);

  const res = await apiClient.post("/analyze", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
}

export async function analyzeBatch(file: File): Promise<BatchAnalyzeResponse> {
  const formData = new FormData();
  formData.append("zip_file", file);

  const res = await apiClient.post("/batch-analyze", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
}

// Screen chest X-ray for 14 pathologies using CheXNet.
// Returns status, ranked findings with per-finding Grad-CAM heatmaps,
// and the original image as base64 PNG.
export async function predictXray(file: File): Promise<XrayPrediction> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await apiClient.post("/predict", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
}
