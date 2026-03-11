"use client";

import { motion } from "framer-motion";
import { Activity, AlertCircle, CheckCircle, Download } from "lucide-react";
import type { XrayPrediction } from "../types/api";

interface XrayVisualizationViewProps {
  prediction: XrayPrediction;
  visualizationUrl: string;
  onReset: () => void;
}

export default function XrayVisualizationView({
  prediction,
  visualizationUrl,
  onReset,
}: XrayVisualizationViewProps) {
  const isPneumonia = prediction.is_pneumonia;

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = visualizationUrl;
    link.download = `${prediction.filename.split(".")[0]}_gradcam_visualization.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-red-500" />
          <h2 className="text-3xl font-black text-slate-900">
            X-ray Analysis Complete
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white font-semibold shadow-md transition"
          >
            <Download className="w-5 h-5" />
            Download Visualization
          </button>

          <button
            onClick={onReset}
            className="px-6 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors font-semibold shadow-sm"
          >
            Upload New X-ray
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Visualization Image */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden"
        >
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-xl font-bold text-slate-900">
              GradCAM Visualization
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Heatmap showing model attention regions
            </p>
          </div>
          <div className="p-4 bg-slate-50">
            <img
              src={visualizationUrl}
              alt="GradCAM Visualization"
              className="w-full h-auto rounded-lg shadow-md"
            />
          </div>
        </motion.div>

        {/* Right: Prediction Results */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          {/* Diagnosis Card */}
          <div
            className={`p-6 rounded-xl border-2 ${
              isPneumonia
                ? "bg-red-50 border-red-200"
                : "bg-green-50 border-green-200"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              {isPneumonia ? (
                <AlertCircle className="w-8 h-8 text-red-600" />
              ) : (
                <CheckCircle className="w-8 h-8 text-green-600" />
              )}
              <div>
                <h3 className="text-2xl font-bold text-slate-900">
                  {isPneumonia ? "Pneumonia Detected" : "Normal X-ray"}
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Based on BiomedCLIP analysis
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">
                  Top Prediction:
                </span>
                <span className="text-slate-900 font-bold">
                  {prediction.top_prediction.label}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">Confidence:</span>
                <span
                  className={`text-xl font-black ${
                    isPneumonia ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {(prediction.top_prediction.confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* All Predictions */}
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              All Predictions
            </h3>
            <div className="space-y-3">
              {prediction.all_predictions.map((pred, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700">
                      {pred.label}
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {(pred.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pred.confidence * 100}%` }}
                      transition={{ duration: 0.5, delay: 0.1 * idx }}
                      className={`h-full rounded-full ${
                        idx === 0 ? "bg-red-500" : "bg-slate-400"
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Image Info */}
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-3">
              Image Information
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Filename:</span>
                <span className="text-slate-900 font-medium">
                  {prediction.filename}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Model:</span>
                <span className="text-slate-900 font-medium">BiomedCLIP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Analysis Type:</span>
                <span className="text-slate-900 font-medium">
                  Zero-shot Classification + GradCAM
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
