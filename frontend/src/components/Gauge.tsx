import { motion } from "framer-motion";

interface GaugeProps {
  score: number; // from -100 to 100
  verdict: string;
}

export function Gauge({ score, verdict }: GaugeProps) {
  // Clamp score between -100 and 100
  const clampedScore = Math.max(-100, Math.min(100, score));
  // Convert to 0-200 for the gauge (0 = -100, 100 = 0, 200 = 100)
  const gaugeValue = clampedScore + 100;
  // The gauge is a semi-circle (180 degrees), so we map 0-200 to 0-180 degrees
  const rotation = (gaugeValue / 200) * 180 - 90; // -90 to 90 degrees

  // Determine the color based on the verdict
  const VERDICT_COLORS: Record<string, string> = {
    STRONG_BUY: "#10b981",
    BUY: "#34d399",
    HOLD: "#fbbf24",
    SELL: "#f87171",
    STRONG_SELL: "#ef4444",
  };
  const color = VERDICT_COLORS[verdict] || "#fbbf24";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as const }}
      className="gauge-chart"
    >
      <div className="gauge-container">
        <div className="gauge-svg-container">
          <svg width="200" height="100" viewBox="0 0 200 100" preserveAspectRatio="xMidYMid meet">
            {/* Background arc */}
            <path
              d="M10,100 A90,90 0 0,1 190,100"
              stroke="#e5e7eb"
              strokeWidth="20"
              fill="none"
            />
            {/* Value arc */}
            <path
              d={`M10,100 A90,90 0 0,1 ${10 + gaugeValue * 1.8},${100 - Math.sqrt(90 * 90 - (gaugeValue * 1.8 - 90) * (gaugeValue * 1.8))}`}
              stroke={color}
              strokeWidth="20"
              fill="none"
            />
            {/* Needle */}
            <g transform={`translate(100,100) rotate(${rotation})`}>
              <line x1="0" y1="0" x2="0" y2="-80" stroke={color} strokeWidth="4" />
              <circle cx="0" cy="0" r="8" fill={color} />
            </g>
            {/* Center dot */}
            <circle cx="100" cy="100" r="6" fill="#fff" stroke={color} strokeWidth="2" />
          </svg>
        </div>
        <div className="gauge-label">
          <h3>{verdict}</h3>
          <p className="gauge-score">{clampedScore}</p>
        </div>
      </div>
    </motion.div>
  );
}