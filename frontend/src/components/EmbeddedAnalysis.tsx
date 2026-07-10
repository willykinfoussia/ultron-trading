import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAnalysisMethods, runAllAnalysis, getConsensusReport, getConsensusAIReport, exportConsensusPDF, exportConsensusCSV } from "../api/analysis";
import type { AnalysisMethod, AnalysisResult } from "../api/types";
import type { AIReport as BackendAIReport } from "../api/types";
import ConsensusReport from "./ConsensusReport";
import AIReport from "./AIReport";
import Spinner from "../components/Spinner";

interface Props {
  symbol: string;
  onViewMethodDetail?: (methodId: string) => void;
}

export default function EmbeddedAnalysis({ symbol, onViewMethodDetail }: Props) {
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [methods, setMethods] = useState<AnalysisMethod[]>([]);
  const [consensus, setConsensus] = useState<any>(null);
  const [consensusLoading, setConsensusLoading] = useState(false);
  const [aiReport, setAiReport] = useState<BackendAIReport | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [consensusError, setConsensusError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pdfExportLoading, setPdfExportLoading] = useState(false);
  const [csvExportLoading, setCsvExportLoading] = useState(false);

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
  }, []);

  const runAll = useCallback(async () => {
    setRunning(true);
    setError(null);
    setConsensusLoading(true);
    setConsensusError(null);
    setConsensus(null);
    setAiReport(null);
    setAiLoading(true);
    try {
      const data = await runAllAnalysis(symbol, "all");
      setResults(data);
      // Also fetch consensus
      const cons = await getConsensusReport(symbol);
      setConsensus(cons);
      // Fetch AI report from Hermes
      try {
        const ai = await getConsensusAIReport(symbol);
        setAiReport(ai);
      } catch (aiErr) {
        console.error("AI report failed:", aiErr);
      } finally {
        setAiLoading(false);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setRunning(false);
      setConsensusLoading(false);
    }
  }, [symbol]);

  const handleExportPDF = useCallback(async () => {
    setPdfExportLoading(true);
    try {
      const blob = await exportConsensusPDF(symbol);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `${symbol}_consensus_${timestamp}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setPdfExportLoading(false);
    }
  }, [symbol]);

  const handleExportCSV = useCallback(async () => {
    setCsvExportLoading(true);
    try {
      const blob = await exportConsensusCSV(symbol);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `${symbol}_consensus_${timestamp}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setCsvExportLoading(false);
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
        <div className="button-group">
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
          <motion.button
            className="btn-secondary"
            onClick={handleExportPDF}
            disabled={!consensus || pdfExportLoading || running || loading}
            whileTap={{ scale: 0.97 }}
            title="Export consensus as PDF report"
          >
            {pdfExportLoading ? (
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Spinner size="sm" />
                {" "}Exporting...
              </span>
            ) : (
              <>
                <span>📄</span> Export PDF
              </>
            )}
          </motion.button>
          <motion.button
            className="btn-secondary"
            onClick={handleExportCSV}
            disabled={!consensus || csvExportLoading || running || loading}
            whileTap={{ scale: 0.97 }}
            title="Export consensus as CSV data"
          >
            {csvExportLoading ? (
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Spinner size="sm" />
                {" "}Exporting...
              </span>
            ) : (
              <>
                <span>📊</span> Export CSV
              </>
            )}
          </motion.button>
        </div>
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

        {/* Consensus section */}
        {consensus && !consensusLoading && (
          <motion.div
            key="consensus"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ConsensusReport symbol={symbol} report={consensus} />
          </motion.div>
        )}

        {/* AI Report section (Hermes) */}
        {aiReport && !aiLoading && (
          <motion.div
            key="ai-report"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AIReport report={aiReport} />
          </motion.div>
        )}

        {aiLoading && consensus && !consensusLoading && (
          <motion.div
            key="ai-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "var(--sp-6)",
              gap: "var(--sp-3)",
            }}
          >
            <Spinner size="md" />
            <p style={{ color: "var(--text-2)", fontSize: 13 }}>Hermes is analyzing the consensus...</p>
          </motion.div>
        )}

        {consensusLoading && !consensus && (
          <motion.div
            key="consensus-loading"
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
              Computing consensus for {symbol}...
            </p>
          </motion.div>
        )}

        {consensusError && !consensusLoading && (
          <motion.div
            key="consensus-error"
            className="card"
            style={{ borderColor: "var(--danger-border)" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="error-state">
              <span className="error-state-icon">!</span>
              <span className="error-state-title">Consensus Error</span>
              <span className="error-state-desc">{consensusError}</span>
              <div className="error-state-actions">
                <button className="btn-retry" onClick={runAll}>Retry</button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Original results table (fallback) */}
        {results.length > 0 && !running && !consensus && (
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