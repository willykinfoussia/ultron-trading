import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getCompanyFinancials } from "../api/stocks";
import type { CompanyFinancials } from "../api/types";

function formatCurrency(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return "—";
  if (Math.abs(value) >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

function formatPercent(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

interface Props {
  symbol: string;
}

export default function FinancialsTable({ symbol }: Props) {
  const [financials, setFinancials] = useState<CompanyFinancials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFinancials = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getCompanyFinancials(symbol)
      .then((data) => {
        if (!cancelled) {
          setFinancials(data);
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
    fetchFinancials();
  }, [symbol, fetchFinancials]);

  const revenueChartData = useMemo(() => {
    if (!financials?.annual_revenue) return [];
    return financials.annual_revenue.map((d) => ({
      year: String(d.year),
      Revenue: d.revenue / 1e9,
    }));
  }, [financials]);

  const incomeChartData = useMemo(() => {
    if (!financials?.annual_income) return [];
    return financials.annual_income.map((d) => ({
      year: String(d.year),
      "Net Income": d.net_income / 1e9,
    }));
  }, [financials]);

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
            <div className="skeleton-text" style={{ width: "30%" }} />
            <div className="skeleton-text" style={{ height: 200, width: "100%" }} />
            <div className="skeleton-text" style={{ width: "30%" }} />
            <div className="skeleton-text" style={{ height: 200, width: "100%" }} />
            <div className="skeleton-text" style={{ width: "40%" }} />
            <div className="stat-grid">
              {[1, 2, 3, 4].map((n) => (
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
          <span className="error-state-icon">📊</span>
          <span className="error-state-title">Error loading financials</span>
          <span className="error-state-desc">
            {error}
          </span>
          <div className="error-state-actions">
            <button className="btn-retry" onClick={fetchFinancials}>
              ↻ Try again
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!financials) return null;

  const keyMetrics = [
    { label: "Total Cash", value: formatCurrency(financials.total_cash) },
    { label: "Total Debt", value: formatCurrency(financials.total_debt) },
    { label: "Free Cash Flow", value: formatCurrency(financials.free_cash_flow) },
    { label: "Profit Margin", value: formatPercent(financials.profit_margin) },
    { label: "Operating Margin", value: formatPercent(financials.operating_margin) },
    { label: "ROE", value: formatPercent(financials.roe) },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
    >
      {/* Annual Revenue Chart */}
      {revenueChartData.length > 0 && (
        <div className="chart-card" style={{ marginBottom: "var(--sp-4)" }}>
          <div className="card-header">
            <span className="card-title">Annual Revenue</span>
          </div>
          <div className="chart-card-body" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueChartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="year"
                  stroke="var(--border)"
                  tick={{ fill: "var(--text-3)", fontSize: 11 }}
                  tickLine={{ stroke: "var(--border)" }}
                />
                <YAxis
                  stroke="var(--border)"
                  tick={{ fill: "var(--text-3)", fontSize: 11 }}
                  tickLine={{ stroke: "var(--border)" }}
                  tickFormatter={(v: number) => `$${v.toFixed(0)}B`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-md)",
                    color: "var(--text)",
                    fontSize: "var(--text-sm)",
                  }}
                  labelStyle={{ color: "var(--text-2)" }}
                  formatter={(value: number) => [`$${value.toFixed(2)}B`, "Revenue"]}
                />
                <Legend
                  wrapperStyle={{ fontSize: "var(--text-sm)", color: "var(--text-2)" }}
                />
                <Bar dataKey="Revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Annual Income Chart */}
      {incomeChartData.length > 0 && (
        <div className="chart-card" style={{ marginBottom: "var(--sp-4)" }}>
          <div className="card-header">
            <span className="card-title">Annual Net Income</span>
          </div>
          <div className="chart-card-body" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeChartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="year"
                  stroke="var(--border)"
                  tick={{ fill: "var(--text-3)", fontSize: 11 }}
                  tickLine={{ stroke: "var(--border)" }}
                />
                <YAxis
                  stroke="var(--border)"
                  tick={{ fill: "var(--text-3)", fontSize: 11 }}
                  tickLine={{ stroke: "var(--border)" }}
                  tickFormatter={(v: number) => `$${v.toFixed(0)}B`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-md)",
                    color: "var(--text)",
                    fontSize: "var(--text-sm)",
                  }}
                  labelStyle={{ color: "var(--text-2)" }}
                  formatter={(value: number) => [`$${value.toFixed(2)}B`, "Net Income"]}
                />
                <Legend
                  wrapperStyle={{ fontSize: "var(--text-sm)", color: "var(--text-2)" }}
                />
                <Bar dataKey="Net Income" fill="var(--success)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Quarterly Earnings Table */}
      {financials.quarterly_earnings && financials.quarterly_earnings.length > 0 && (
        <div className="card" style={{ marginBottom: "var(--sp-4)" }}>
          <div className="card-header">
            <span className="card-title">Quarterly Earnings</span>
          </div>
          <div className="card-body no-padding">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Quarter</th>
                    <th>Revenue</th>
                    <th>Net Income</th>
                  </tr>
                </thead>
                <tbody>
                  {financials.quarterly_earnings.map((q) => (
                    <tr key={q.quarter}>
                      <td style={{ fontWeight: 500 }}>{q.quarter}</td>
                      <td>{formatCurrency(q.revenue)}</td>
                      <td>{formatCurrency(q.net_income)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Key Metrics</span>
        </div>
        <div className="card-body">
          <div className="stat-grid">
            {keyMetrics.map((metric) => (
              <div key={metric.label} className="stat-cell">
                <div className="stat-cell-label">{metric.label}</div>
                <div
                  className={`stat-cell-value ${
                    metric.label === "Total Debt" && financials.total_debt
                      ? "negative"
                      : metric.label === "Free Cash Flow" && financials.free_cash_flow
                        ? financials.free_cash_flow >= 0
                          ? "positive"
                          : "negative"
                        : ""
                  }`}
                >
                  {metric.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
