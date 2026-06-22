interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  showValues?: boolean;
  formatValue?: (v: number) => string;
}

export function BarChart({ data, height = 28, showValues = true, formatValue = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%` }: BarChartProps) {
  if (!data || data.length === 0) return null;

  const maxAbs = Math.max(...data.map((d) => Math.abs(d.value)), 1);

  return (
    <div className="bar-chart">
      {data.map((item, i) => {
        const pos = item.value >= 0;
        const widthPct = (Math.abs(item.value) / maxAbs) * 50;
        const barColor = item.color ?? (pos ? "var(--success)" : "var(--danger)");

        return (
          <div key={i} className="bar-chart-row">
            <span className="bar-chart-label">{item.label}</span>
            <div className="bar-chart-track" style={{ height }}>
              {pos ? (
                <>
                  <div style={{ flex: 1 }} />
                  <div className="bar-chart-fill" style={{ width: `${widthPct}%`, background: barColor }} />
                </>
              ) : (
                <>
                  <div className="bar-chart-fill" style={{ width: `${widthPct}%`, background: barColor }} />
                  <div style={{ flex: 1 }} />
                </>
              )}
            </div>
            {showValues && (
              <span className={`bar-chart-value ${pos ? "positive" : "negative"}`}>
                {formatValue(item.value)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
