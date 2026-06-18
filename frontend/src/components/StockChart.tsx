import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { StockHistory } from "../api/types";

const PERIODS = [
  { id: "1mo", label: "1M" },
  { id: "3mo", label: "3M" },
  { id: "6mo", label: "6M" },
  { id: "1y", label: "1Y" },
];

interface Props {
  data: StockHistory;
  period: string;
  onPeriodChange: (period: string) => void;
  loading?: boolean;
}

export default function StockChart({ data, period, onPeriodChange, loading }: Props) {
  const chartData = useMemo(
    () =>
      data.data.map((d) => ({
        date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        close: d.close,
      })),
    [data.data],
  );

  const minPrice = Math.min(...chartData.map((d) => d.close));
  const maxPrice = Math.max(...chartData.map((d) => d.close));
  const isPositive =
    chartData.length > 1 && chartData[chartData.length - 1].close >= chartData[0].close;
  const strokeColor = isPositive ? "var(--success)" : "var(--danger)";
  const gradientId = `priceGradient-${data.symbol}`;

  return (
    <div className="chart-card chart-animate">
      <div className="card-header">
        <span className="card-title">Price History — {data.symbol}</span>
        <div className="btn-group">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={period === p.id ? "active" : ""}
              onClick={() => onPeriodChange(p.id)}
              disabled={loading}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-card-body">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.25} />
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis
              dataKey="date"
              stroke="var(--border)"
              tick={{ fill: "var(--text-3)", fontSize: 11 }}
              tickLine={{ stroke: "var(--border)" }}
            />
            <YAxis
              domain={[minPrice * 0.98, maxPrice * 1.02]}
              stroke="var(--border)"
              tick={{ fill: "var(--text-3)", fontSize: 11 }}
              tickLine={{ stroke: "var(--border)" }}
              tickFormatter={(v: number) => `$${v.toFixed(0)}`}
              width={56}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-md)",
                color: "var(--text)",
                fontSize: "var(--text-sm)",
              }}
              labelStyle={{ color: "var(--text-2)" }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, "Close"]}
            />
            <Area
              type="monotone"
              dataKey="close"
              stroke={strokeColor}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
