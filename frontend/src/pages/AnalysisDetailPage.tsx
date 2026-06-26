import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { AnalysisMethod, AnalysisResult } from "../api/types";
import SignalBadge from "../components/analysis/SignalBadge";
import ConfidenceMeter from "../components/analysis/ConfidenceMeter";
import Spinner from "../components/Spinner";

interface Props {
  symbol: string;
  method: AnalysisMethod;
  onBack: () => void;
}

export default function AnalysisDetailPage({ symbol, method, onBack }: Props) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/analysis/${symbol}/run/${method.method_id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="page page-analysis-detail">
      {/* Header with back button */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <button className="btn-back" onClick={onBack}>
          ← Back to Analysis
        </button>
      </motion.div>

      {/* Title section */}
      <motion.div
        className="analysis-detail-header"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
      >
        <h1 className="analysis-detail-title">{method.method_name}</h1>
        <div className="analysis-detail-badges">
          <span className="badge-category">{method.category}</span>
          <span className="badge-method-id">{method.method_id}</span>
        </div>
        <p className="analysis-detail-description">{method.description}</p>
      </motion.div>

      {/* How It Works */}
      <motion.section
        className="analysis-section"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1 }}
      >
        <h2 className="analysis-section-title">How It Works</h2>
        <p className="analysis-section-text">{method.how_it_works}</p>
      </motion.section>

      {/* Pros & Cons */}
      <motion.section
        className="analysis-section"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.15 }}
      >
        <h2 className="analysis-section-title">Pros & Cons</h2>
        <div className="pros-cons-grid">
          <div className="pros-col">
            <h3 className="pros-cons-title pros">✅ Pros</h3>
            <ul className="pros-cons-list">
              {method.pros.map((pro, i) => (
                <li key={i} className="pro-item">{pro}</li>
              ))}
            </ul>
          </div>
          <div className="cons-col">
            <h3 className="pros-cons-title cons">❌ Cons</h3>
            <ul className="pros-cons-list">
              {method.cons.map((con, i) => (
                <li key={i} className="con-item">{con}</li>
              ))}
            </ul>
          </div>
        </div>
      </motion.section>

      {/* Parameters */}
      {Object.keys(method.parameters).length > 0 && (
        <motion.section
          className="analysis-section"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.2 }}
        >
          <h2 className="analysis-section-title">Parameters</h2>
          <div className="parameters-table">
            {Object.entries(method.parameters).map(([name, param]) => (
              <div key={name} className="parameter-row">
                <div className="parameter-info">
                  <code className="parameter-name">{name}</code>
                  <span className="parameter-type">{param.type}</span>
                  {"default" in param && param.default !== undefined && (
                    <span className="parameter-default">
                      default: <code>{String(param.default)}</code>
                    </span>
                  )}
                </div>
                {param.description && (
                  <p className="parameter-desc">{param.description}</p>
                )}
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Interpretation Guide */}
      {Object.keys(method.interpretation_guide).length > 0 && (
        <motion.section
          className="analysis-section"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.25 }}
        >
          <h2 className="analysis-section-title">Interpretation Guide</h2>
          <div className="interpretation-grid">
            {method.interpretation_guide.buy_signal && (
              <div className="interp-item interp-buy">
                <span className="interp-label">Buy Signal</span>
                <span className="interp-value">{method.interpretation_guide.buy_signal}</span>
              </div>
            )}
            {method.interpretation_guide.sell_signal && (
              <div className="interp-item interp-sell">
                <span className="interp-label">Sell Signal</span>
                <span className="interp-value">{method.interpretation_guide.sell_signal}</span>
              </div>
            )}
            {method.interpretation_guide.hold_signal && (
              <div className="interp-item interp-hold">
                <span className="interp-label">Hold Signal</span>
                <span className="interp-value">{method.interpretation_guide.hold_signal}</span>
              </div>
            )}
            {method.interpretation_guide.confidence_meaning && (
              <div className="interp-item interp-confidence">
                <span className="interp-label">Confidence</span>
                <span className="interp-value">{method.interpretation_guide.confidence_meaning}</span>
              </div>
            )}
          </div>
        </motion.section>
      )}

      {/* Live Results */}
      <motion.section
        className="analysis-section"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.3 }}
      >
        <h2 className="analysis-section-title">Live Results — {symbol}</h2>
        <button
          className={`btn-run-analysis ${running ? "running" : ""}`}
          onClick={runAnalysis}
          disabled={running}
        >
          {running ? (
            <><Spinner size="sm" /> Running...</>
          ) : (
            "▶ Run This Analysis"
          )}
        </button>

        {error && (
          <div className="analysis-error">
            ⚠️ {error}
          </div>
        )}

        {result && !running && (
          <motion.div
            className="analysis-result-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="analysis-result-top">
              <SignalBadge signal={result.signal} />
              <ConfidenceMeter value={result.confidence} size="lg" />
            </div>
            <p className="analysis-result-explanation">{result.explanation}</p>
            {Object.keys(result.result).length > 0 && (
              <div className="analysis-result-data">
                {Object.entries(result.result).map(([key, val]) => (
                  <div key={key} className="result-metric">
                    <span className="result-metric-label">{key.replace(/_/g, " ")}</span>
                    <span className="result-metric-value">
                      {typeof val === "number" ? val.toFixed(4) : String(val)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {result.chart_data && Object.keys(result.chart_data).length > 0 && (
              <details className="analysis-chart-details">
                <summary>View Chart Data</summary>
                <pre className="chart-data-json">
                  {JSON.stringify(result.chart_data, null, 2)}
                </pre>
              </details>
            )}
          </motion.div>
        )}
      </motion.section>

      {/* Example Scenarios */}
      {method.example_scenarios.length > 0 && (
        <motion.section
          className="analysis-section"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.35 }}
        >
          <h2 className="analysis-section-title">Example Scenarios</h2>
          <div className="scenarios-grid">
            {method.example_scenarios.map((ex, i) => (
              <div key={i} className="scenario-card">
                <div className="scenario-title">{ex.scenario}</div>
                <div className="scenario-outcome">{ex.outcome}</div>
              </div>
            ))}
          </div>
        </motion.section>
      )}
    </div>
  );
}
