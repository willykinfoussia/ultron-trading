import { useState } from "react";
import type { MethodDetail } from "../../api/types";

interface MethodTableProps {
  methods: MethodDetail[];
}

const SIGNAL_COLOR: Record<string, string> = {
  buy: "#10b981",
  sell: "#ef4444",
  hold: "#fbbf24",
  neutral: "#94a3b8",
};

const CAT_LABELS: Record<string, string> = {
  technical: "Technical",
  fundamental: "Fundamental",
  sentiment: "Sentiment",
  ml: "ML",
  quant: "Quant",
};

export default function MethodTable({ methods }: MethodTableProps) {
  const [sortBy, setSortBy] = useState<"confidence" | "signal">("confidence");
  const [filter, setFilter] = useState<string>("all");

  if (!methods || methods.length === 0) return null;

  const filtered = methods.filter((m) => filter === "all" || m.signal === filter);
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "confidence") return b.confidence - a.confidence;
    const order: Record<string, number> = { buy: 0, hold: 1, neutral: 2, sell: 3 };
    return order[a.signal] - order[b.signal];
  });

  const filters = ["all", "buy", "hold", "neutral", "sell"];

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid var(--border, #e5e7eb)",
              background: filter === f ? "var(--accent, #3b82f6)" : "var(--card-bg, #fff)",
              color: filter === f ? "#fff" : "var(--text)",
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {f}
          </button>
        ))}
        <button
          onClick={() => setSortBy(sortBy === "confidence" ? "signal" : "confidence")}
          style={{
            fontSize: 12,
            padding: "4px 10px",
            borderRadius: 6,
            border: "1px solid var(--border, #e5e7eb)",
            background: "var(--card-bg, #fff)",
            color: "var(--text)",
            cursor: "pointer",
            marginLeft: "auto",
          }}
        >
          Sort: {sortBy === "confidence" ? "Confidence" : "Signal"}
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border, #e5e7eb)", textAlign: "left" }}>
              <th style={{ padding: "8px 6px" }}>Method</th>
              <th style={{ padding: "8px 6px" }}>Category</th>
              <th style={{ padding: "8px 6px" }}>Signal</th>
              <th style={{ padding: "8px 6px" }}>Conf.</th>
              <th style={{ padding: "8px 6px" }}>Key Result</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m) => (
              <tr key={m.method_id} style={{ borderBottom: "1px solid var(--border, #f1f5f9)" }}>
                <td style={{ padding: "6px", fontWeight: 500 }}>{m.method_name}</td>
                <td style={{ padding: "6px", color: "var(--text-2)" }}>
                  {CAT_LABELS[m.category] || m.category}
                </td>
                <td style={{ padding: "6px" }}>
                  <span
                    style={{
                      color: SIGNAL_COLOR[m.signal],
                      fontWeight: 600,
                      textTransform: "uppercase",
                      fontSize: 11,
                    }}
                  >
                    {m.signal}
                  </span>
                </td>
                <td style={{ padding: "6px" }}>{Math.round(m.confidence * 100)}%</td>
                <td style={{ padding: "6px", color: "var(--text-2)" }}>{m.key_result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
