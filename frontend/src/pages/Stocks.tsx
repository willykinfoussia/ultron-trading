import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getStockQuote, getStockHistory } from "../api/stocks";
import type { StockQuote, StockHistory } from "../api/types";
import type { StockTabId } from "../components/StockTabs";
import StockChart from "../components/StockChart";
import StatGrid from "../components/StatGrid";
import AutocompleteSearch from "../components/AutocompleteSearch";
import StockTabs from "../components/StockTabs";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";
import CompanyProfile from "../components/CompanyProfile";
import FinancialsTable from "../components/FinancialsTable";
import HoldersChart from "../components/HoldersChart";
import NewsFeed from "../components/NewsFeed";
import EmbeddedAnalysis from "../components/EmbeddedAnalysis";
import RelatedStocks from "../components/RelatedStocks";

const STAGGER = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const },
};

interface Props {
  initialSymbol: string;
  onSymbolChange: (symbol: string) => void;
}

export default function Stocks({ initialSymbol, onSymbolChange }: Props) {
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [history, setHistory] = useState<StockHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("6mo");
  const [activeTab, setActiveTab] = useState<StockTabId>("overview");

  const fetchStock = useCallback(
    async (symbol: string, historyPeriod = period) => {
      setError(null);
      setLoading(true);
      setActiveTab("overview");
      try {
        const [q, h] = await Promise.all([
          getStockQuote(symbol),
          getStockHistory(symbol, historyPeriod),
        ]);
        setQuote(q);
        setHistory(h);
        setSelectedSymbol(symbol);
        onSymbolChange(symbol);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    },
    [onSymbolChange, period],
  );

  useEffect(() => {
    fetchStock(initialSymbol);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSymbol]);

  async function handlePeriodChange(newPeriod: string) {
    setPeriod(newPeriod);
    setLoading(true);
    try {
      const h = await getStockHistory(selectedSymbol, newPeriod);
      setHistory(h);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  const isPositive = quote ? quote.regular_market_change >= 0 : true;

  return (
    <div className="page page-stagger">
      <motion.div {...STAGGER}>
        <PageHeader
          title="Stocks"
          meta={quote ? `${quote.exchange} · ${quote.currency}` : "Search and analyze individual stocks"}
        />
      </motion.div>

      <motion.div {...STAGGER} transition={{ ...STAGGER.transition, delay: 0.05 }}>
        <AutocompleteSearch onSelect={(symbol) => fetchStock(symbol)} loading={loading} />
      </motion.div>

      {quote && (
        <motion.div {...STAGGER} transition={{ ...STAGGER.transition, delay: 0.07 }}>
          <StockTabs activeTab={activeTab} onChange={setActiveTab} />
        </motion.div>
      )}

      {error && (
        <motion.div {...STAGGER} className="card" style={{ borderColor: "var(--danger-border)" }}>
          <div className="card-body text-danger">{error}</div>
        </motion.div>
      )}

      {loading && !quote && (
        <div className="card">
          <div className="card-body">
            <div className="loading-center" style={{ padding: "var(--sp-6)" }}>
              <Spinner size="lg" />
            </div>
            <div className="skeleton" style={{ height: 24, width: "30%", marginBottom: 16 }} />
            <div className="stat-grid">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="skeleton" style={{ height: 64 }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {quote && (
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
            >
              <motion.div
                className="card"
                {...STAGGER}
                transition={{ ...STAGGER.transition, delay: 0.1 }}
              >
                <div className="card-body">
                  <div className="quote-header">
                    <div>
                      <h2 className="quote-symbol">{quote.long_name || quote.short_name || quote.symbol} <span className="quote-symbol-ticker">({quote.symbol})</span></h2>
                      <div className="quote-meta">
                        {quote.exchange} · {quote.currency} · {quote.market_state}
                      </div>
                    </div>
                    <div className="quote-price-block">
                      <div className="quote-price">${quote.price.toFixed(2)}</div>
                      <div className={`quote-change ${isPositive ? "positive" : "negative"}`}>
                        {isPositive ? "▲" : "▼"}{" "}
                        {Math.abs(quote.regular_market_change).toFixed(2)} (
                        {Math.abs(quote.regular_market_change_percent).toFixed(2)}%)
                      </div>
                    </div>
                  </div>
                  <StatGrid
                    items={[
                      {
                        label: "Change",
                        value: `${isPositive ? "+" : ""}${quote.regular_market_change.toFixed(2)}`,
                        tone: isPositive ? "positive" : "negative",
                      },
                      {
                        label: "Change %",
                        value: `${isPositive ? "+" : ""}${quote.regular_market_change_percent.toFixed(2)}%`,
                        tone: isPositive ? "positive" : "negative",
                      },
                      { label: "Market State", value: quote.market_state },
                      { label: "Type", value: quote.quote_type },
                    ]}
                  />
                </div>
              </motion.div>

              {history && (
                <motion.div
                  {...STAGGER}
                  transition={{ ...STAGGER.transition, delay: 0.15 }}
                >
                  <StockChart
                    data={history}
                    period={period}
                    onPeriodChange={handlePeriodChange}
                    loading={loading}
                  />
                </motion.div>
              )}

              <motion.div
                {...STAGGER}
                transition={{ ...STAGGER.transition, delay: 0.2 }}
              >
                <RelatedStocks symbol={selectedSymbol} onSelect={fetchStock} />
              </motion.div>
            </motion.div>
          )}

          {activeTab === "company" && (
            <motion.div
              key="company"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
            >
              <CompanyProfile symbol={quote.symbol} />
            </motion.div>
          )}

          {activeTab === "financials" && (
            <motion.div
              key="financials"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
            >
              <FinancialsTable symbol={quote.symbol} />
            </motion.div>
          )}

          {activeTab === "holders" && (
            <motion.div
              key="holders"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
            >
              <HoldersChart symbol={quote.symbol} />
            </motion.div>
          )}

          {activeTab === "analysis" && (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
            >
              <EmbeddedAnalysis symbol={selectedSymbol} />
            </motion.div>
          )}

          {activeTab === "news" && (
            <motion.div
              key="news"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
            >
              <NewsFeed symbol={selectedSymbol} />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
