interface DonutChartProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  color?: string;
}

export function DonutChart({ value, size = 100, strokeWidth = 10, label, sublabel, color }: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const hue = (value / 100) * 120;
  const stroke = color || `hsl(${hue}, 70%, 50%)`;

  return (
    <div className="donut-chart" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-3)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.6s var(--ease)" }}
        />
      </svg>
      <div className="donut-center">
        <span className="donut-value" style={{ color: stroke }}>{value}</span>
        {label && <span className="donut-label">{label}</span>}
        {sublabel && <span className="donut-sublabel">{sublabel}</span>}
      </div>
    </div>
  );
}
