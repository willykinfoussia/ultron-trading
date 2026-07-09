import { useState } from "react";
import type { Insight } from "../../api/types";

interface InsightPanelProps {
  insights: Insight[];
}

const TYPE_ICON: Record<string, string> = {
  bullish: "🟢",
  bearish: "🔴",
  neutral: "🟡",
  risk: "⚠️",
  opportunity: "💡",
};

const TYPE_COLOR: Record<string, string> = {
  bullish: "#10b981",
  bearish: "#ef4444",
  neutral: "#fbbf24",
  risk: "#f59e0b",
  opportunity: "#3b82f6",
};

export default function InsightPanel({ insights }: InsightPanelProps) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (!insights || insights.length === 0) {
    return <p style={{ color: "var(--text-2)", textAlign: "center" }}>No insights generated</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2, 8px)" }}>
      {insights.map((insight, i) => (
        <div
          key={i}
          className="insight-card"
          style={{
            border: `1px solid ${TYPE_COLOR[insight.type] || "#e5e7eb"}`,
            borderLeft: `4px solid ${TYPE_COLOR[insight.type] || "#e5e7eb"}`,
            borderRadius: 8,
            padding: "10px 12px",
            background: "var(--surface-2, #f8fafc)",
            cursor: "pointer",
          }}
          onClick={() => setExpanded(expanded === i ? null : i)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>{TYPE_ICON[insight.type] || "•"}</span>
            <strong style={{ fontSize: 14, flex: 1 }}>{insight.title}</strong>
            <span style={{ fontSize: 11, color: "var(--text-2)" }}>
              {Math.round(insight.confidence * 100)}%
            </span>
          </div>
          {expanded === i && (
            <div style={{ marginTop: 8, fontSize: 13, color: "var(--text-2)" }}>
              <p style={{ margin: "0 0 6px" }}>{insight.description}</p>
              {insight.supporting_methods.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {insight.supporting_methods.map((m) => (
                    <span
                      key={m}
                      style={{
                        fontSize: 11,
                        background: "#f1f5f9",
                        borderRadius: 4,
                        padding: "2px 6px",
                        color: "#475569",
                      }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
