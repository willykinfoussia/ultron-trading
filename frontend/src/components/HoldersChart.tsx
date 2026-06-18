import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { getCompanyHolders } from "../api/stocks";
import type { CompanyHolders } from "../api/types";
import Spinner from "./Spinner";

function formatShares(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return "—";
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toLocaleString();
}

function formatPercent(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return "—";
  return `${value.toFixed(2)}%`;
}

interface Props {
  symbol: string;
}

export default function HoldersChart({ symbol }: Props) {
  const [holders, setHolders] = useState<CompanyHolders | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHolders = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getCompanyHolders(symbol)
      .then((data) => {
        if (!cancelled) {
          setHolders(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(String(err));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  useEffect(() => {
    fetchHolders();
  }, [symbol, fetchHolders]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
        className="card"
      >
        <div className="skeleton-card">
          <div className="skeleton-card-header" />
          <div className="skeleton-card-body">
            <div className="loading-center" style={{ padding: "var(--sp-6)" }}>
              <Spinner size="lg" />
            </div>
            <div className="skeleton-text" style={{ height: 28, width: "35%", marginBottom: 16 }} />
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} style={{ marginBottom: 12 }}>
                <div className="skeleton-text" style={{ height: 14, width: "40%", marginBottom: 6 }} />
                <div className="skeleton-text" style={{ height: 10, width: "100%" }} />
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
        className="card"
        style={{ borderColor: "var(--danger-border)" }}
      >
        <div className="error-state">
          <span className="error-state-icon">👥</span>
          <span className="error-state-title">Error loading holders data</span>
          <span className="error-state-desc">{error}</span>
          <div className="error-state-actions">
            <button className="btn-retry" onClick={fetchHolders}>
              ↻ Try again
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!holders) return null;

  const maxMajorPercent = holders.major_holders?.length
    ? Math.max(...holders.major_holders.map((h) => h.percent))
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
    >
      {holders.major_holders && holders.major_holders.length > 0 && (
        <div className="card" style={{ marginBottom: "var(--sp-4)" }}>
          <div className="card-header">
            <span className="card-title">Major Holders</span>
          </div>
          <div className="card-body">
            {holders.major_holders.map((holder, i) => (
              <motion.div
                key={holder.name}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.25,
                  delay: i * 0.04,
                  ease: [0.16, 1, 0.3, 1] as const,
                }}
                style={{ marginBottom: 14 }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                    fontSize: "var(--text-sm)",
                  }}
                >
                  <span style={{ color: "var(--text)", fontWeight: 500 }}>
                    {holder.name}
                  </span>
                  <span style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
                    {formatPercent(holder.percent)} · {formatShares(holder.shares)}
                  </span>
                </div>
                <div className="progress-track">
                  <motion.div
                    className="progress-bar success"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${maxMajorPercent > 0 ? (holder.percent / maxMajorPercent) * 100 : 0}%`,
                    }}
                    transition={{
                      duration: 0.6,
                      delay: i * 0.05,
                      ease: [0.16, 1, 0.3, 1] as const,
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {holders.institutional_holders && holders.institutional_holders.length > 0 && (
        <div className="card" style={{ marginBottom: "var(--sp-4)" }}>
          <div className="card-header">
            <span className="card-title">Institutional Holders</span>
          </div>
          <div className="card-body no-padding">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Holder</th>
                    <th>Shares</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {holders.institutional_holders.map((h) => (
                    <tr key={h.name}>
                      <td style={{ fontWeight: 500 }}>{h.name}</td>
                      <td>{formatShares(h.shares)}</td>
                      <td>{formatPercent(h.percent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {holders.mutual_fund_holders && holders.mutual_fund_holders.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Mutual Fund Holders</span>
          </div>
          <div className="card-body no-padding">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Fund</th>
                    <th>Shares</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {holders.mutual_fund_holders.map((h) => (
                    <tr key={h.name}>
                      <td style={{ fontWeight: 500 }}>{h.name}</td>
                      <td>{formatShares(h.shares)}</td>
                      <td>{formatPercent(h.percent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
