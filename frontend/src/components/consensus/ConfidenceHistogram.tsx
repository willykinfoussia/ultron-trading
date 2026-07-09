import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ConfidenceHistogramProps {
  confidences: number[];
}

export default function ConfidenceHistogram({ confidences }: ConfidenceHistogramProps) {
  if (!confidences || confidences.length === 0) {
    return <p style={{ color: "var(--text-2)", textAlign: "center" }}>No data</p>;
  }

  // Build 10 bins from 0 to 1
  const bins = Array.from({ length: 10 }, (_, i) => ({
    range: `${(i * 10).toString()}–${((i + 1) * 10).toString()}%`,
    count: 0,
    mid: i / 10 + 0.05,
  }));

  confidences.forEach((c) => {
    const idx = Math.min(9, Math.floor(c * 10));
    bins[idx].count += 1;
  });

  const data = bins.filter((b) => b.count > 0);

  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: 0, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="range" stroke="#94a3b8" fontSize={11} interval={0} angle={-30} textAnchor="end" height={50} />
          <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
          <Tooltip formatter={(value: number) => [`${value} methods`, "Count"]} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.mid >= 0.7 ? "#10b981" : entry.mid >= 0.4 ? "#fbbf24" : "#ef4444"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
