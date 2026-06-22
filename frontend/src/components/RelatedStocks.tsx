import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";

interface RelatedStock {
  symbol: string;
  short_name: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  sector: string;
}

interface RelatedResponse {
  symbol: string;
  sector: string;
  industry: string;
  count: number;
  stocks: RelatedStock[];
}

interface Props {
  symbol: string;
  onSelect: (symbol: string) => void;
}

// Mini sparkline from price history
function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const points = data.slice(-20).map((v, i, arr) => {
    const x = (i / (arr.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  const stroke = positive ? "#10b981" : "#f43f5e";
  return (
    <svg width={w} height={h} className="mini-sparkline">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(1)}B`;
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(1)}K`;
  return String(vol);
}

export default function RelatedStocks({ symbol, onSelect }: Props) {
  const [data, setData] = useState<RelatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(null);
    setSparklines({});

    fetch(`/api/stocks/${encodeURIComponent(symbol)}/related`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json) => {
        if (cancelled) return;
        setData(json);
        // Fetch sparklines for top 6 stocks
        const topStocks = json.stocks.slice(0, 6);
        Promise.all(
          topStocks.map(async (s: RelatedStock) => {
            try {
              const r = await fetch(
                `/api/stocks/${encodeURIComponent(s.symbol)}/history?period=1mo`
              );
              if (!r.ok) throw new Error("no data");
              const h = await r.json();
              const closes = h.data.map((d: { close: number }) => d.close);
              return { symbol: s.symbol, closes };
            } catch {
              return { symbol: s.symbol, closes: [] };
            }
          })
        ).then((results: { symbol: string; closes: number[] }[]) => {
          if (cancelled) return;
          const map: Record<string, number[]> = {};
          results.forEach((r: { symbol: string; closes: number[] }) => {
            if (r.closes.length > 1) map[r.symbol] = r.closes;
          });
          setSparklines(map);
        });
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const stagger = useMemo(
    () => ({
      initial: { opacity: 0, y: 8 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.2 },
    }),
    []
  );

  if (loading && !data) {
    return (
      <motion.div className="card" {...stagger}>
        <div className="card-body">
          <div className="skeleton" style={{ height: 18, width: "40%", marginBottom: 12 }} />
          <div className="related-grid-skeleton">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="skeleton" style={{ height: 80, borderRadius: 12 }} />
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  if (!data || data.stocks.length === 0) return null;

  const isPositive = (s: RelatedStock) => s.change >= 0;

  return (
    <motion.div className="card related-stocks-card" {...stagger}>
      <div className="card-body">
        <div className="related-header">
          <div>
            <h3 className="related-title">
              <span className="related-title-icon">◈</span>
              Related Stocks
            </h3>
            <div className="related-subtitle">
              <span className="sector-badge">{data.sector}</span>
              <span className="related-count">{data.count} peers</span>
            </div>
          </div>
        </div>

        <div className="related-grid">
          {data.stocks.map((s, i) => (
            <motion.button
              key={s.symbol}
              className={`related-item ${isPositive(s) ? "pos" : "neg"}`}
              onClick={() => onSelect(s.symbol)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
              whileHover={{ scale: 1.015, y: -1 }}
              whileTap={{ scale: 0.985 }}
            >
              <div className="related-item-top">
                <div className="related-symbol-row">
                  <span className="related-symbol">{s.symbol}</span>
                  <span
                    className={`related-change-badge ${
                      isPositive(s) ? "badge-pos" : "badge-neg"
                    }`}
                  >
                    {isPositive(s) ? "▲" : "▼"}{" "}
                    {Math.abs(s.change_percent).toFixed(2)}%
                  </span>
                </div>
                <span className="related-name">{s.short_name}</span>
              </div>

              <div className="related-item-bottom">
                <span className="related-price">${s.price.toFixed(2)}</span>
                <MiniSparkline
                  data={sparklines[s.symbol] || []}
                  positive={isPositive(s)}
                />
              </div>

              <div className="related-item-footer">
                <span className="related-change-amount">
                  {isPositive(s) ? "+" : ""}
                  {s.change.toFixed(2)}
                </span>
                <span className="related-vol">Vol: {formatVolume(s.volume)}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
