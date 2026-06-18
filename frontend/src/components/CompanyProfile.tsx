import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { getCompanyProfile } from "../api/stocks";
import type { CompanyProfile as CompanyProfileType } from "../api/types";

function formatNumber(value: number | undefined | null, prefix = ""): string {
  if (value == null || isNaN(value)) return "—";
  if (value >= 1e12) return `${prefix}${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `${prefix}${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${prefix}${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${prefix}${(value / 1e3).toFixed(2)}K`;
  return `${prefix}${value.toFixed(2)}`;
}

function formatPercent(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return "—";
  return `${(value * 100).toFixed(2)}%`;
}

interface Props {
  symbol: string;
}

export default function CompanyProfile({ symbol }: Props) {
  const [profile, setProfile] = useState<CompanyProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);

  const fetchProfile = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDescExpanded(false);

    getCompanyProfile(symbol)
      .then((data) => {
        if (!cancelled) {
          setProfile(data);
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
    fetchProfile();
  }, [symbol, fetchProfile]);

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
            <div className="skeleton-avatar" />
            <div className="skeleton-text" style={{ width: "40%" }} />
            <div className="skeleton-text" style={{ width: "70%" }} />
            <div className="stat-grid">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="skeleton" style={{ height: 64 }} />
              ))}
            </div>
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
          <span className="error-state-icon">🏢</span>
          <span className="error-state-title">Error loading company profile</span>
          <span className="error-state-desc">
            {error}
          </span>
          <div className="error-state-actions">
            <button className="btn-retry" onClick={fetchProfile}>
              ↻ Try again
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!profile) return null;

  const stats = [
    { label: "Market Cap", value: formatNumber(profile.market_cap, "$") },
    { label: "P/E Ratio", value: profile.pe_ratio?.toFixed(2) ?? "—" },
    { label: "EPS", value: profile.eps?.toFixed(2) ?? "—" },
    { label: "Dividend Yield", value: formatPercent(profile.dividend_yield) },
    { label: "Beta", value: profile.beta?.toFixed(2) ?? "—" },
    { label: "52W High", value: `$${profile.fifty_two_week_high?.toFixed(2) ?? "—"}` },
    { label: "52W Low", value: `$${profile.fifty_two_week_low?.toFixed(2) ?? "—"}` },
    { label: "Volume", value: formatNumber(profile.volume) },
  ];

  const description = profile.description || "";
  const isLongDesc = description.length > 200;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
    >
      {/* Company header card */}
      <div className="card" style={{ marginBottom: "var(--sp-4)" }}>
        <div className="card-body">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--sp-3)",
              marginBottom: "var(--sp-3)",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "var(--text-xl)",
                  fontWeight: 700,
                  color: "var(--text)",
                }}
              >
                {profile.long_name || profile.short_name || profile.symbol}
              </h2>
              <div
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--text-2)",
                  marginTop: 2,
                }}
              >
                {profile.symbol} · {profile.sector || "—"} · {profile.industry || "—"}
              </div>
            </div>
          </div>

          {description && (
            <div style={{ marginBottom: "var(--sp-3)" }}>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--text-2)",
                  lineHeight: "var(--lh-relaxed)",
                }}
              >
                {isLongDesc && !descExpanded
                  ? description.slice(0, 200) + "…"
                  : description}
              </motion.p>
              {isLongDesc && (
                <button
                  type="button"
                  onClick={() => setDescExpanded(!descExpanded)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--primary)",
                    fontSize: "var(--text-sm)",
                    cursor: "pointer",
                    padding: 0,
                    marginTop: 4,
                  }}
                >
                  {descExpanded ? "Show less" : "Read more"}
                </button>
              )}
            </div>
          )}

          {/* Company details row */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--sp-4)",
              fontSize: "var(--text-sm)",
              color: "var(--text-2)",
            }}
          >
            {profile.country && (
              <span>
                <strong style={{ color: "var(--text)" }}>Country:</strong>{" "}
                {profile.country}
              </span>
            )}
            {profile.employees != null && (
              <span>
                <strong style={{ color: "var(--text)" }}>Employees:</strong>{" "}
                {profile.employees.toLocaleString()}
              </span>
            )}
            {profile.website && (
              <span>
                <strong style={{ color: "var(--text)" }}>Website:</strong>{" "}
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "var(--primary)",
                    textDecoration: "none",
                  }}
                >
                  {profile.website}
                </a>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Key stats grid */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Key Statistics</span>
        </div>
        <div className="card-body">
          <div className="stat-grid">
            {stats.map((stat) => (
              <div key={stat.label} className="stat-cell">
                <div className="stat-cell-label">{stat.label}</div>
                <div className="stat-cell-value">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
