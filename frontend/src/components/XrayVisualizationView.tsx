"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Download,
  ImageOff,
} from "lucide-react";
import type { XrayPrediction, Finding } from "../types/types";

interface XrayVisualizationViewProps {
  prediction: XrayPrediction;
  onReset: () => void;
}

export default function XrayVisualizationView({
  prediction,
  onReset,
}: XrayVisualizationViewProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const isAbnormal = prediction.status === "ABNORMAL";
  const selected: Finding = prediction.findings[selectedIdx];
  const flaggedCount = prediction.findings.filter(
    (f) => f.probability >= prediction.threshold
  ).length;

  const handleDownload = () => {
    if (!selected.gradcam_plus_image) return;
    const link = document.createElement("a");
    link.href = selected.gradcam_plus_image;
    link.download = `${prediction.filename.split(".")[0]}_${selected.class_name.replace(/\s+/g, "_")}_gradcam_plus.png`;
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-red-500" />
          <h2 className="text-3xl font-black text-slate-900">
            Chest X-ray Screening
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleDownload}
            disabled={!selected.has_heatmaps}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold shadow-md transition ${
              selected.has_heatmaps
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            <Download className="w-5 h-5" />
            Download Grad-CAM++
          </button>

          <button
            onClick={onReset}
            className="px-5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors font-semibold shadow-sm"
          >
            Upload New X-ray
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className={`flex items-center gap-3 p-4 rounded-xl border-2 mb-6 ${
          isAbnormal
            ? "bg-red-50 border-red-200"
            : "bg-green-50 border-green-200"
        }`}
      >
        {isAbnormal ? (
          <AlertCircle className="w-7 h-7 text-red-600 flex-shrink-0" />
        ) : (
          <CheckCircle className="w-7 h-7 text-green-600 flex-shrink-0" />
        )}
        <div>
          <h3
            className={`text-xl font-bold ${isAbnormal ? "text-red-700" : "text-green-700"}`}
          >
            {isAbnormal ? "Abnormal Findings Detected" : "Normal Scan"}
          </h3>
          <p className="text-sm text-slate-600 mt-0.5">
            {isAbnormal
              ? `${flaggedCount} finding${flaggedCount > 1 ? "s" : ""} above ${(prediction.threshold * 100).toFixed(0)}% confidence threshold`
              : `No findings above ${(prediction.threshold * 100).toFixed(0)}% confidence threshold`}
          </p>
        </div>
      </motion.div>

      {/* Main content: Findings List + Image Panel */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-12 gap-6 mb-6"
      >
        {/* Findings list (left column) */}
        <div className="col-span-4 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-bold text-slate-700">
              Findings — ranked by probability
            </p>
          </div>
          <div className="divide-y divide-slate-50 max-h-[520px] overflow-y-auto">
            {prediction.findings.map((finding, idx) => {
              const isFlagged = finding.probability >= prediction.threshold;
              const isSelected = idx === selectedIdx;

              // Show separator before first below-threshold finding
              const prevFlagged =
                idx > 0 &&
                prediction.findings[idx - 1].probability >=
                  prediction.threshold;
              const showSep = !isFlagged && prevFlagged;

              return (
                <div key={finding.class_index}>
                  {showSep && (
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50">
                      <div className="flex-1 h-px bg-slate-300" />
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Below threshold
                      </span>
                      <div className="flex-1 h-px bg-slate-300" />
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedIdx(idx)}
                    className={`w-full text-left px-4 py-2.5 transition-colors ${
                      isSelected
                        ? "bg-red-50 border-l-4 border-red-500"
                        : "hover:bg-slate-50 border-l-4 border-transparent"
                    } ${!isFlagged ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-sm ${isFlagged ? "font-bold text-slate-900" : "font-medium text-slate-500"}`}
                      >
                        {finding.class_name}
                      </span>
                      <span
                        className={`text-sm font-mono ${
                          isFlagged ? "font-bold text-red-600" : "text-slate-400"
                        }`}
                      >
                        {(finding.probability * 100).toFixed(1)}%
                      </span>
                    </div>
                    {/* Probability bar */}
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isFlagged ? "bg-red-500" : "bg-slate-300"
                        }`}
                        style={{ width: `${finding.probability * 100}%` }}
                      />
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Image panel (right column) */}
        <div className="col-span-8">
          <div className="grid grid-cols-3 gap-4">
            {/* Original */}
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-bold text-slate-700">
                  Original X-ray
                </p>
              </div>
              <div className="p-3 bg-slate-50">
                <img
                  src={prediction.original_image}
                  alt="Original X-ray"
                  className="w-full h-auto rounded-lg"
                />
              </div>
            </div>

            {/* Grad-CAM */}
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-bold text-slate-700">
                  Grad-CAM:{" "}
                  <span className="text-red-500">{selected.class_name}</span>
                </p>
              </div>
              <div className="p-3 bg-slate-50">
                <AnimatePresence mode="wait">
                  {selected.has_heatmaps && selected.gradcam_image ? (
                    <motion.img
                      key={`gcam-${selected.class_index}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      src={selected.gradcam_image}
                      alt={`Grad-CAM: ${selected.class_name}`}
                      className="w-full h-auto rounded-lg"
                    />
                  ) : (
                    <motion.div
                      key="gcam-placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="aspect-square flex flex-col items-center justify-center text-slate-400 gap-2"
                    >
                      <ImageOff className="w-10 h-10" />
                      <p className="text-xs text-center px-4">
                        Heatmap not available — finding below confidence
                        threshold
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Grad-CAM++ */}
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-bold text-slate-700">
                  Grad-CAM++:{" "}
                  <span className="text-red-500">{selected.class_name}</span>
                </p>
              </div>
              <div className="p-3 bg-slate-50">
                <AnimatePresence mode="wait">
                  {selected.has_heatmaps && selected.gradcam_plus_image ? (
                    <motion.img
                      key={`gcampp-${selected.class_index}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      src={selected.gradcam_plus_image}
                      alt={`Grad-CAM++: ${selected.class_name}`}
                      className="w-full h-auto rounded-lg"
                    />
                  ) : (
                    <motion.div
                      key="gcampp-placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="aspect-square flex flex-col items-center justify-center text-slate-400 gap-2"
                    >
                      <ImageOff className="w-10 h-10" />
                      <p className="text-xs text-center px-4">
                        Heatmap not available — finding below confidence
                        threshold
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Heatmap explanation */}
          <p className="text-sm text-slate-500 mt-4 text-center">
            Red/yellow regions indicate areas the model focused on for{" "}
            <strong>{selected.class_name}</strong> detection. Click a different
            finding on the left to compare attention regions across pathologies.
          </p>
        </div>
      </motion.div>

      {/* Analysis Details */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="bg-white rounded-xl shadow-xl border border-slate-200 p-6"
      >
        <h3 className="text-xl font-bold text-slate-900 mb-3">
          Analysis Details
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Filename</span>
            <p className="font-medium text-slate-900 truncate">
              {prediction.filename}
            </p>
          </div>
          <div>
            <span className="text-slate-500">Model</span>
            <p className="font-medium text-slate-900">{prediction.model}</p>
          </div>
          <div>
            <span className="text-slate-500">Explainability</span>
            <p className="font-medium text-slate-900">
              Grad-CAM &amp; Grad-CAM++
            </p>
          </div>
          <div>
            <span className="text-slate-500">Target Layer</span>
            <p className="font-medium text-slate-900 font-mono text-xs">
              features.denseblock4
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          This tool is for research purposes only and is not a substitute for
          clinical diagnosis. Confidence threshold set at{" "}
          {(prediction.threshold * 100).toFixed(0)}%.
        </p>
      </motion.div>
    </motion.div>
  );
}
