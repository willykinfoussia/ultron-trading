import { useMemo } from "react";
import { motion } from "framer-motion";
import type { MarketMover } from "../api/types";

interface Props {
  movers: MarketMover[];
  onSelect: (symbol: string) => void;
}

function cellColor(pos: boolean, intensity: number): string {
  const alpha = 0.15 + intensity * 0.7;
  return pos ? `rgba(26, 205, 142, ${alpha})` : `rgba(244, 63, 94, ${alpha})`;
}

export default function MarketHeatmap({ movers, onSelect }: Props) {
  const heatmapData = useMemo(() => {
    const all = [...movers]
      .sort((a, b) => Math.abs(b.change_percent) - Math.abs(a.change_percent))
      .slice(0, 60);
    const cols = Math.ceil(Math.sqrt(all.length));
    const rows: MarketMover[][] = [];
    for (let i = 0; i < all.length; i += cols) {
      rows.push(all.slice(i, i + cols));
    }
    return rows;
  }, [movers]);

  const maxAbs = useMemo(() => {
    const all = heatmapData.flat();
    return Math.max(...all.map((d) => Math.abs(d.change_percent)), 5);
  }, [heatmapData]);

  if (heatmapData.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as const }}
      className="card stagger-item"
    >
      <div className="card-header">
        <span className="card-title">Market Heatmap</span>
      </div>
      <div className="card-body">
        <div className="heatmap-scroll">
          <div className="heatmap-grid">
            {heatmapData.map((row, ri) => (
              <motion.div
                key={ri}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.2,
                  delay: ri * 0.02,
                  ease: [0.16, 1, 0.3, 1] as const,
                }}
                className="heatmap-col"
              >
                {row.map((item) => {
                  const pos = item.change_percent >= 0;
                  const intensity = Math.min(Math.abs(item.change_percent) / maxAbs, 1);
                  const intense = intensity > 0.5;

                  return (
                    <motion.div
                      key={item.symbol}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        duration: 0.3,
                        delay: (ri * 8 + heatmapData[0].indexOf(item)) * 0.01,
                        ease: [0.16, 1, 0.3, 1] as const,
                      }}
                      className={`heatmap-cell${intense ? " intense" : ""}`}
                      style={{ background: cellColor(pos, intensity) }}
                      onClick={() => onSelect(item.symbol)}
                      title={`${item.short_name || item.symbol} (${item.symbol}): ${item.change_percent >= 0 ? "+" : ""}${item.change_percent.toFixed(2)}% — $${item.price.toFixed(2)}`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") onSelect(item.symbol);
                      }}
                    >
                      <span className="heatmap-cell-symbol">{item.short_name || item.symbol}</span>
                      <span
                        className="heatmap-cell-change"
                        style={
                          intense
                            ? undefined
                            : { color: pos ? "var(--success)" : "var(--danger)" }
                        }
                      >
                        {pos ? "+" : ""}
                        {item.change_percent.toFixed(1)}%
                      </span>
                    </motion.div>
                  );
                })}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
