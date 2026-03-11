"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { IconUpload } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";
import { cn } from "../lib/utils.ts";
import { Loader2 } from "lucide-react";

const mainVariant = {
  initial: {
    x: 0,
    y: 0,
  },
  animate: {
    x: 20,
    y: -20,
    opacity: 0.9,
  },
};

const secondaryVariant = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
  },
};

interface FileUploaderProps {
  loading: boolean;
  onUpload: (file: File) => void;
}

export default function FileUploader({ loading, onUpload }: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (newFiles: File[]) => {
    if (newFiles.length > 0) {
      const selectedFile = newFiles[0];
      
      // Validate file type before setting state
      const isPdf = selectedFile.type === "application/pdf" || selectedFile.name.endsWith(".pdf");
      const isZip = selectedFile.type === "application/zip" || selectedFile.name.endsWith(".zip");
      const isImage = selectedFile.type.startsWith("image/") || 
                      [".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif"].some(ext => 
                        selectedFile.name.toLowerCase().endsWith(ext));
      
      if (!isPdf && !isZip && !isImage) {
        alert("Please upload a PDF, ZIP archive, or chest X-ray image (JPG/PNG).");
        return;
      }
      
      setFile(selectedFile);
      onUpload(selectedFile);
    }
  };

  const handleClick = () => {
    if (!loading) {
      fileInputRef.current?.click();
    }
  };

  const { getRootProps, isDragActive } = useDropzone({
    multiple: false,
    noClick: true,
    disabled: loading,
    onDrop: handleFileChange,
    accept: {
      "application/pdf": [".pdf"],
      "application/zip": [".zip"],
      "application/x-zip-compressed": [".zip"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/bmp": [".bmp"],
      "image/tiff": [".tiff", ".tif"],
    },
    onDropRejected: (error) => {
      console.log(error);
    },
  });

  return (
    <div className="w-full min-h-[60vh] flex flex-col items-center justify-center">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-black mb-3 text-slate-900">
          Upload Your Document or X-ray
        </h2>
        <p className="text-slate-500 text-lg">
          Drag and drop or click to select a PDF, ZIP, or chest X-ray image
        </p>
      </div>

      <div className="w-full max-w-2xl" {...getRootProps()}>
        <motion.div
          onClick={handleClick}
          whileHover={loading ? {} : "animate"}
          className="p-10 group/file block rounded-xl cursor-pointer w-full relative overflow-hidden bg-white border border-slate-200 shadow-xl"
        >
          <input
            ref={fileInputRef}
            id="file-upload-handle"
            type="file"
            onChange={(e) => handleFileChange(Array.from(e.target.files || []))}
            className="hidden"
            disabled={loading}
          />
          <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent)] pointer-events-none">
            <GridPattern />
          </div>
          <div className="flex flex-col items-center justify-center relative z-20">
            {loading ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="w-16 h-16 text-red-500 animate-spin" />
                <p className="text-lg text-slate-600 font-medium">
                  Processing your document...
                </p>
              </div>
            ) : (
              <>
                <p className="font-sans font-bold text-slate-700 text-xl">
                  Upload file
                </p>
                <p className="font-sans font-normal text-slate-400 text-base mt-2">
                  Drag or drop your PDF, ZIP, or X-ray image here or click to upload
                </p>

                <div className="relative w-full mt-10 max-w-xl mx-auto">
                  {!file && (
                    <motion.div
                      layoutId="file-upload"
                      variants={mainVariant}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      }}
                      className={cn(
                        "relative group-hover/file:shadow-2xl z-40 bg-white flex items-center justify-center h-32 mt-4 w-full max-w-[8rem] mx-auto rounded-md",
                        "shadow-[0px_10px_50px_rgba(0,0,0,0.1)] border border-slate-100"
                      )}
                    >
                      {isDragActive ? (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-slate-600 flex flex-col items-center"
                        >
                          Drop it
                          <IconUpload className="h-4 w-4 text-slate-600" />
                        </motion.p>
                      ) : (
                        <IconUpload className="h-4 w-4 text-slate-600" />
                      )}
                    </motion.div>
                  )}

                  {!file && (
                    <motion.div
                      variants={secondaryVariant}
                      className="absolute opacity-0 border border-dashed border-red-400 inset-0 z-30 bg-transparent flex items-center justify-center h-32 mt-4 w-full max-w-[8rem] mx-auto rounded-md"
                    ></motion.div>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function GridPattern() {
  const columns = 41;
  const rows = 11;
  return (
    <div className="flex bg-[#fef3c7] flex-shrink-0 flex-wrap justify-center items-center gap-x-px gap-y-px scale-105 opacity-50">
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: columns }).map((_, col) => {
          const index = row * columns + col;
          return (
            <div
              key={`${col}-${row}`}
              className={`w-10 h-10 flex flex-shrink-0 rounded-[2px] ${
                index % 2 === 0
                  ? "bg-[#fffbeb]"
                  : "bg-[#fffbeb] shadow-[0px_0px_1px_3px_rgba(239,68,68,0.1)_inset]"
              }`}
            />
          );
        })
      )}
    </div>
  );
}
