import { useMemo } from "react";
import { motion } from "framer-motion";
import type { AnalysisResult } from "../api/types";
import type { ConsensusReport as BackendConsensusReport } from "../api/types";

interface ConsensusReportProps {
  symbol?: string;
  results?: AnalysisResult[];
  report?: BackendConsensusReport;
}

interface CategorySummary {
  category: string;
  buyCount: number;
  sellCount: number;
  holdCount: number;
  neutralCount: number;
  avgConfidence: number;
  weightedSignal: number;
  methods: AnalysisResult[];
}

// Fallback computation (unchanged)
function computeConsensus(results: AnalysisResult[]) {
  const byCategory = new Map<string, AnalysisResult[]>();
  for (const r of results) {
    const list = byCategory.get(r.category) || [];
    list.push(r);
    byCategory.set(r.category, list);
  }

  const categories: CategorySummary[] = [];
  let totalBuy = 0, totalSell = 0, totalHold = 0, totalNeutral = 0;
  let globalWeightedSignal = 0;
  let totalWeight = 0;

  for (const [category, methods] of byCategory) {
    let buy = 0, sell = 0, hold = 0, neutral = 0;
    let catWeighted = 0, catWeight = 0;

    for (const m of methods) {
      const weight = m.confidence;
      switch (m.signal) {
        case "buy": buy++; totalBuy++; catWeighted += weight * 100; catWeight += weight; break;
        case "sell": sell++; totalSell++; catWeighted += weight * -100; catWeight += weight; break;
        case "hold": hold++; totalHold++; catWeighted += weight * 20; catWeight += weight; break;
        case "neutral": neutral++; totalNeutral++; break;
      }
    }

    const avgConf = methods.length > 0 ? methods.reduce((s, m) => s + m.confidence, 0) / methods.length : 0;
    const weighted = catWeight > 0 ? catWeighted / catWeight : 0;

    categories.push({
      category, buyCount: buy, sellCount: sell, holdCount: hold, neutralCount: neutral,
      avgConfidence: avgConf, weightedSignal: weighted, methods,
    });

    globalWeightedSignal += weighted * catWeight;
    totalWeight += catWeight;
  }

  const overallScore = totalWeight > 0 ? globalWeightedSignal / totalWeight : 0;

  let verdict: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
  if (overallScore >= 60) verdict = "STRONG_BUY";
  else if (overallScore >= 25) verdict = "BUY";
  else if (overallScore >= -25) verdict = "HOLD";
  else if (overallScore >= -60) verdict = "SELL";
  else verdict = "STRONG_SELL";

  const conflicts: string[] = [];
  const techCat = categories.find(c => c.category === "technical");
  const fundCat = categories.find(c => c.category === "fundamental");
  const sentCat = categories.find(c => c.category === "sentiment");

  if (techCat && fundCat) {
    if (techCat.weightedSignal > 30 && fundCat.weightedSignal < -30)
      conflicts.push("⚡ Technical signals bullish but fundamentals bearish — trend may be unsustainable");
    if (techCat.weightedSignal < -30 && fundCat.weightedSignal > 30)
      conflicts.push("💰 Fundamentals strong but technicals weak — possible buying opportunity on dip");
  }
  if (sentCat && fundCat) {
    if (sentCat.weightedSignal > 40 && fundCat.weightedSignal < -20)
      conflicts.push("📰 Market sentiment extremely positive despite weak fundamentals — possible euphoria");
  }

  const insights: string[] = [];
  const sortedByConfidence = [...results].sort((a, b) => b.confidence - a.confidence);
  const topBuy = sortedByConfidence.filter(r => r.signal === "buy").slice(0, 3);
  const topSell = sortedByConfidence.filter(r => r.signal === "sell").slice(0, 3);

  if (topBuy.length > 0)
    insights.push(`Top buy signals: ${topBuy.map(m => m.method_name).join(", ")}`);
  if (topSell.length > 0)
    insights.push(`Top sell signals: ${topSell.map(m => m.method_name).join(", ")}`);

  const avgConf = results.length > 0 ? results.reduce((s, r) => s + r.confidence, 0) / results.length : 0;
  if (avgConf > 0.7) insights.push(`High average confidence (${Math.round(avgConf * 100)}%) — strong conviction`);
  if (avgConf < 0.3) insights.push(`Low average confidence (${Math.round(avgConf * 100)}%) — mixed or uncertain signals`);

  // Sort categories by importance (technical, fundamental, sentiment, ml)
  const catOrder = ["technical", "fundamental", "sentiment", "ml"];
  categories.sort((a, b) => catOrder.indexOf(a.category) - catOrder.indexOf(b.category));

  return { categories, overallScore, verdict, conflicts, insights, totalMethods: results.length, avgConfidence: avgConf };
}

const VERDICT_COLORS: Record<string, string> = {
  STRONG_BUY: "#10b981",
  BUY: "#34d399",
  HOLD: "#fbbf24",
  SELL: "#f87171",
  STRONG_SELL: "#ef4444",
};

const VERDICT_LABELS: Record<string, string> = {
  STRONG_BUY: "🟢 STRONG BUY",
  BUY: "🟢 BUY",
  HOLD: "🟡 HOLD",
  SELL: "🔴 SELL",
  STRONG_SELL: "🔴 STRONG SELL",
};

const CATEGORY_LABELS: Record<string, string> = {
  technical: "📊 Technical",
  fundamental: "💰 Fundamental",
  sentiment: "📰 Sentiment",
  ml: "🤖 Machine Learning",
  quant: "📐 Quantitative",
};

export default function ConsensusReport({ symbol, results, report }: ConsensusReportProps) {
  // Determine which data to use
  const data = useMemo(() => {
    if (report) {
      // Transform backend report to shape expected by the rest of component
      // We'll map backend fields to the same shape as computeConsensus output
      const backend = report;
      // Build categories in the same format as CategorySummary
      const catSummaries: CategorySummary[] = backend.categories.map(cat => ({
        category: cat.category,
        buyCount: cat.signal_counts.buy,
        sellCount: cat.signal_counts.sell,
        holdCount: cat.signal_counts.hold,
        neutralCount: cat.signal_counts.neutral,
        avgConfidence: cat.confidence,
        weightedSignal: cat.score,
        methods: cat.methods.map(m => ({
          method_id: m.method_id,
          method_name: m.method_name,
          category: m.category,
          symbol: symbol || "",
          result: {}, // not needed for display
          signal: m.signal,
          confidence: m.confidence,
          explanation: "", // not needed
          chart_data: null,
          computed_at: "",
        } as AnalysisResult))
      }));
      return {
        categories: catSummaries,
        overallScore: backend.overall.score,
        verdict: backend.overall.verdict,
        conflicts: backend.conflicts.map(c => c.description),
        insights: backend.insights.map(i => i.description),
        totalMethods: backend.method_details.length,
        avgConfidence: backend.overall.confidence,
      };
    } else if (results) {
      return computeConsensus(results);
    } else {
      // empty
      return {
        categories: [],
        overallScore: 0,
        verdict: "HOLD",
        conflicts: [],
        insights: [],
        totalMethods: 0,
        avgConfidence: 0,
      };
    }
  }, [report, results]);

  return (
    <motion.div
      className="consensus-report"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Verdict Header */}
      <div className="consensus-verdict" style={{ borderColor: VERDICT_COLORS[data.verdict] }}>
        <div className="consensus-verdict-header">
          <h2 style={{ color: VERDICT_COLORS[data.verdict], marginBottom: 0 }}>
            {VERDICT_LABELS[data.verdict]}
          </h2>
          <span className="consensus-score">
            Score: {Math.round(data.overallScore)}
          </span>
        </div>
        <div className="consensus-meter">
          <div className="consensus-meter-fill"
            style={{
              width: `${Math.min(Math.abs(data.overallScore), 100)}%`,
              backgroundColor: VERDICT_COLORS[data.verdict],
              marginLeft: data.overallScore < 0 ? `${50 - Math.abs(data.overallScore) / 2}%` : "50%",
            }}
          />
          <div className="consensus-meter-center" />
        </div>
        <div className="consensus-meter-labels">
          <span>← Sell</span>
          <span>Neutral</span>
          <span>Buy →</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="consensus-stats">
        <div className="consensus-stat">
          <span className="consensus-stat-value">{data.totalMethods}</span>
          <span className="consensus-stat-label">Methods</span>
        </div>
        <div className="consensus-stat">
          <span className="consensus-stat-value" style={{ color: "#10b981" }}>
            {Math.round(data.overallScore > 0 ? data.overallScore : 0)} Buy
          </span>
          <span className="consensus-stat-label">Buy</span>
        </div>
        <div className="consensus-stat">
          <span className="consensus-stat-value" style={{ color: "#ef4444" }}>
            {Math.round(data.overallScore < 0 ? -data.overallScore : 0)} Sell
          </span>
          <span className="consensus-stat-label">Sell</span>
        </div>
        <div className="consensus-stat">
          <span className="consensus-stat-value" style={{ color: "#fbbf24" }}>
            {data.totalMethods - (data.overallScore > 0 ? Math.round(data.overallScore) : 0) - (data.overallScore < 0 ? Math.round(-data.overallScore) : 0)} Hold/Neutral
          </span>
          <span className="consensus-stat-label">Hold</span>
        </div>
      </div>

      {/* Per-Category Breakdown */}
      <div className="consensus-categories">
        <h3>Category Breakdown</h3>
        {data.categories.map(cat => (
          <div key={cat.category} className="consensus-category">
            <div className="consensus-category-header">
              <span className="consensus-category-name">
                {CATEGORY_LABELS[cat.category] || cat.category}
              </span>
              <span className="consensus-category-signal"
                style={{ color: cat.weightedSignal > 20 ? "#10b981" : cat.weightedSignal < -20 ? "#ef4444" : "#fbbf24" }}
              >
                {cat.weightedSignal > 20 ? "▲ Bullish" : cat.weightedSignal < -20 ? "▼ Bearish" : "● Neutral"}
                {" "}({Math.round(cat.weightedSignal)})
              </span>
            </div>
            <div className="consensus-category-bar">
              <div
                style={{
                  width: `${Math.max(Math.abs(cat.weightedSignal), 2)}%`,
                  backgroundColor: cat.weightedSignal >= 0 ? "#10b981" : "#ef4444",
                  marginLeft: cat.weightedSignal < 0 ? `${50 - Math.abs(cat.weightedSignal) / 2}%` : "50%",
                  height: "100%",
                  borderRadius: "4px",
                  transition: "width 0.3s ease",
                  minWidth: "4px",
                }}
              />
              <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: "2px", background: "var(--border)", }} />
            </div>
            <div className="consensus-category-methods">
              {cat.methods.map(m => (
                <span key={m.method_id} className={`consensus-method-tag ${m.signal}`} title={m.explanation}>
                  {m.method_name} · {Math.round(m.confidence * 100)}%
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Conflicts */}
      {data.conflicts.length > 0 && (
        <div className="consensus-conflicts">
          <h3>⚠️ Conflicts Detected</h3>
          {data.conflicts.map((c, i) => (
            <div key={i} className="consensus-conflict">{c}</div>
          ))}
        </div>
      )}

      {/* Key Insights */}
      {data.insights.length > 0 && (
        <div className="consensus-insights">
          <h3>💡 Key Insights</h3>
          <ul>
            {data.insights.map((insight, i) => (
              <li key={i}>{insight}</li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}