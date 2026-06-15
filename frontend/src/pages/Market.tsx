import { useState, useEffect, useCallback } from "react";
import { getMarketIndices, getMovers, getSectors, getFearGreed } from "../api/market";
import type { MarketIndex, MoversData, SectorPerf, FearGreed } from "../api/types";
import IndexTicker, { FearGreedGauge } from "../components/MarketOverview";
import MoversTabs from "../components/MoversTabs";
import SectorGrid from "../components/SectorGrid";
import MarketHeatmap from "../components/MarketHeatmap";
import Spinner from "../components/Spinner";

interface Props {
  onSelectStock: (symbol: string) => void;
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

  return (
    <div className="page">
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--sp-4)",
          flexWrap: "wrap",
          gap: "var(--sp-2)",
        }}
      >
        <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700, margin: 0 }}>
          📊 Market Overview
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
          {lastUpdate && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-3)" }}>
              Updated {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="btn-ghost"
            style={{ fontSize: "var(--text-sm)", opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "⟳ Loading..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      {loading && !indices.length && (
        <div className="loading-center">
          <Spinner size="lg" />
        </div>
      )}

      {error && (
        <div className="card" style={{ marginBottom: "var(--sp-4)", borderColor: "var(--danger-border)" }}>
          <div className="card-body" style={{ color: "var(--danger)" }}>
            ⚠️ {error}
          </div>
        </div>
      )}

      {/* Index Ticker */}
      <IndexTicker indices={indices} />

      {/* Main grid */}
      <div className="split-2" style={{ marginBottom: "var(--sp-6)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
          <MoversTabs
            gainers={movers.gainers}
            losers={movers.losers}
            actives={movers.actives}
            onSelect={onSelectStock}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
          <FearGreedGauge data={fearGreed} />
        </div>
      </div>

      {/* Sectors */}
      <div style={{ marginBottom: "var(--sp-6)" }}>
        <SectorGrid sectors={sectors} />
      </div>

      {/* Heatmap */}
      <MarketHeatmap
        movers={[...movers.gainers, ...movers.losers]}
        onSelect={onSelectStock}
      />
    </div>
  );
}
