import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { getMarketIndices, getMovers, getSectors, getFearGreed } from "../api/market";
import type { MarketIndex, MoversData, SectorPerf, FearGreed } from "../api/types";
import IndexTicker, { FearGreedGauge } from "../components/MarketOverview";
import MoversTabs from "../components/MoversTabs";
import SectorGrid from "../components/SectorGrid";
import MarketHeatmap from "../components/MarketHeatmap";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";
import AutocompleteSearch from "../components/AutocompleteSearch";

interface Props {
  onSelectStock: (symbol: string) => void;
}

const STAGGER = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const },
};

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
    <div className="page page-stagger">
      <motion.div {...STAGGER}>
        <PageHeader
          title="Market"
          meta={lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString()}` : "Live market overview"}
          actions={
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="btn-ghost"
            >
              {loading ? "⟳ Loading…" : "↻ Refresh"}
            </button>
          }
        />
      </motion.div>
  
      <motion.div {...STAGGER} transition={{ ...STAGGER.transition, delay: 0.05 }}>
        <AutocompleteSearch 
              onSelect={onSelectStock} 
              loading={loading}
              placeholder="Search any stock…"
            />
      </motion.div>

      {loading && !indices.length && (
        <div className="loading-center">
          <Spinner size="lg" />
        </div>
      )}

      {error && (
        <motion.div {...STAGGER} className="card" style={{ borderColor: "var(--danger-border)" }}>
          <div className="card-body text-danger">⚠️ {error}</div>
        </motion.div>
      )}

      <motion.div {...STAGGER} transition={{ ...STAGGER.transition, delay: 0.05 }}>
        <IndexTicker indices={indices} />
      </motion.div>

      <motion.div
        className="split-2"
        {...STAGGER}
        transition={{ ...STAGGER.transition, delay: 0.1 }}
      >
        <MoversTabs
          gainers={movers.gainers}
          losers={movers.losers}
          actives={movers.actives}
          onSelect={onSelectStock}
        />
        <FearGreedGauge data={fearGreed} />
      </motion.div>

      <motion.div {...STAGGER} transition={{ ...STAGGER.transition, delay: 0.15 }}>
        <SectorGrid sectors={sectors} />
      </motion.div>

      <motion.div {...STAGGER} transition={{ ...STAGGER.transition, delay: 0.2 }}>
        <MarketHeatmap
          movers={[...movers.gainers, ...movers.losers]}
          onSelect={onSelectStock}
        />
      </motion.div>
    </div>
  );
}
