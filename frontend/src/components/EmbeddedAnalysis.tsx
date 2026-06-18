import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AnalysisResult } from "../api/types";
import AnalysisCard from "./analysis/AnalysisCard";
import Spinner from "../components/Spinner";

interface AnalysisMethodDef {
  method_id: string;
  method_name: string;
  category: string;
  description: string;
}

const AVAILABLE_METHODS: AnalysisMethodDef[] = [
  {
    method_id: "rsi",
    method_name: "Relative Strength Index",
    category: "technical",
    description:
      "Measures momentum on a 0-100 scale. Values below 30 suggest oversold (buy), above 70 suggest overbought (sell).",
  },
  {
    method_id: "macd",
    method_name: "Moving Average Convergence Divergence",
    category: "technical",
    description:
      "Trend-following momentum indicator showing relationship between two EMAs of price.",
  },
  {
    method_id: "bollinger",
    method_name: "Bollinger Bands",
    category: "technical",
    description:
      "Price-based bands showing volatility. Price near lower band suggests buy; near upper band suggests sell.",
  },
  {
    method_id: "sma",
    method_name: "Simple Moving Average",
    category: "technical",
    description:
      "Average price over N periods. Buy signal when price crosses above SMA, sell when below.",
  },
  {
    method_id: "ema",
    method_name: "Exponential Moving Average",
    category: "technical",
    description:
      "Exponentially weighted average that reacts faster to price changes than SMA.",
  },
];

interface Props {
  symbol: string;
}

export default function EmbeddedAnalysis({ symbol }: Props) {
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [rateLimit, setRateLimit] = useState(false);

  const runAnalysis = useCallback(async () => {
    setRunning(true);
    setError(null);
    setRateLimit(false);
    try {
      const res = await fetch(`/api/analysis/${symbol}/all`);
      
      // Check for rate limit (429 status)
      if (res.status === 429) {
        setRateLimit(true);
        setRunning(false);
        return;
      }
      
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || data || []);
      } else {
        setError(
          "Analysis engine API not yet connected. Backend endpoint /api/analysis/{symbol}/all needs wiring to the analysis registry."
        );
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setRunning(false);
    }
  }, [symbol]);

  return (
    <div className="embedded-analysis">
      <div className="embedded-analysis-header">
        <div>
          <h2 className="embedded-analysis-title">Analysis — {symbol}</h2>
          <p className="embedded-analysis-subtitle">
            Run technical analysis methods on {symbol}
          </p>
        </div>
        <motion.button
          className="btn-primary"
          onClick={runAnalysis}
          disabled={running}
          whileTap={{ scale: 0.97 }}
        >
          {running ? (
            <>
              <Spinner size="sm" /> Running...
            </>
          ) : rateLimit ? (
            <>
              <Spinner size="sm" /> Rate limited
            </>
          ) : (
            "Run All Analysis"
          )}
        </motion.button>
      </div>

      {/* Rate limit notice */}
      {rateLimit && (
        <div className="rate-limit-notice">
          ⚠️ API rate limit reached. Please wait a moment and try again.
        </div>
      )}

      {/* Method listing */}
      <div className="analysis-methods-grid">
        {AVAILABLE_METHODS.map((method) => (
          <motion.div
            key={method.method_id}
            className="analysis-method-card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="analysis-method-header">
              <h4 className="analysis-method-name">{method.method_name}</h4>
              <span className="analysis-method-id">{method.method_id}</span>
            </div>
            <p className="analysis-method-desc">{method.description}</p>
          </motion.div>
        ))}
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {running && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "var(--sp-10)",
              gap: "var(--sp-3)",
            }}
          >
            <Spinner size="lg" />
            <p style={{ color: "var(--text-2)", marginTop: 12 }}>
              Running analysis for {symbol}...
            </p>
          </motion.div>
        )}

        {error && !running && (
          <motion.div
            key="error"
            className="card"
            style={{ borderColor: "var(--danger-border)" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="error-state">
              <span className="error-state-icon">⚠️</span>
              <span className="error-state-title">Analysis Error</span>
              <span className="error-state-desc">
                {error}
              </span>
              <div className="error-state-actions">
                <button className="btn-retry" onClick={runAnalysis}>
                  ↻ Retry
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {results.length > 0 && !running && (
          <motion.div
            key="results"
            className="analysis-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <h3 className="analysis-results-title">
              Results ({results.length} methods)
            </h3>
            {results.map((r, i) => (
              <AnalysisCard key={`${r.method_id}-${i}`} result={r} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
