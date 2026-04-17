"use client";

import { useState } from "react";
import axios from "axios";
import type { XrayPrediction } from "../types/types";
import FileUploader from "./FileUploader";
import XrayVisualizationView from "./XrayVisualizationView";
import { predictXray } from "../api/api";
import { DotScreenShader } from "./DotScreenShader";

export default function UploadForm() {
  const [loading, setLoading] = useState(false);
  const [xrayPrediction, setXrayPrediction] = useState<XrayPrediction | null>(null);

  async function handleUpload(file: File) {
    setLoading(true);
    try {
      const prediction = await predictXray(file);
      setXrayPrediction(prediction);
    } catch (err) {
      console.error(err);

      let errorMessage = "Upload failed. Please try again.";

      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        if (typeof detail === "string" && detail.trim()) {
          errorMessage = detail;
        } else if (err.message) {
          errorMessage = err.message;
        }
      } else if (err instanceof Error && err.message) {
        errorMessage = err.message;
      }

      alert(errorMessage);
    }
    setLoading(false);
  }

  function handleReset() {
    setXrayPrediction(null);
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 relative">
      {!xrayPrediction && (
        <>
          <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <DotScreenShader
              bgColor="#ffffff"
              dotColor="#9ca3af"
              dotOpacity={0.15}
              enableMouseTrail={false}
              fillEntireScreen={true}
            />
          </div>

          {/* Top gradient fade */}
        </>
      )}
      <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-[#fef3c7] to-transparent z-[5]"></div>

      <div className="px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <div className="max-w-7xl mx-auto">
          {!xrayPrediction && <FileUploader loading={loading} onUpload={handleUpload} />}
          {xrayPrediction && (
            <XrayVisualizationView
              prediction={xrayPrediction}
              onReset={handleReset}
            />
          )}
        </div>
      </div>
    </div>
  );
}
