import type { ReactNode } from "react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  tone?: "positive" | "negative" | "neutral" | "primary";
  trend?: { value: number; label: string };
  onClick?: () => void;
}

export function KPICard({ title, value, subtitle, icon, tone, trend, onClick }: KPICardProps) {
  const toneClass = tone === "positive" ? "positive" : tone === "negative" ? "negative" : tone === "primary" ? "primary" : "";

  return (
    <div className={`kpi-card ${toneClass}`} onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className="kpi-header">
        {icon && <span className="kpi-icon">{icon}</span>}
        <span className="kpi-title">{title}</span>
      </div>
      <div className={`kpi-value ${toneClass}`}>{value}</div>
      {subtitle && <div className="kpi-subtitle">{subtitle}</div>}
      {trend && (
        <div className={`kpi-trend ${trend.value >= 0 ? "positive" : "negative"}`}>
          {trend.value >= 0 ? "▲" : "▼"} {Math.abs(trend.value).toFixed(2)}% {trend.label}
        </div>
      )}
    </div>
  );
}

interface DashboardGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function DashboardGrid({ children, columns = 3, className = "" }: DashboardGridProps) {
  return (
    <div className={`dashboard-grid cols-${columns} ${className}`}>
      {children}
    </div>
  );
}

interface MiniChartProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
  fill?: boolean;
}

export function MiniChart({ data, color, height = 40, width = 120, fill = true }: MiniChartProps) {
  if (!data || data.length < 2) return <div className="mini-chart-empty" style={{ height, width: "100%" }} />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stroke = color ?? (data[data.length - 1] >= data[0] ? "var(--success)" : "var(--danger)");

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  const pathD = `M${points.join(" L")}`;
  const fillD = fill ? `${pathD} L${width},${height} L0,${height} Z` : undefined;

  return (
    <svg className="mini-chart" width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {fillD && <path d={fillD} fill={stroke} opacity="0.12" />}
      <path d={pathD} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: number;
  label?: string;
  showValue?: boolean;
}

export function ProgressBar({ value, max = 100, color, height = 6, label, showValue = true }: ProgressBarProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  return (
    <div className="progress-bar-wrap">
      {label && <span className="progress-bar-label">{label}</span>}
      <div className="progress-bar-track" style={{ height }}>
        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      {showValue && <span className="progress-bar-value">{value.toFixed(1)}%</span>}
    </div>
  );
}
