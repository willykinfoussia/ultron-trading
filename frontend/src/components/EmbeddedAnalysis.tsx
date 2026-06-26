import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAnalysisMethods, runAllAnalysis } from "../api/analysis";
import type { AnalysisMethod, AnalysisResult } from "../api/types";
import ConsensusReport from "./ConsensusReport";
import Spinner from "../components/Spinner";

interface Props {
  symbol: string;
  onViewMethodDetail?: (methodId: string) => void;
}

export default function EmbeddedAnalysis({ symbol, onViewMethodDetail }: Props) {
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [methods, setMethods] = useState<AnalysisMethod[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const m = await getAnalysisMethods();
        if (active) setMethods(m);
      } catch (err) {
        if (active) setError(String(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [symbol]);

  const runAll = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const data = await runAllAnalysis(symbol, "all");
      setResults(data);
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
          <h2 className="embedded-analysis-title">Analysis -- {symbol}</h2>
          <p className="embedded-analysis-subtitle">
            {methods.length} methods available across {new Set(methods.map(m => m.category)).size} categories
          </p>
        </div>
        <motion.button
          className="btn-primary"
          onClick={runAll}
          disabled={running || loading}
          whileTap={{ scale: 0.97 }}
        >
          {running ? (
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Spinner size="sm" />
              {" "}Running...
            </span>
          ) : (
            "Run All Analysis"
          )}
        </motion.button>
      </div>

      <div className="analysis-methods-grid">
        {methods.map((method) => (
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
            {onViewMethodDetail && (
              <button
                className="btn-view-details-sm"
                onClick={() => onViewMethodDetail(method.method_id)}
              >
                View Full Analysis
              </button>
            )}
          </motion.div>
        ))}
      </div>

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
              <span className="error-state-icon">!</span>
              <span className="error-state-title">Analysis Error</span>
              <span className="error-state-desc">{error}</span>
              <div className="error-state-actions">
                <button className="btn-retry" onClick={runAll}>Retry</button>
              </div>
            </div>
          </motion.div>
        )}

        {results.length > 0 && !running && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ConsensusReport symbol={symbol} results={results} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
