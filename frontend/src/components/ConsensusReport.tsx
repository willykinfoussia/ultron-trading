import { useMemo } from "react";
import { motion } from "framer-motion";
import type { AnalysisResult, ConsensusReport as BackendConsensusReport } from "../api/types";

import { Gauge } from "./Gauge";
import SignalPie from "./consensus/SignalPie";
import CategoryBars from "./consensus/CategoryBars";
import ConfidenceHistogram from "./consensus/ConfidenceHistogram";
import RiskRewardScatter, { type RiskRewardPoint } from "./consensus/RiskRewardScatter";
import KPIGrid from "./consensus/KPIGrid";
import InsightPanel from "./consensus/InsightPanel";
import ConflictPanel from "./consensus/ConflictPanel";
import MethodTable from "./consensus/MethodTable";

import "../styles/consensusPrint.css";

interface ConsensusReportProps {
  symbol?: string;
  results?: AnalysisResult[];
  report?: BackendConsensusReport;
}

const VERDICT_COLORS: Record<string, string> = {
  STRONG_BUY: "#10b981",
  BUY: "#34d399",
  HOLD: "#fbbf24",
  SELL: "#f87171",
  STRONG_SELL: "#ef4444",
};

const VERDICT_LABELS: Record<string, string> = {
  STRONG_BUY: "STRONG BUY",
  BUY: "BUY",
  HOLD: "HOLD",
  SELL: "SELL",
  STRONG_SELL: "STRONG SELL",
};

const CAT_LABELS: Record<string, string> = {
  technical: "Technical",
  fundamental: "Fundamental",
  sentiment: "Sentiment",
  ml: "Machine Learning",
  quant: "Quantitative",
};

function signalToScore(signal: string): number {
  switch (signal) {
    case "buy": return 1;
    case "sell": return -1;
    case "hold": return 0.2;
    default: return 0;
  }
}

export default function ConsensusReport({ report }: ConsensusReportProps) {
  const data = useMemo(() => {
    if (report) {
      return report;
    }
    // Minimal fallback if only results provided (should not happen with new flow)
    return null;
  }, [report]);

  if (!data) {
    return (
      <motion.div className="consensus-report" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <p style={{ color: "var(--text-2)" }}>No consensus data available.</p>
      </motion.div>
    );
  }

  const riskPoints: RiskRewardPoint[] = (data.method_details || []).map((m) => ({
    name: m.method_name,
    category: m.category,
    risk: 1 - m.confidence, // low confidence = higher uncertainty/risk
    reward: signalToScore(m.signal),
    weight: m.confidence,
  }));

  const confidences = data.chart_data?.method_confidences || data.method_details.map((m) => m.confidence);

  return (
    <motion.div
      className="consensus-report"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Verdict Header with Gauge */}
      <div className="consensus-verdict" style={{ borderColor: VERDICT_COLORS[data.overall.verdict] }}>
        <div style={{ display: "flex", gap: "var(--sp-6, 24px)", alignItems: "center", flexWrap: "wrap" }}>
          <Gauge score={data.overall.score} verdict={data.overall.verdict} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2 style={{ color: VERDICT_COLORS[data.overall.verdict], margin: 0, fontSize: 28 }}>
              {VERDICT_LABELS[data.overall.verdict]}
            </h2>
            <p style={{ color: "var(--text-2)", margin: "4px 0" }}>
              Consensus Score: <strong>{Math.round(data.overall.score)}</strong> / 100
              {" · "}
              Confidence: <strong>{Math.round(data.overall.confidence * 100)}%</strong>
            </p>
            {data.computed_at && (
              <p style={{ color: "var(--text-2)", fontSize: 12, margin: 0 }}>
                Computed: {new Date(data.computed_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      {data.key_metrics && data.key_metrics.length > 0 && (
        <KPIGrid kpis={data.key_metrics} />
      )}

      {/* Charts Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "var(--sp-4, 16px)",
          margin: "var(--sp-4, 16px) 0",
        }}
      >
        {/* Signal Distribution Pie */}
        <div className="consensus-chart-card">
          <h3 className="consensus-chart-title">Signal Distribution</h3>
          <SignalPie distribution={data.overall.signal_distribution} />
        </div>

        {/* Category Scores Bars */}
        <div className="consensus-chart-card">
          <h3 className="consensus-chart-title">Category Scores</h3>
          <CategoryBars
            categories={data.categories.map((c) => ({
              category: c.category,
              score: c.score,
              confidence: c.confidence,
            }))}
          />
        </div>

        {/* Confidence Histogram */}
        <div className="consensus-chart-card">
          <h3 className="consensus-chart-title">Confidence Distribution</h3>
          <ConfidenceHistogram confidences={confidences} />
        </div>

        {/* Risk / Reward Scatter */}
        <div className="consensus-chart-card">
          <h3 className="consensus-chart-title">Risk / Reward Map</h3>
          <RiskRewardScatter points={riskPoints} />
        </div>
      </div>

      {/* Insights & Conflicts */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "var(--sp-4, 16px)",
          margin: "var(--sp-4, 16px) 0",
        }}
      >
        <div className="consensus-chart-card">
          <h3 className="consensus-chart-title">Key Insights</h3>
          <InsightPanel insights={data.insights} />
        </div>
        <div className="consensus-chart-card">
          <h3 className="consensus-chart-title">Conflicts & Divergences</h3>
          <ConflictPanel conflicts={data.conflicts} />
        </div>
      </div>

      {/* Risk Metrics */}
      {data.risk_metrics && (
        <div className="consensus-chart-card" style={{ margin: "var(--sp-4, 16px) 0" }}>
          <h3 className="consensus-chart-title">Risk Metrics</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "var(--sp-3, 12px)",
            }}
          >
            <RiskMetric label="Expected Return" value={`${(data.risk_metrics.expected_return * 100).toFixed(1)}%`} />
            <RiskMetric label="Volatility" value={`${(data.risk_metrics.volatility_estimate * 100).toFixed(1)}%`} />
            <RiskMetric label="Sharpe Ratio" value={data.risk_metrics.sharpe_estimate.toFixed(2)} />
            <RiskMetric label="Max Drawdown" value={`${(data.risk_metrics.max_drawdown_estimate * 100).toFixed(1)}%`} />
            <RiskMetric label="VaR 95%" value={`${(data.risk_metrics.var_95 * 100).toFixed(1)}%`} />
            <RiskMetric label="Risk/Reward" value={data.risk_metrics.risk_reward_ratio.toFixed(2)} />
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      <div className="consensus-chart-card" style={{ margin: "var(--sp-4, 16px) 0" }}>
        <h3 className="consensus-chart-title">Category Breakdown</h3>
        {data.categories.map((cat) => (
          <div key={cat.category} className="consensus-category">
            <div className="consensus-category-header">
              <span className="consensus-category-name">
                {CAT_LABELS[cat.category] || cat.category}
              </span>
              <span
                className="consensus-category-signal"
                style={{
                  color:
                    cat.score > 20 ? "#10b981" : cat.score < -20 ? "#ef4444" : "#fbbf24",
                }}
              >
                {cat.score > 20 ? "▲ Bullish" : cat.score < -20 ? "▼ Bearish" : "● Neutral"}
                {" "}({Math.round(cat.score)})
              </span>
            </div>
            <div className="consensus-category-methods">
              {cat.methods.map((m) => (
                <span key={m.method_id} className={`consensus-method-tag ${m.signal}`} title={m.key_result}>
                  {m.method_name} · {Math.round(m.confidence * 100)}%
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Method Detail Table */}
      <div className="consensus-chart-card" style={{ margin: "var(--sp-4, 16px) 0" }}>
        <h3 className="consensus-chart-title">All Methods ({data.method_details.length})</h3>
        <MethodTable methods={data.method_details} />
      </div>
    </motion.div>
  );
}

function RiskMetric({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "var(--surface-2, #f1f5f9)",
        borderRadius: 8,
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <span style={{ fontSize: 12, color: "var(--text-2)" }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 700 }}>{value}</span>
    </div>
  );
}
