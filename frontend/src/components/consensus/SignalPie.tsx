import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface SignalPieProps {
  distribution: { buy: number; sell: number; hold: number; neutral: number };
}

const COLORS: Record<string, string> = {
  buy: "#10b981",
  sell: "#ef4444",
  hold: "#fbbf24",
  neutral: "#94a3b8",
};

const LABELS: Record<string, string> = {
  buy: "Buy",
  sell: "Sell",
  hold: "Hold",
  neutral: "Neutral",
};

export default function SignalPie({ distribution }: SignalPieProps) {
  const data = Object.entries(distribution)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({ name: LABELS[key] || key, value, key }));

  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return <p style={{ color: "var(--text-2)", textAlign: "center" }}>No signals</p>;
  }

  return (
    <div style={{ width: "100%", height: 240 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
            label={(entry) => `${entry.name}: ${entry.value}`}
          >
            {data.map((entry) => (
              <Cell key={entry.key} fill={COLORS[entry.key]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [`${value} (${Math.round((value / total) * 100)}%)`, "Methods"]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
