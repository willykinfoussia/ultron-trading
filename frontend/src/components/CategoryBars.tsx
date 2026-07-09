import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { motion } from "framer-motion";

interface CategorySummary {
  category: string;
  buyCount: number;
  sellCount: number;
  holdCount: number;
  neutralCount: number;
  avgConfidence: number;
  weightedSignal: number;
  methods: any[]; // AnalysisResult[]
}

interface CategoryBarsProps {
  categories: CategorySummary[];
}

export function CategoryBars({ categories }: CategoryBarsProps) {
  if (!categories || categories.length === 0) {
    return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="empty-state">No category data</motion.div>;
  }

  // Transform data for stacked bar chart
  const chartData = categories.map((cat) => ({
    category: cat.category,
    buy: cat.buyCount,
    sell: cat.sellCount,
    hold: cat.holdCount,
    neutral: cat.neutralCount,
  }));

  const CATEGORY_LABELS: Record<string, string> = {
    technical: "Technical",
    fundamental: "Fundamental",
    sentiment: "Sentiment",
    ml: "Machine Learning",
    quant: "Quantitative",
  };

  const COLORS = {
    buy: "#10b981", // green
    sell: "#ef4444", // red
    hold: "#fbbf24", // yellow
    neutral: "#6b7280", // gray
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as const }}
      className="category-bars-chart"
    >
      <div className="chart-container">
        <h3>Category Breakdown</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <YAxis
              dataKey="category"
              axisLine={false}
              tick={{ fontSize: 12, fill: "#64748b" }}
              tickFormatter={(category) => CATEGORY_LABELS[category] || category}
            />
            <XAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#64748b" }}
            />
            <Tooltip
              contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}
              labelStyle={{ color: "#475569" }}
              formatter={(value) => `${value} methods`}
            />
            <Legend
              verticalAlign="top"
              height={36}
              wrapperStyle={{ fontSize: 12, color: "#64748b" }}
            />
            <Bar dataKey="buy" stackId="a" fill={COLORS.buy} radius={[6, 6, 0, 0]} />
            <Bar dataKey="sell" stackId="a" fill={COLORS.sell} radius={[6, 6, 0, 0]} />
            <Bar dataKey="hold" stackId="a" fill={COLORS.hold} radius={[6, 6, 0, 0]} />
            <Bar dataKey="neutral" stackId="a" fill={COLORS.neutral} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
