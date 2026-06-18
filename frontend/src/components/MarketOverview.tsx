import { motion } from "framer-motion";
import type { MarketIndex, FearGreed } from "../api/types";

interface IndexTickerProps {
  indices: MarketIndex[];
}

export default function IndexTicker({ indices }: IndexTickerProps) {
  if (!indices || indices.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as const }}
      className="index-ticker stagger-item"
    >
      {indices.map((idx) => {
        const pos = idx.change_percent >= 0;
        return (
          <motion.div
            key={idx.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.2,
              delay: indices.indexOf(idx) * 0.03,
              ease: [0.16, 1, 0.3, 1] as const,
            }}
            className="index-card"
          >
            <div className="index-card-name">{idx.name}</div>
            <div className="index-card-row">
              <span className="index-card-price">
                {idx.price > 0
                  ? idx.price.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : "—"}
              </span>
              <span className={`index-card-change ${pos ? "positive" : "negative"}`}>
                {pos ? "▲" : "▼"} {Math.abs(idx.change_percent).toFixed(2)}%
              </span>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

interface FearGreedGaugeProps {
  data: FearGreed | null;
}

export function FearGreedGauge({ data }: FearGreedGaugeProps) {
  if (!data) return null;

  const hue = (data.value / 100) * 120;
  const toneClass =
    data.value >= 60 ? "positive" : data.value >= 40 ? "neutral" : "negative";
  const rotation = (data.value / 100) * 180 - 90;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as const }}
      className="stagger-item"
    >
      <div className={`card fear-greed-card ${toneClass}`}>
        <div className="card-header">
          <span className="card-title">Fear &amp; Greed Index</span>
        </div>
        <div className="fear-greed-body">
          <div className="fear-greed-gauge-wrap">
            <div
              className="fear-greed-needle"
              style={{
                transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                transformOrigin: "bottom center",
              }}
            />
            <div className="fear-greed-center">
              <div className="fear-greed-value" style={{ color: `hsl(${hue}, 70%, 50%)` }}>
                {data.value}
              </div>
              <div className="fear-greed-label">{data.label}</div>
            </div>
          </div>
          <p className="fear-greed-desc">{data.description}</p>
        </div>
      </div>
    </motion.div>
  );
}
