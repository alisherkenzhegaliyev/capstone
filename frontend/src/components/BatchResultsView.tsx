"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Copy, Check } from "lucide-react";
import type { BatchAnalyzeResponse } from "../types/types";

interface BatchResultsViewProps {
  result: BatchAnalyzeResponse;
  onReset: () => void;
}

export default function BatchResultsView({
  result,
  onReset,
}: BatchResultsViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const jsonString = JSON.stringify(result, null, 2);
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-8">
        {/* LEFT SIDE — Title */}
        <div className="flex items-center gap-3">
          <CheckCircle className="w-8 h-8 text-red-500" />
          <h2 className="text-3xl font-black text-slate-900">
            Batch Analysis Complete
          </h2>
        </div>

        {/* RIGHT SIDE — Buttons */}
        <div className="flex items-center gap-4">
          {/* COPY BUTTON */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold shadow-sm transition"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Copy JSON
              </>
            )}
          </button>

          {/* RESET BUTTON */}
          <button
            onClick={onReset}
            className="px-6 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors font-semibold shadow-sm"
          >
            Upload New File
          </button>
        </div>
      </div>

      {/* INFO SECTION */}
      <div className="mb-6 p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-slate-500">Job ID:</span>{" "}
            <span className="text-slate-900 font-mono">{result.job_id}</span>
          </div>
          <div>
            <span className="text-slate-500">Files Processed:</span>{" "}
            <span className="text-slate-900 font-semibold">
              {result.files_processed}
            </span>
          </div>
        </div>
      </div>

      {/* JSON DISPLAY */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-xl font-bold text-slate-900">
            Analysis Results (JSON)
          </h3>
        </div>

        <div className="p-6">
          <div className="bg-amber-50 rounded-lg p-6 border border-amber-200 max-h-[70vh] overflow-auto">
            <pre className="text-sm text-slate-800 font-mono whitespace-pre-wrap break-words">
              {JSON.stringify(result.result, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
