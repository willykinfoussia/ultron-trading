import type { KPI } from "../../api/types";

interface KPIGridProps {
  kpis: KPI[];
}

const TREND_ICON: Record<string, string> = {
  up: "▲",
  down: "▼",
  neutral: "■",
};

const TREND_COLOR: Record<string, string> = {
  up: "#10b981",
  down: "#ef4444",
  neutral: "#94a3b8",
};

export default function KPIGrid({ kpis }: KPIGridProps) {
  if (!kpis || kpis.length === 0) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "var(--sp-3, 12px)",
        margin: "var(--sp-4, 16px) 0",
      }}
    >
      {kpis.map((kpi, i) => (
        <div
          key={i}
          className="kpi-card"
          title={kpi.tooltip}
          style={{
            background: "var(--card-bg, #fff)",
            border: "1px solid var(--border, #e5e7eb)",
            borderRadius: 12,
            padding: "var(--sp-3, 12px)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-2, #64748b)", fontWeight: 500 }}>
            {kpi.label}
          </span>
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: kpi.trend ? TREND_COLOR[kpi.trend] : "var(--text, #1e293b)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {kpi.trend && (
              <span style={{ fontSize: 14 }}>{TREND_ICON[kpi.trend]}</span>
            )}
            {kpi.value}
          </span>
        </div>
      ))}
    </div>
  );
}
