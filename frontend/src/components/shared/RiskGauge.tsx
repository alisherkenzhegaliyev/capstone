interface RiskGaugeProps {
  riskLevel: "High" | "Medium" | "Low";
  probability: number;
  description: string;
  /**
   * Actual model thresholds so zones match the real classification.
   * CHD (binary):        { low: 0, high: 0.439 }           — no medium
   * Readmission (3-tier): { low: 0.102, medium: 0.3, high: 1 }
   */
  thresholds?: {
    low: number;    // below this = Low
    medium?: number; // below this = Medium (omit for binary)
    high: number;  // at/above this = High
  };
}

const RISK_CONFIG = {
  High: {
    barColor: "bg-red-500",
    textColor: "text-red-700",
    badgeBg: "bg-red-500",
    borderColor: "border-red-200",
    sectionBg: "bg-red-50",
    svgColor: "#ef4444",
    message: "Close monitoring and intervention recommended.",
  },
  Medium: {
    barColor: "bg-amber-500",
    textColor: "text-amber-700",
    badgeBg: "bg-amber-500",
    borderColor: "border-amber-200",
    sectionBg: "bg-amber-50",
    svgColor: "#f59e0b",
    message: "Elevated risk. Consider preventive measures.",
  },
  Low: {
    barColor: "bg-green-500",
    textColor: "text-green-700",
    badgeBg: "bg-green-500",
    borderColor: "border-green-200",
    sectionBg: "bg-green-50",
    svgColor: "#22c55e",
    message: "Within acceptable range. Routine monitoring advised.",
  },
};

function SemiCircleGauge({
  probability,
  color,
  thresholds,
}: {
  probability: number;
  color: string;
  thresholds?: RiskGaugeProps["thresholds"];
}) {
  const R = 70;
  const cx = 90;
  const cy = 90;

  // Angles go from π (left=Low) to 2π (right=High) along the TOP of the circle.
  // In SVG (y-down): sin(π..2π) < 0, so y < cy — the arc curves upward. ✓
  const filled = Math.min(probability, 1) * Math.PI;
  const needleAngle = Math.PI + filled;
  const needleX = cx + (R - 12) * Math.cos(needleAngle);
  const needleY = cy + (R - 12) * Math.sin(needleAngle);

  function arcPath(pFrom: number, pTo: number) {
    const a1 = Math.PI + pFrom * Math.PI;
    const a2 = Math.PI + pTo * Math.PI;
    const x1 = cx + R * Math.cos(a1);
    const y1 = cy + R * Math.sin(a1);
    const x2 = cx + R * Math.cos(a2);
    const y2 = cy + R * Math.sin(a2);
    // sweep=1 = clockwise in SVG screen coords = travels through top (y < cy) ✓
    // la always 0 — no zone spans > 180° on a semicircle
    return `M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`;
  }

  // Zones: Low probability (left) = green, High probability (right) = red
  const zones: { from: number; to: number; color: string }[] =
    thresholds?.medium !== undefined
      ? [
          { from: 0, to: thresholds.low, color: "#86efac" },
          { from: thresholds.low, to: thresholds.medium, color: "#fcd34d" },
          { from: thresholds.medium, to: 1.0, color: "#f87171" },
        ]
      : [
          { from: 0, to: thresholds?.low ?? 0.44, color: "#86efac" },
          { from: thresholds?.low ?? 0.44, to: 1.0, color: "#f87171" },
        ];

  // Threshold tick marks
  const ticks: number[] =
    thresholds?.medium !== undefined
      ? [thresholds.low, thresholds.medium]
      : [thresholds?.low ?? 0.44];

  return (
    <svg viewBox="0 0 180 110" className="w-52 h-auto mx-auto">
      {/* Zone arcs */}
      {zones.map((z, i) => (
        <path
          key={i}
          d={arcPath(z.from, z.to)}
          fill="none"
          stroke={z.color}
          strokeWidth="14"
          strokeLinecap="butt"
          opacity="0.55"
        />
      ))}
      {/* Threshold tick marks */}
      {ticks.map((t) => {
        const tickAngle = Math.PI + t * Math.PI;
        const tx1 = cx + (R - 10) * Math.cos(tickAngle);
        const ty1 = cy + (R - 10) * Math.sin(tickAngle);
        const tx2 = cx + (R + 2) * Math.cos(tickAngle);
        const ty2 = cy + (R + 2) * Math.sin(tickAngle);
        return (
          <line key={t} x1={tx1} y1={ty1} x2={tx2} y2={ty2}
            stroke="#475569" strokeWidth="1.5" />
        );
      })}
      {/* Needle */}
      <line x1={cx} y1={cy} x2={needleX} y2={needleY}
        stroke={color} strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill={color} />
      {/* Labels */}
      <text x="14" y="102" fontSize="7.5" fill="#6b7280" textAnchor="middle">Low</text>
      {thresholds?.medium !== undefined && (
        <text x="90" y="14" fontSize="7.5" fill="#6b7280" textAnchor="middle">Med</text>
      )}
      <text x="166" y="102" fontSize="7.5" fill="#6b7280" textAnchor="middle">High</text>
    </svg>
  );
}

export default function RiskGauge({ riskLevel, probability, description, thresholds }: RiskGaugeProps) {
  const config = RISK_CONFIG[riskLevel];
  const pct = (probability * 100).toFixed(1);
  const hasMedium = thresholds?.medium !== undefined;

  // Zone labels for the progress bar
  const lowLabel = thresholds ? `Low <${(thresholds.low * 100).toFixed(0)}%` : "Low";
  const medLabel = hasMedium && thresholds?.medium
    ? `Medium ${(thresholds.low * 100).toFixed(0)}–${(thresholds.medium * 100).toFixed(0)}%`
    : null;
  const highLabel = thresholds
    ? `High ≥${((thresholds.medium ?? thresholds.low) * 100).toFixed(0)}%`
    : "High";

  // Progress bar zone widths matching thresholds
  const lowWidth = thresholds ? thresholds.low * 100 : 44;
  const medWidth = hasMedium && thresholds?.medium
    ? (thresholds.medium - thresholds.low) * 100
    : 0;

  return (
    <div className={`rounded-xl border-2 ${config.borderColor} ${config.sectionBg} p-6`}>
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Gauge dial */}
        <div className="text-center shrink-0">
          <SemiCircleGauge probability={probability} color={config.svgColor} thresholds={thresholds} />
          <div className="text-4xl font-black text-slate-900 -mt-2">{pct}%</div>
          <div className="text-xs text-slate-500 mt-1">probability</div>
        </div>

        {/* Info panel */}
        <div className="flex-1 text-center md:text-left">
          <div className={`inline-block px-4 py-1.5 rounded-full ${config.badgeBg} text-white font-bold text-base mb-3`}>
            {riskLevel.toUpperCase()} RISK
          </div>
          <p className="text-slate-600 text-sm mb-3">{description}</p>
          <p className={`text-sm font-semibold ${config.textColor}`}>{config.message}</p>

          {/* Progress bar with accurate zone markers */}
          <div className="mt-4">
            {/* Colored zone track */}
            <div className="w-full flex rounded-full h-3 overflow-hidden mb-1">
              <div className="bg-green-300" style={{ width: `${lowWidth}%` }} />
              {medWidth > 0 && (
                <div className="bg-amber-300" style={{ width: `${medWidth}%` }} />
              )}
              <div className="bg-red-300 flex-1" />
            </div>
            {/* Needle indicator */}
            <div className="relative h-4 mb-1">
              <div
                className="absolute top-0 w-1 h-4 rounded-sm bg-slate-800 shadow -translate-x-1/2"
                style={{ left: `${Math.min(parseFloat(pct), 100)}%` }}
              />
            </div>
            {/* Zone labels */}
            <div className="flex text-xs text-slate-500 gap-1">
              <span className="text-green-700 font-medium" style={{ width: `${lowWidth}%` }}>
                {lowLabel}
              </span>
              {medLabel && (
                <span className="text-amber-700 font-medium" style={{ width: `${medWidth}%` }}>
                  {medLabel}
                </span>
              )}
              <span className="text-red-700 font-medium flex-1 text-right">{highLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
