import axios from "axios";
import type { AnalyzeResponse, BatchAnalyzeResponse, XrayPrediction } from "../types/types";

const API_BASE = "http://localhost:8000";

export async function analyzePdf(file: File): Promise<AnalyzeResponse> {
  const formData = new FormData();
  formData.append("pdf_file", file);

  const res = await axios.post(`${API_BASE}/analyze`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
}

export async function analyzeBatch(file: File): Promise<BatchAnalyzeResponse> {
  const formData = new FormData();
  formData.append("zip_file", file);

  const res = await axios.post(`${API_BASE}/batch-analyze`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
}

// Get prediction for X-ray image
export async function predictXray(file: File): Promise<XrayPrediction> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await axios.post(`${API_BASE}/predict`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
}

// Get GradCAM visualization for X-ray image (returns image blob)
export async function visualizeXray(file: File): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await axios.post(`${API_BASE}/visualize`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    responseType: "blob", // Important: get binary data
  });

  return res.data;
}
