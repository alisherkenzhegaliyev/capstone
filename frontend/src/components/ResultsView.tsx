"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Download, Copy, Check } from "lucide-react";
import type { AnalyzeResponse } from "../types/types";
import PageResultCard from "./PageResultCard";

interface ResultsViewProps {
  result: AnalyzeResponse;
  onReset: () => void;
}

export default function ResultsView({ result, onReset }: ResultsViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyJson = () => {
    const jsonString = JSON.stringify(result.result, null, 2);
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
            Analysis Complete
          </h2>
        </div>

        {/* RIGHT SIDE — Buttons */}
        <div className="flex items-center gap-4">
          <a
            href={`http://localhost:8000${result.annotated_pdf_url}`}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white font-semibold shadow-md transition [&>*]:text-white !text-white"
          >
            <Download className="w-5 h-5 text-white" />
            Download PDF
          </a>

          {/* COPY JSON BUTTON */}
          <button
            onClick={handleCopyJson}
            className="flex items-center gap-2 px-6 py-2 bg-slate-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold shadow-sm transition"
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

          {/* DOWNLOAD PDF BUTTON */}

          {/* RESET BUTTON */}
          <button
            onClick={onReset}
            className="px-6 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors font-semibold shadow-sm"
          >
            Upload New File
          </button>
        </div>
      </div>

      {/* PAGE RESULTS */}
      <div className="grid gap-8 lg:grid-cols-1">
        {result.pages.map((page, idx) => (
          <PageResultCard key={page.page_index} page={page} index={idx} />
        ))}
      </div>
    </motion.div>
  );
}
