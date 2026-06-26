import { useState, useEffect, useCallback } from "react";

function InlineSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const w = 90;
  const h = 32;
  const color = positive ? "var(--success)" : "var(--danger)";
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1 || 1);

  const points = data
    .map((v: number, i: number) => {
      const x = i * step;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  const pathD = `M ${points.replace(/ /g, " L ")}`;
  const areaD = `${pathD} L ${w},${h} L 0,${h} Z`;

  return (
    <svg width={w} height={h} className="mini-sparkline">
      <defs>
        <linearGradient id={`grad-${positive ? "p" : "n"}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${positive ? "p" : "n"})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
import { motion } from "framer-motion";
import type { WatchlistItem } from "../hooks/useWatchlist";
import type { StockQuote } from "../api/types";

interface Props {
  item: WatchlistItem;
  quote: StockQuote | null;
  loading: boolean;
  onRemove: (symbol: string) => void;
  onUpdateNote: (symbol: string, note: string) => void;
  onClick: (symbol: string) => void;
  onRefresh: () => void;
}

export default function WatchlistRow({
  item,
  quote,
  loading,
  onRemove,
  onUpdateNote,
  onClick,
  onRefresh,
}: Props) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(item.note);

  useEffect(() => {
    setNoteDraft(item.note);
  }, [item.note]);

  const saveNote = useCallback(() => {
    onUpdateNote(item.symbol, noteDraft);
    setEditingNote(false);
  }, [item.symbol, noteDraft, onUpdateNote]);

  const isPositive = quote ? quote.regular_market_change >= 0 : true;
  const changeColor = isPositive ? "positive" : "negative";
  const arrow = isPositive ? "▲" : "▼";

  return (
    <motion.div
      className="watchlist-row"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      layout
    >
      {/* Left: symbol + name + note */}
      <div className="watchlist-col-main">
        <div
          className="watchlist-symbol-block"
          onClick={() => onClick(item.symbol)}
          role="button"
          tabIndex={0}
        >
          <span className="watchlist-symbol">{item.symbol}</span>
          <span className="watchlist-name">
            {quote?.short_name || quote?.long_name || "—"}
          </span>
        </div>
        {editingNote ? (
          <div className="watchlist-note-edit">
            <input
              type="text"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveNote();
                if (e.key === "Escape") {
                  setNoteDraft(item.note);
                  setEditingNote(false);
                }
              }}
              onBlur={saveNote}
              autoFocus
              placeholder="Add a note..."
              className="watchlist-note-input"
            />
          </div>
        ) : (
          <span
            className="watchlist-note"
            onClick={() => setEditingNote(true)}
            title="Click to edit"
          >
            {item.note || "Add note..."}
          </span>
        )}
      </div>

      {/* Sparkline */}
      <div className="watchlist-col-chart">
        {quote?.history_data && quote.history_data.length > 1 ? (
          <InlineSparkline
            data={quote.history_data.map((d: { close: number }) => d.close)}
            positive={isPositive}
          />
        ) : (
          <div className="watchlist-chart-loading">
            {loading ? (
              <div className="skeleton" style={{ width: 90, height: 32 }} />
            ) : (
              <span>—</span>
            )}
          </div>
        )}
      </div>

      {/* Price */}
      <div className={`watchlist-col-price ${changeColor}`}>
        {quote ? (
          <>
            <span className="watchlist-price">${quote.price.toFixed(2)}</span>
            <span className="watchlist-change">
              {arrow} {Math.abs(quote.regular_market_change).toFixed(2)} (
              {Math.abs(quote.regular_market_change_percent).toFixed(2)}%)
            </span>
          </>
        ) : loading ? (
          <div className="skeleton" style={{ width: 80, height: 16 }} />
        ) : (
          <span className="watchlist-price">—</span>
        )}
      </div>

      {/* Actions */}
      <div className="watchlist-col-actions">
        <button
          className="watchlist-refresh"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh"
        >
          ↻
        </button>
        <button
          className="watchlist-remove"
          onClick={() => onRemove(item.symbol)}
          title="Remove from watchlist"
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
}
