import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useWatchlist from "../hooks/useWatchlist";
import type { StockQuote } from "../api/types";
import WatchlistRow from "../components/WatchlistRow";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";

type SortKey = "symbol" | "price" | "change_pct" | "added_at";
type SortDir = "asc" | "desc";

interface Props {
  onNavigateToStock: (symbol: string) => void;
}

export default function Watchlist({ onNavigateToStock }: Props) {
  const { items, remove, updateNote, clear } = useWatchlist();
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("added_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const fetchAllQuotes = useCallback(async () => {
    if (items.length === 0) return;
    setLoading(true);
    try {
      const symbols = items.map((i) => i.symbol);
      const results = await Promise.all(
        symbols.map(async (sym) => {
          try {
            const res = await fetch(`/api/stocks/${sym}/quote`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            // Also fetch history for sparkline (1mo)
            let history_data: { close: number }[] = [];
            try {
              const histRes = await fetch(`/api/stocks/${sym}/history?period=1mo`);
              if (histRes.ok) {
                const hist = await histRes.json();
                if (hist.data && Array.isArray(hist.data)) {
                  history_data = hist.data.map((d: { close: number }) => ({ close: d.close }));
                }
              }
            } catch {
              // ignore
            }

            return {
              symbol: sym,
              quote: { ...data, history_data },
            };
          } catch {
            return null;
          }
        })
      );

      const newQuotes: Record<string, StockQuote> = {};
      for (const r of results) {
        if (r) newQuotes[r.symbol] = r.quote;
      }
      setQuotes((prev) => ({ ...prev, ...newQuotes }));
    } finally {
      setLoading(false);
    }
  }, [items]);

  useEffect(() => {
    fetchAllQuotes();
  }, [fetchAllQuotes]);

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("desc");
      }
    },
    [sortKey]
  );

  const sortedItems = useMemo(() => {
    const sorted = [...items];
    sorted.sort((a, b) => {
      const qa = quotes[a.symbol];
      const qb = quotes[b.symbol];
      let va: number | string = "";
      let vb: number | string = "";
      switch (sortKey) {
        case "symbol":
          va = a.symbol;
          vb = b.symbol;
          break;
        case "price":
          va = qa?.price ?? 0;
          vb = qb?.price ?? 0;
          break;
        case "change_pct":
          va = qa?.regular_market_change_percent ?? 0;
          vb = qb?.regular_market_change_percent ?? 0;
          break;
        case "added_at":
          va = new Date(a.added_at).getTime();
          vb = new Date(b.added_at).getTime();
          break;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [items, quotes, sortKey, sortDir]);

  const SortHeader = ({ label, keyName }: { label: string; keyName: SortKey }) => (
    <th
      className={`watchlist-th ${sortKey === keyName ? "active" : ""}`}
      onClick={() => toggleSort(keyName)}
    >
      {label}
      {sortKey === keyName && (
        <span className="watchlist-sort-arrow">{sortDir === "asc" ? "▲" : "▼"}</span>
      )}
    </th>
  );

  return (
    <div className="page page-stagger">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <PageHeader
          title="Watchlist"
          meta={
            items.length === 0
              ? "Track your favorite stocks"
              : `${items.length} stock${items.length > 1 ? "s" : ""} tracked`
          }
        />
      </motion.div>

      {items.length === 0 ? (
        <motion.div
          className="watchlist-empty"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="watchlist-empty-icon">⭐</div>
          <h2 className="watchlist-empty-title">Your watchlist is empty</h2>
          <p className="watchlist-empty-desc">
            Add stocks from the Market or Stocks pages by clicking the ★ icon next to any symbol.
          </p>
          <button className="btn-primary" onClick={() => onNavigateToStock("AAPL")}>
            Browse stocks
          </button>
        </motion.div>
      ) : (
        <motion.div
          className="watchlist-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {/* Toolbar */}
          <div className="watchlist-toolbar">
            <div className="watchlist-toolbar-left">
              <button className="btn-sm" onClick={fetchAllQuotes} disabled={loading}>
                {loading ? <Spinner size="sm" /> : "↻ Refresh"}
              </button>
            </div>
            <div className="watchlist-toolbar-right">
              {items.length > 0 && (
                <button className="btn-sm btn-danger" onClick={clear}>
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="watchlist-table-wrapper">
            <div className="watchlist-table">
              {/* Header */}
              <div className="watchlist-header">
                <SortHeader label="Symbol" keyName="symbol" />
                <SortHeader label="Chart" keyName="added_at" />
                <SortHeader label="Price" keyName="price" />
                <SortHeader label="Change %" keyName="change_pct" />
                <th className="watchlist-th">Actions</th>
              </div>

              {/* Rows */}
              <AnimatePresence mode="popLayout">
                {sortedItems.map((item) => (
                  <WatchlistRow
                    key={item.symbol}
                    item={item}
                    quote={quotes[item.symbol] || null}
                    loading={loading && !quotes[item.symbol]}
                    onRemove={remove}
                    onUpdateNote={updateNote}
                    onClick={onNavigateToStock}
                    onRefresh={fetchAllQuotes}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
