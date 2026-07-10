import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { AIReport as AIReportType, AIBlock } from "../api/types";
import { Gauge } from "./Gauge";

const VERDICT_COLORS: Record<string, string> = {
  STRONG_BUY: "#10b981",
  BUY: "#34d399",
  HOLD: "#fbbf24",
  SELL: "#f87171",
  STRONG_SELL: "#ef4444",
};

const VERDICT_LABELS: Record<string, string> = {
  STRONG_BUY: "STRONG BUY",
  BUY: "BUY",
  HOLD: "HOLD",
  SELL: "SELL",
  STRONG_SELL: "STRONG SELL",
};

const STATUS_COLOR: Record<string, string> = {
  positive: "#10b981",
  negative: "#ef4444",
  neutral: "#fbbf24",
};

const PIE_COLORS = ["#10b981", "#3b82f6", "#fbbf24", "#ef4444", "#8b5cf6", "#ec4899"];

function BlockRenderer({ block }: { block: AIBlock }) {
  switch (block.type) {
    case "text":
      return (
        <div className="ai-block ai-block-text" style={blockCardStyle}>
          {block.title && <h4 style={{ margin: "0 0 6px", fontSize: 14 }}>{block.title}</h4>}
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>
            {block.content}
          </p>
        </div>
      );

    case "indicator":
      return (
        <div
          className="ai-block ai-block-indicator"
          style={{
            ...blockCardStyle,
            borderLeft: `4px solid ${STATUS_COLOR[block.status || "neutral"]}`,
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-2)" }}>{block.label}</span>
          <strong style={{ fontSize: 18, color: STATUS_COLOR[block.status || "neutral"] }}>
            {block.value}
          </strong>
        </div>
      );

    case "chart": {
      const data = block.data || [];
      if (data.length === 0) return null;
      return (
        <div className="ai-block ai-block-chart" style={blockCardStyle}>
          {block.title && <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>{block.title}</h4>}
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              {block.chart_type === "pie" ? (
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(e) => e.name}
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              ) : block.chart_type === "line" ? (
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              ) : (
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {data.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      );
    }

    case "risk_gauge":
      return (
        <div className="ai-block ai-block-gauge" style={blockCardStyle}>
          {block.title && <h4 style={{ margin: "0 0 8px", fontSize: 14, textAlign: "center" }}>{block.title}</h4>}
          <Gauge score={block.score || 0} verdict={block.score && block.score >= 25 ? "BUY" : block.score && block.score <= -25 ? "SELL" : "HOLD"} />
        </div>
      );

    case "table": {
      const headers = block.headers || [];
      const rows = block.rows || [];
      if (headers.length === 0 && rows.length === 0) return null;
      return (
        <div className="ai-block ai-block-table" style={blockCardStyle}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              {headers.length > 0 && (
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border)" }}>
                    {headers.map((h, i) => (
                      <th key={i} style={{ padding: "6px", textAlign: "left", color: "var(--text-2)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} style={{ borderBottom: "1px solid var(--border)" }}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{ padding: "6px" }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}

const blockCardStyle: React.CSSProperties = {
  background: "var(--surface-2, #f1f5f9)",
  border: "1px solid var(--border, #e5e7eb)",
  borderRadius: 10,
  padding: "12px 14px",
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

export default function AIReport({ report }: { report: AIReportType }) {
  const color = VERDICT_COLORS[report.verdict] || "#fbbf24";

  return (
    <div
      style={{
        border: `2px solid ${color}`,
        borderRadius: 12,
        padding: "var(--sp-4, 16px)",
        background: "var(--card, #fff)",
        marginTop: "var(--sp-4, 16px)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", gap: "var(--sp-4, 16px)", alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <Gauge score={report.confidence * 100 - 50} verdict={report.verdict} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ color, margin: 0, fontSize: 24 }}>{VERDICT_LABELS[report.verdict]}</h2>
          <p style={{ color: "var(--text-2)", margin: "4px 0", fontSize: 13 }}>{report.summary}</p>
        </div>
      </div>

      {/* Buy / Sell thesis */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 12 }}>
        <div style={{ ...blockCardStyle, borderLeft: "4px solid #10b981" }}>
          <strong style={{ fontSize: 13, color: "#10b981" }}>✓ Why Buy</strong>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-2)" }}>{report.buy_thesis}</p>
        </div>
        <div style={{ ...blockCardStyle, borderLeft: "4px solid #ef4444" }}>
          <strong style={{ fontSize: 13, color: "#ef4444" }}>⚠ Why Avoid</strong>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-2)" }}>{report.sell_thesis}</p>
        </div>
      </div>

      {/* Dynamic blocks grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 12,
        }}
      >
        {report.blocks.map((block, i) => (
          <BlockRenderer key={i} block={block} />
        ))}
      </div>

      {report.source === "rule_based_fallback" && (
        <p style={{ fontSize: 11, color: "var(--text-2)", marginTop: 8, fontStyle: "italic" }}>
          ⚠ Generated by rule-based fallback (Hermes LLM unavailable)
        </p>
      )}
    </div>
  );
}
