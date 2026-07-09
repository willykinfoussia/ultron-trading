import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface CategoryBar {
  category: string;
  score: number;
  confidence: number;
}

interface CategoryBarsProps {
  categories: CategoryBar[];
}

const CAT_LABELS: Record<string, string> = {
  technical: "Technical",
  fundamental: "Fundamental",
  sentiment: "Sentiment",
  ml: "ML",
  quant: "Quant",
};

function scoreColor(score: number): string {
  if (score >= 25) return "#10b981";
  if (score >= 0) return "#34d399";
  if (score >= -25) return "#fbbf24";
  if (score >= -60) return "#f87171";
  return "#ef4444";
}

export default function CategoryBars({ categories }: CategoryBarsProps) {
  const data = categories.map((c) => ({
    name: CAT_LABELS[c.category] || c.category,
    score: Math.round(c.score),
    confidence: Math.round(c.confidence * 100),
  }));

  if (data.length === 0) {
    return <p style={{ color: "var(--text-2)", textAlign: "center" }}>No categories</p>;
  }

  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <XAxis
            type="number"
            domain={[-100, 100]}
            ticks={[-100, -50, 0, 50, 100]}
            stroke="#94a3b8"
            fontSize={12}
          />
          <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={12} width={80} />
          <Tooltip
            formatter={(value: number, name: string) =>
              name === "score" ? [`${value}`, "Score"] : [`${value}%`, "Confidence"]
            }
            cursor={{ fill: "rgba(148,163,184,0.1)" }}
          />
          <Bar dataKey="score" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={scoreColor(entry.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
