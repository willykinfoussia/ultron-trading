import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export interface RiskRewardPoint {
  name: string;
  category: string;
  risk: number; // volatility estimate (0-1)
  reward: number; // expected return (0-1)
  weight: number; // method confidence
}

interface RiskRewardScatterProps {
  points: RiskRewardPoint[];
}

const CAT_COLORS: Record<string, string> = {
  technical: "#3b82f6",
  fundamental: "#10b981",
  sentiment: "#f59e0b",
  ml: "#8b5cf6",
  quant: "#ec4899",
};

export default function RiskRewardScatter({ points }: RiskRewardScatterProps) {
  if (!points || points.length === 0) {
    return <p style={{ color: "var(--text-2)", textAlign: "center" }}>No data</p>;
  }

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <ScatterChart margin={{ left: 0, right: 20, top: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            dataKey="risk"
            name="Risk (volatility)"
            stroke="#94a3b8"
            fontSize={12}
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
            label={{ value: "Risk (Volatility)", position: "bottom", fontSize: 12 }}
          />
          <YAxis
            type="number"
            dataKey="reward"
            name="Reward (expected return)"
            stroke="#94a3b8"
            fontSize={12}
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
            label={{ value: "Reward", angle: -90, position: "insideLeft", fontSize: 12 }}
          />
          <ZAxis type="number" dataKey="weight" range={[60, 400]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            formatter={(value: number, name: string) => {
              if (name === "Risk (volatility)" || name === "Reward (expected return)")
                return `${(value * 100).toFixed(1)}%`;
              return value;
            }}
            labelFormatter={() => ""}
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const p = payload[0].payload as RiskRewardPoint;
              return (
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                  <strong>{p.name}</strong>
                  <div>Category: {p.category}</div>
                  <div>Risk: {(p.risk * 100).toFixed(1)}%</div>
                  <div>Reward: {(p.reward * 100).toFixed(1)}%</div>
                </div>
              );
            }}
          />
          <Scatter data={points}>
            {points.map((p, i) => (
              <Cell key={i} fill={CAT_COLORS[p.category] || "#64748b"} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
