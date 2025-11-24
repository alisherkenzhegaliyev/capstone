"use client";

import { useState } from "react";
import type { AnalyzeResponse, BatchAnalyzeResponse, XrayPrediction } from "../types/types";
import FileUploader from "./FileUploader";
import ResultsView from "./ResultsView";
import BatchResultsView from "./BatchResultsView";
import XrayVisualizationView from "./XrayVisualizationView";
import { analyzePdf, analyzeBatch, predictXray, visualizeXray } from "../api/api";
import { DotScreenShader } from "./DotScreenShader";

export default function UploadForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [batchResult, setBatchResult] = useState<BatchAnalyzeResponse | null>(
    null
  );
  const [xrayPrediction, setXrayPrediction] = useState<XrayPrediction | null>(null);
  const [xrayVisualization, setXrayVisualization] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setLoading(true);
    try {
      const isZip = file.type === "application/zip" || file.name.endsWith(".zip");
      const isImage = file.type.startsWith("image/") || 
                      [".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif"].some(ext => 
                        file.name.toLowerCase().endsWith(ext));

      if (isImage) {
        // Process X-ray image
        const [prediction, visualizationBlob] = await Promise.all([
          predictXray(file),
          visualizeXray(file)
        ]);
        
        // Create object URL for visualization image
        const visualizationUrl = URL.createObjectURL(visualizationBlob);
        
        setXrayPrediction(prediction);
        setXrayVisualization(visualizationUrl);
        setResult(null);
        setBatchResult(null);
      } else if (isZip) {
        const data = await analyzeBatch(file);
        setBatchResult(data);
        setResult(null);
        setXrayPrediction(null);
        setXrayVisualization(null);
      } else {
        const data = await analyzePdf(file);
        setResult(data);
        setBatchResult(null);
        setXrayPrediction(null);
        setXrayVisualization(null);
      }
    } catch (err) {
      console.error(err);
      alert("Upload failed. Please try again.");
    }
    setLoading(false);
  }

  function handleReset() {
    // Revoke object URL to prevent memory leaks
    if (xrayVisualization) {
      URL.revokeObjectURL(xrayVisualization);
    }
    setResult(null);
    setBatchResult(null);
    setXrayPrediction(null);
    setXrayVisualization(null);
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 relative">
      {!result && !batchResult && !xrayPrediction && (
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
          {!result && !batchResult && !xrayPrediction && (
            <FileUploader loading={loading} onUpload={handleUpload} />
          )}
          {result && <ResultsView result={result} onReset={handleReset} />}
          {batchResult && (
            <BatchResultsView result={batchResult} onReset={handleReset} />
          )}
          {xrayPrediction && xrayVisualization && (
            <XrayVisualizationView
              prediction={xrayPrediction}
              visualizationUrl={xrayVisualization}
              onReset={handleReset}
            />
          )}
        </div>
      </div>
    </div>
  );
}
