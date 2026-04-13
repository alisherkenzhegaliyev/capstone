interface SHAPFeature {
  feature: string;
  display_name: string;
  shap_value: number;
  direction: "increases" | "decreases";
}

interface SHAPChartProps {
  features: SHAPFeature[];
  baseValue?: number;
  finalProbability?: number;
  title?: string;
}

export default function SHAPChart({
  features,
  baseValue,
  finalProbability,
  title = "Feature Importance",
}: SHAPChartProps) {
  if (!features.length) return null;

  const top = features.slice(0, 10);
  const maxAbs = Math.max(...top.map((f) => Math.abs(f.shap_value)), 0.001);

  const riskyFactors = top.filter((f) => f.shap_value > 0);
  const protectiveFactors = top.filter((f) => f.shap_value < 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500 mt-1">
          SHAP values show how much each factor shifts the risk{" "}
          {baseValue !== undefined && `away from the population average (${(baseValue * 100).toFixed(1)}%)`}.
          Longer bars = stronger influence on <em>this patient</em>.
        </p>
      </div>

      {/* Plain-language summary */}
      {riskyFactors.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-800">
          <span className="font-semibold">Main risk factors: </span>
          {riskyFactors
            .slice(0, 3)
            .map((f) => f.display_name)
            .join(", ")}
          {protectiveFactors.length > 0 && (
            <>
              {" — partially offset by "}
              <span className="font-semibold text-blue-700">
                {protectiveFactors
                  .slice(0, 2)
                  .map((f) => f.display_name)
                  .join(", ")}
              </span>
              .
            </>
          )}
        </div>
      )}

      {/* Bar chart */}
      <div className="space-y-3">
        {top.map((f) => {
          const pct = (Math.abs(f.shap_value) / maxAbs) * 100;
          const isPositive = f.shap_value > 0;
          return (
            <div key={f.feature}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-700 font-medium truncate max-w-[55%]" title={f.display_name}>
                  {f.display_name}
                </span>
                <span className={`text-xs font-semibold ${isPositive ? "text-red-600" : "text-blue-600"}`}>
                  {isPositive ? "▲ +" : "▼ "}
                  {f.shap_value.toFixed(4)}
                </span>
              </div>
              <div className="relative h-5 flex items-center">
                {/* Zero line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300 z-10" />
                {/* Bar */}
                <div
                  className={`absolute top-0.5 h-4 rounded transition-all duration-500 ${
                    isPositive ? "bg-red-400" : "bg-blue-400"
                  }`}
                  style={
                    isPositive
                      ? { left: "50%", width: `${pct / 2}%` }
                      : { right: "50%", width: `${pct / 2}%` }
                  }
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Waterfall summary */}
      {baseValue !== undefined && finalProbability !== undefined && (
        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Risk pathway
          </p>
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-medium">
              Population avg: {(baseValue * 100).toFixed(1)}%
            </span>
            {riskyFactors.length > 0 && (
              <>
                <span className="text-slate-400">+</span>
                <span className="bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg font-medium">
                  Risk factors: +{(riskyFactors.reduce((s, f) => s + f.shap_value, 0) * 100).toFixed(1)}%
                </span>
              </>
            )}
            {protectiveFactors.length > 0 && (
              <>
                <span className="text-slate-400">+</span>
                <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg font-medium">
                  Protective: {(protectiveFactors.reduce((s, f) => s + f.shap_value, 0) * 100).toFixed(1)}%
                </span>
              </>
            )}
            <span className="text-slate-400">=</span>
            <span className="bg-slate-900 text-white px-3 py-1.5 rounded-lg font-semibold">
              This patient: {(finalProbability * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-6 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-400 inline-block" /> Increases risk
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-400 inline-block" /> Decreases risk
        </span>
      </div>
    </div>
  );
}
