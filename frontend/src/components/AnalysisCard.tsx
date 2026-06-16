import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { AnalysisResult } from "../api/types";
import Spinner from "./Spinner";

interface AnalysisMethodDef {
  method_id: string;
  method_name: string;
  category: string;
  description: string;
  parameters: Record<string, { type: string; default: unknown; description: string }>;
}

const AVAILABLE_METHODS: AnalysisMethodDef[] = [
  {
    method_id: "rsi",
    method_name: "Relative Strength Index",
    category: "technical",
    description:
      "Measures momentum on a 0-100 scale. Values below 30 suggest oversold (buy), above 70 suggest overbought (sell).",
    parameters: {
      period: { type: "int", default: 14, description: "Lookback period" },
    },
  },
  {
    method_id: "macd",
    method_name: "Moving Average Convergence Divergence",
    category: "technical",
    description:
      "Trend-following momentum indicator showing relationship between two EMAs of price.",
    parameters: {},
  },
  {
    method_id: "bollinger",
    method_name: "Bollinger Bands",
    category: "technical",
    description:
      "Price-based bands showing volatility. Price near lower band suggests buy; near upper band suggests sell.",
    parameters: {},
  },
  {
    method_id: "sma",
    method_name: "Simple Moving Average",
    category: "technical",
    description:
      "Average price over N periods. Buy signal when price crosses above SMA, sell when below.",
    parameters: {
      period: { type: "int", default: 20, description: "Lookback period" },
    },
  },
  {
    method_id: "ema",
    method_name: "Exponential Moving Average",
    category: "technical",
    description:
      "Exponentially weighted average that reacts faster to price changes than SMA.",
    parameters: {
      period: { type: "int", default: 21, description: "Lookback period" },
    },
  },
];

function signalColor(signal: string): string {
  switch (signal) {
    case "buy":
      return "var(--success)";
    case "sell":
      return "var(--danger)";
    case "hold":
      return "var(--warning)";
    default:
      return "var(--text-2)";
  }
}

function signalLabel(signal: string): string {
  switch (signal) {
    case "buy":
      return "BUY";
    case "sell":
      return "SELL";
    case "hold":
      return "HOLD";
    default:
      return "NEUTRAL";
  }
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 70 ? "var(--success)" : pct >= 40 ? "var(--warning)" : "var(--danger)";
  return (
    <div className="analysis-confidence">
      <div className="analysis-confidence-label">
        <span>Confidence</span>
        <span style={{ color }}>{pct}%</span>
      </div>
      <div className="analysis-confidence-track">
        <motion.div
          className="analysis-confidence-fill"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
        />
      </div>
    </div>
  );
}

function AnalysisChart({
  data,

}: {
  data: Record<string, unknown>;

}) {
  const values =
    (data.values as { date: string; rsi?: number; value?: number }[]) || [];
  const chartData = values.map((v) => ({
    date: v.date.length > 10 ? v.date.slice(0, 10) : v.date,
    value: v.rsi ?? v.value ?? 0,
  }));

  const overbought = (data.overbought as number) || 70;
  const oversold = (data.oversold as number) || 30;

  return (
    <div className="analysis-chart">
      <ResponsiveContainer width="100%" height={160}>
        <LineChart
          data={chartData}
          margin={{ top: 4, right: 4, bottom: 0, left: -16 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border-subtle)"
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "var(--text-3)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "var(--text-3)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-md)",
              fontSize: 12,
            }}
          />
          <ReferenceLine
            y={overbought}
            stroke="var(--danger)"
            strokeDasharray="3 3"
          />
          <ReferenceLine
            y={oversold}
            stroke="var(--success)"
            strokeDasharray="3 3"
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--primary)"
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function AnalysisOverlayChart({ data }: { data: Record<string, unknown> }) {
  const price = (data.price as { date: string; close: number }[]) || [];
  const upper = (data.upper as { date: string; value: number }[]) || [];
  const lower = (data.lower as { date: string; value: number }[]) || [];
  const middle = (data.middle as { date: string; value: number }[]) || [];
  const sma = (data.sma as { date: string; value: number }[]) || [];
  const ema = (data.ema as { date: string; value: number }[]) || [];

  const chartData = price.map((p, i) => ({
    date: p.date.length > 10 ? p.date.slice(0, 10) : p.date,
    price: p.close,
    upper: upper[i]?.value ?? null,
    lower: lower[i]?.value ?? null,
    middle: middle[i]?.value ?? null,
    sma: sma[i]?.value ?? null,
    ema: ema[i]?.value ?? null,
  }));

  return (
    <div className="analysis-chart">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart
          data={chartData}
          margin={{ top: 4, right: 4, bottom: 0, left: -16 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border-subtle)"
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "var(--text-3)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--text-3)" }}
            tickLine={false}
            axisLine={false}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-md)",
              fontSize: 12,
            }}
          />
          {upper.length > 0 && (
            <Line
              type="monotone"
              dataKey="upper"
              stroke="var(--text-3)"
              strokeWidth={1}
              dot={false}
              strokeDasharray="4 4"
            />
          )}
          {lower.length > 0 && (
            <Line
              type="monotone"
              dataKey="lower"
              stroke="var(--text-3)"
              strokeWidth={1}
              dot={false}
              strokeDasharray="4 4"
            />
          )}
          {middle.length > 0 && (
            <Line
              type="monotone"
              dataKey="middle"
              stroke="var(--warning)"
              strokeWidth={1}
              dot={false}
            />
          )}
          {sma.length > 0 && (
            <Line
              type="monotone"
              dataKey="sma"
              stroke="var(--primary)"
              strokeWidth={1.5}
              dot={false}
            />
          )}
          {ema.length > 0 && (
            <Line
              type="monotone"
              dataKey="ema"
              stroke="var(--success)"
              strokeWidth={1.5}
              dot={false}
            />
          )}
          <Line
            type="monotone"
            dataKey="price"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AnalysisResultCard({ result }: { result: AnalysisResult }) {
  const sigColor = signalColor(result.signal);

  return (
    <motion.div
      className="analysis-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as const }}
    >
      <div className="analysis-card-header">
        <div>
          <h3 className="analysis-card-title">{result.method_name}</h3>
          <span className="analysis-card-category">{result.category}</span>
        </div>
        <span
          className="analysis-signal-badge"
          style={{
            color: sigColor,
            background: `${sigColor}18`,
            borderColor: `${sigColor}40`,
          }}
        >
          {signalLabel(result.signal)}
        </span>
      </div>

      {result.explanation && (
        <p className="analysis-card-explanation">{result.explanation}</p>
      )}

      <ConfidenceBar confidence={result.confidence} />

      {result.chart_data && result.chart_data.type === "indicator" && (
        <AnalysisChart data={result.chart_data} />
      )}

      {result.chart_data && result.chart_data.type === "overlay" && (
        <AnalysisOverlayChart data={result.chart_data} />
      )}

      {result.result && Object.keys(result.result).length > 0 && (
        <div className="analysis-metrics">
          {Object.entries(result.result).map(([key, val]) => (
            <div key={key} className="analysis-metric">
              <span className="analysis-metric-label">
                {key.replace(/_/g, " ")}
              </span>
              <span className="analysis-metric-value">
                {typeof val === "number" ? val.toFixed(2) : String(val)}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Embedded Analysis View (for Stocks page tab) ──

interface EmbeddedAnalysisProps {
  symbol: string;
}

export default function EmbeddedAnalysis({ symbol }: EmbeddedAnalysisProps) {
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const runAnalysis = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/analysis/${symbol}/all`);
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
          ) : (
            "Run All Analysis"
          )}
        </motion.button>
      </div>

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
            className="analysis-results-loading"
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
            <div
              className="card-body text-danger"
              style={{ textAlign: "center" }}
            >
              {error}
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
              <AnalysisResultCard key={`${r.method_id}-${i}`} result={r} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { AVAILABLE_METHODS };
export type { AnalysisResult };
