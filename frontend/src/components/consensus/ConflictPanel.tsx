import type { Conflict } from "../../api/types";

interface ConflictPanelProps {
  conflicts: Conflict[];
}

const SEVERITY_COLOR: Record<string, string> = {
  low: "#fbbf24",
  medium: "#f59e0b",
  high: "#ef4444",
};

const TYPE_ICON: Record<string, string> = {
  divergence: "↔️",
  contradiction: "⚡",
};

export default function ConflictPanel({ conflicts }: ConflictPanelProps) {
  if (!conflicts || conflicts.length === 0) {
    return (
      <div
        style={{
          padding: "12px",
          borderRadius: 8,
          background: "rgba(16,185,129,0.08)",
          border: "1px solid #10b981",
          color: "#065f46",
          fontSize: 13,
        }}
      >
        ✓ No major conflicts detected between analysis methods.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2, 8px)" }}>
      {conflicts.map((conflict, i) => (
        <div
          key={i}
          style={{
            border: `1px solid ${SEVERITY_COLOR[conflict.severity]}`,
            borderLeft: `4px solid ${SEVERITY_COLOR[conflict.severity]}`,
            borderRadius: 8,
            padding: "10px 12px",
            background: "var(--card-bg, #fff)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span>{TYPE_ICON[conflict.type] || "⚠️"}</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                color: SEVERITY_COLOR[conflict.severity],
                letterSpacing: 0.5,
              }}
            >
              {conflict.severity}
            </span>
            {conflict.categories.length > 0 && (
              <span style={{ fontSize: 11, color: "var(--text-2)" }}>
                {conflict.categories.join(" × ")}
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text)" }}>{conflict.description}</p>
        </div>
      ))}
    </div>
  );
}
