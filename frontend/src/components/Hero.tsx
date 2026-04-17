"use client";

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { DotScreenShader } from "./DotScreenShader";

function Hero() {
  const navigate = useNavigate();
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => ["smarter", "faster", "clearer"],
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <div className="w-full min-h-screen bg-[#fef3c7] flex flex-col justify-center relative overflow-hidden">
      {/* Background Shader */}
      <div className="absolute inset-0 z-0 pointer-events-auto">
        <DotScreenShader />
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-b from-transparent to-[#fef3c7] z-[5]"></div>

      <div className="container mx-auto relative z-10 pointer-events-none">
        <div className="flex gap-8 py-20 lg:py-40 items-center justify-center flex-col">
          <div></div>
          <div className="flex gap-4 flex-col">
            <h1 className="!text-5xl md:!text-7xl max-w-2xl tracking-tighter text-center !font-black !leading-[1.1] text-slate-900">
              <span className="text-red-500">Make your diagnoses</span>
              <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1">
                &nbsp;
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    className="absolute !font-semibold"
                    initial={{ opacity: 0, y: -100 }}
                    transition={{ type: "spring", stiffness: 50 }}
                    animate={
                      titleNumber === index
                        ? {
                            y: 0,
                            opacity: 1,
                          }
                        : {
                            y: titleNumber > index ? -150 : 150,
                            opacity: 0,
                          }
                    }
                  >
                    {title}
                  </motion.span>
                ))}
              </span>
            </h1>

            <p className="text-lg md:text-xl leading-relaxed tracking-tight text-black max-w-2xl text-center">
              Streamline your diagnostic workflow with AI-powered analysis.
              Upload patient reports and get instant, accurate predictions to
              support your clinical decisions.
            </p>
          </div>
          <div className="flex flex-row gap-3 pointer-events-auto">
            <button
              onClick={() =>
                document
                  .getElementById("digital-inspector")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="inline-flex items-center justify-center gap-4 px-10 py-3 h-14 rounded-lg text-base font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors shadow-md !bg-red-500 hover:!bg-red-600"
            >
              Explore
            </button>
            <button
              onClick={() => navigate("/clinical")}
              className="inline-flex items-center justify-center gap-4 px-10 py-3 h-14 rounded-lg text-base font-semibold bg-white text-red-500 border-2 border-red-500 hover:bg-red-50 transition-colors shadow-md"
            >
              Clinical Decision Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Hero;
