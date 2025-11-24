import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import type { PageResult } from "../types/types";

interface PageResultCardProps {
  page: PageResult;
  index: number;
}

export default function PageResultCard({ page, index }: PageResultCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"
    >
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-red-500" />
          <h3 className="text-xl font-bold text-slate-900">Page {page.page_index}</h3>
          <span className="ml-auto text-sm text-slate-600 font-medium">
            {page.detections.length} detection
            {page.detections.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 p-6">
        {/* Image Preview */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
            Annotated Image
          </h4>
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <img
              src={`http://localhost:8000${page.annotated_image_url}`}
              alt={`Page ${page.page_index} annotations`}
              className="w-full h-auto rounded"
            />
          </div>
        </div>

        {/* Detections */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
            Detections
          </h4>
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200 max-h-[600px] overflow-auto">
            <pre className="text-sm text-slate-800 font-mono whitespace-pre-wrap break-words">
              {JSON.stringify(page.detections, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
