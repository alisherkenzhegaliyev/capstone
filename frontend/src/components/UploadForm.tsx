"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import type { XrayPrediction } from "../types/types";
import type { HistoryEntry } from "../types/history";
import FileUploader from "./FileUploader";
import XrayVisualizationView from "./XrayVisualizationView";
import { predictXray } from "../api/api";
import { DotScreenShader } from "./DotScreenShader";
import { useAuth } from "../auth/AuthContext";
import { createHistoryId, saveHistoryEntry } from "../lib/history";

interface UploadFormProps {
  initialEntry?: Extract<HistoryEntry, { feature: "xray" }>;
}

export default function UploadForm({ initialEntry }: UploadFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [xrayPrediction, setXrayPrediction] = useState<XrayPrediction | null>(initialEntry?.prediction ?? null);

  useEffect(() => {
    setXrayPrediction(initialEntry?.prediction ?? null);
  }, [initialEntry]);

  async function handleUpload(file: File) {
    setLoading(true);
    setError(null);
    try {
      const prediction = await predictXray(file);
      setXrayPrediction(prediction);
      if (user?.email) {
        saveHistoryEntry(user.email, {
          id: createHistoryId(),
          createdAt: new Date().toISOString(),
          feature: "xray",
          prediction,
        });
      }
    } catch (err) {
      console.error(err);
      let message = "Upload failed. Please try again.";
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        if (typeof detail === "string" && detail.trim()) message = detail;
        else if (err.message) message = err.message;
      } else if (err instanceof Error && err.message) {
        message = err.message;
      }
      setError(message);
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
          {!xrayPrediction && (
            <>
              <FileUploader loading={loading} onUpload={handleUpload} />
              {error && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <span className="mt-0.5 shrink-0 text-base">⚠</span>
                  <span>{error}</span>
                </div>
              )}
            </>
          )}
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
