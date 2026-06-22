import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { getMarketIndices, getMovers, getSectors, getFearGreed } from "../api/market";
import type { MarketIndex, MoversData, SectorPerf, FearGreed, MarketMover } from "../api/types";
import { KPICard, DashboardGrid, MiniChart, DonutChart, BarChart, DataTable } from "../components/dashboard";
import { TreemapHeatmap } from "../components/dashboard";
import AutocompleteSearch from "../components/AutocompleteSearch";
import Spinner from "../components/Spinner";
import PageHeader from "../components/PageHeader";

interface Props {
  onSelectStock: (symbol: string) => void;
}

const STAGGER = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const },
};

function formatVolume(v: number): string {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + "B";
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return v.toString();
}

function formatPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return p.toFixed(2);
}

// ── Sparkline data from indices (mock history for visual) ──
function buildSparkline(current: number, change: number, points = 20): number[] {
  const start = current - change;
  const data: number[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const base = start + (current - start) * t;
    const noise = (Math.sin(i * 1.7) * Math.abs(change) * 0.15);
    data.push(base + noise);
  }
  data[data.length - 1] = current;
  return data;
}

export default function MarketPage({ onSelectStock }: Props) {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [movers, setMovers] = useState<MoversData>({ gainers: [], losers: [], actives: [] });
  const [sectors, setSectors] = useState<SectorPerf[]>([]);
  const [fearGreed, setFearGreed] = useState<FearGreed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [idx, mov, sec, fg] = await Promise.all([
        getMarketIndices(),
        getMovers(),
        getSectors(),
        getFearGreed(),
      ]);
      setIndices(idx);
      setMovers(mov);
      setSectors(sec);
      setFearGreed(fg);
      setLastUpdate(new Date());
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Derived data ──
  const topIndex = indices[0];
  const allMovers = [...(movers.gainers || []), ...(movers.losers || []), ...(movers.actives || [])];
  const avgChange = allMovers.length > 0 ? allMovers.reduce((s, m) => s + m.change_percent, 0) / allMovers.length : 0;
  const gainersCount = movers.gainers?.length ?? 0;
  const losersCount = movers.losers?.length ?? 0;
  const totalVolume = allMovers.reduce((s, m) => s + m.volume, 0);

  const sectorBarData = (sectors || [])
    .sort((a, b) => b.change_percent - a.change_percent)
    .map((s) => ({ label: s.name, value: s.change_percent }));

  const moversColumns = (_type: "gainers" | "losers" | "actives", _label: string, tone: "positive" | "negative" | "primary") => [
    { key: "symbol", header: "Symbol", width: "35%", render: (item: MarketMover) => <span className={`data-table-symbol ${tone}`}>{item.symbol}</span> },
    { key: "price", header: "Price", align: "right" as const, width: "30%", render: (item: MarketMover) => `$${formatPrice(item.price)}` },
    { key: "change", header: "Chg%", align: "right" as const, width: "35%", render: (item: MarketMover) => {
      const pos = item.change_percent >= 0;
      return <span className={`data-table-change ${pos ? "positive" : "negative"}`}>{pos ? "+" : ""}{item.change_percent.toFixed(2)}%</span>;
    }},
  ];

  return (
    <div className="page page-dashboard">
      {/* ── Header ── */}
      <motion.div {...STAGGER}>
        <PageHeader
          title="Market Dashboard"
          meta={lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString()}` : "Live market overview"}
          actions={
            <button type="button" onClick={fetchData} disabled={loading} className="btn-ghost">
              {loading ? "⟳ Loading…" : "↻ Refresh"}
            </button>
          }
        />
      </motion.div>

      <motion.div {...STAGGER} transition={{ ...STAGGER.transition, delay: 0.03 }}>
        <AutocompleteSearch onSelect={onSelectStock} loading={loading} placeholder="Search any stock…" />
      </motion.div>

      {error && (
        <motion.div {...STAGGER} className="card" style={{ borderColor: "var(--danger-border)" }}>
          <div className="card-body text-danger">⚠️ {error}</div>
        </motion.div>
      )}

      {loading && !indices.length ? (
        <div className="loading-center"><Spinner size="lg" /></div>
      ) : (
        <>
          {/* ── KPI Row ── */}
          <motion.div {...STAGGER} transition={{ ...STAGGER.transition, delay: 0.05 }}>
            <DashboardGrid columns={4}>
              {topIndex && (
                <KPICard
                  title={topIndex.name}
                  value={formatPrice(topIndex.price)}
                  icon="📈"
                  tone={topIndex.change_percent >= 0 ? "positive" : "negative"}
                  trend={{ value: topIndex.change_percent, label: "today" }}
                />
              )}
              <KPICard
                title="Market Sentiment"
                value={fearGreed ? (fearGreed.value >= 60 ? "Greed" : fearGreed.value >= 40 ? "Neutral" : "Fear") : "—"}
                icon="🧠"
                tone={fearGreed ? (fearGreed.value >= 60 ? "positive" : fearGreed.value >= 40 ? "neutral" : "negative") : "neutral"}
                subtitle={fearGreed ? `Index: ${fearGreed.value}/100` : undefined}
              />
              <KPICard
                title="Gainers vs Losers"
                value={`${gainersCount} / ${losersCount}`}
                icon="⚖️"
                tone={gainersCount >= losersCount ? "positive" : "negative"}
                subtitle={allMovers.length > 0 ? `Avg: ${avgChange >= 0 ? "+" : ""}${avgChange.toFixed(2)}%` : undefined}
              />
              <KPICard
                title="Total Volume"
                value={formatVolume(totalVolume)}
                icon="📊"
                tone="primary"
                subtitle={`${allMovers.length} movers tracked`}
              />
            </DashboardGrid>
          </motion.div>

          {/* ── Indices Sparklines ── */}
          {indices.length > 0 && (
            <motion.div {...STAGGER} transition={{ ...STAGGER.transition, delay: 0.08 }}>
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Index Performance</span>
                </div>
                <div className="card-body">
                  <div className="index-sparkline-grid">
                    {indices.map((idx) => {
                      const pos = idx.change_percent >= 0;
                      const sparkData = buildSparkline(idx.price, idx.change);
                      return (
                        <div key={idx.symbol} className="index-sparkline-card" onClick={() => onSelectStock(idx.symbol)} role="button" tabIndex={0}>
                          <div className="index-sparkline-top">
                            <span className="index-sparkline-name">{idx.name}</span>
                            <span className={`index-sparkline-change ${pos ? "positive" : "negative"}`}>
                              {pos ? "+" : ""}{idx.change_percent.toFixed(2)}%
                            </span>
                          </div>
                          <div className="index-sparkline-price">{formatPrice(idx.price)}</div>
                          <MiniChart data={sparkData} color={pos ? "var(--success)" : "var(--danger)"} height={32} width={160} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Sector Performance + Fear & Greed ── */}
          <div className="dashboard-row">
            <motion.div {...STAGGER} transition={{ ...STAGGER.transition, delay: 0.12 }} className="dashboard-row-left">
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Sector Performance</span>
                </div>
                <div className="card-body">
                  <BarChart data={sectorBarData} height={24} />
                </div>
              </div>
            </motion.div>

            <motion.div {...STAGGER} transition={{ ...STAGGER.transition, delay: 0.14 }} className="dashboard-row-right">
              <div className="card card-fear-greed">
                <div className="card-header">
                  <span className="card-title">Fear & Greed</span>
                </div>
                <div className="card-body card-body-center">
                  {fearGreed && (
                    <>
                      <DonutChart value={fearGreed.value} size={110} label={fearGreed.label} />
                      <p className="fear-greed-desc">{fearGreed.description}</p>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* ── Market Heatmap ── */}
          <motion.div {...STAGGER} transition={{ ...STAGGER.transition, delay: 0.16 }}>
            <TreemapHeatmap movers={allMovers} onSelect={onSelectStock} />
          </motion.div>

          {/* ── Movers Tables ── */}
          <div className="dashboard-row">
            <motion.div {...STAGGER} transition={{ ...STAGGER.transition, delay: 0.18 }} className="dashboard-row-left">
              <div className="card">
                <div className="card-header">
                  <span className="card-title">🚀 Top Gainers</span>
                </div>
                <div className="card-body no-padding">
                  <DataTable
                    columns={moversColumns("gainers", "Top Gainers", "positive")}
                    data={movers.gainers || []}
                    keyExtractor={(m) => m.symbol}
                    onRowClick={(m) => onSelectStock(m.symbol)}
                    maxRows={10}
                    compact
                  />
                </div>
              </div>
            </motion.div>

            <motion.div {...STAGGER} transition={{ ...STAGGER.transition, delay: 0.2 }} className="dashboard-row-right">
              <div className="card">
                <div className="card-header">
                  <span className="card-title">📉 Top Losers</span>
                </div>
                <div className="card-body no-padding">
                  <DataTable
                    columns={moversColumns("losers", "Top Losers", "negative")}
                    data={movers.losers || []}
                    keyExtractor={(m) => m.symbol}
                    onRowClick={(m) => onSelectStock(m.symbol)}
                    maxRows={10}
                    compact
                  />
                </div>
              </div>
            </motion.div>
          </div>

          {/* ── Most Active ── */}
          <motion.div {...STAGGER} transition={{ ...STAGGER.transition, delay: 0.22 }}>
            <div className="card">
              <div className="card-header">
                <span className="card-title">🔥 Most Active</span>
              </div>
              <div className="card-body no-padding">
                <DataTable
                  columns={[
                    { key: "symbol", header: "Symbol", width: "25%", render: (item: MarketMover) => <span className="data-table-symbol primary">{item.symbol}</span> },
                    { key: "price", header: "Price", align: "right" as const, width: "25%", render: (item: MarketMover) => `$${formatPrice(item.price)}` },
                    { key: "change", header: "Chg%", align: "right" as const, width: "25%", render: (item: MarketMover) => {
                      const pos = item.change_percent >= 0;
                      return <span className={`data-table-change ${pos ? "positive" : "negative"}`}>{pos ? "+" : ""}{item.change_percent.toFixed(2)}%</span>;
                    }},
                    { key: "volume", header: "Volume", align: "right" as const, width: "25%", render: (item: MarketMover) => formatVolume(item.volume) },
                  ]}
                  data={movers.actives || []}
                  keyExtractor={(m) => m.symbol}
                  onRowClick={(m) => onSelectStock(m.symbol)}
                  maxRows={10}
                  compact
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
