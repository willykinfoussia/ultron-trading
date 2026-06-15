import { useState, useEffect } from "react";
import { getStockQuote, getStockHistory } from "../api/stocks";
import type { StockQuote, StockHistory } from "../api/types";
import StockChart from "../components/StockChart";
import StockTable from "../components/StockTable";
import AutocompleteSearch from "../components/AutocompleteSearch";
import NavTabs from "../components/NavTabs";
import MarketPage from "./Market";
import Spinner from "../components/Spinner";

const POPULAR_STOCKS = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "NVDA", "META"];

export default function Dashboard() {
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [history, setHistory] = useState<StockHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  async function fetchStock(symbol: string) {
    setError(null);
    setLoading(true);
    try {
      const [q, h] = await Promise.all([
        getStockQuote(symbol),
        getStockHistory(symbol, "6mo"),
      ]);
      setQuote(q);
      setHistory(h);
      setSelectedSymbol(symbol);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStock("AAPL");
  }, []);

  return (
    <div className="page">
      {/* Internal tabs: Stock Lookup | Market Overview */}
      <NavTabs
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: "dashboard", label: "📈 Stock Lookup" },
          { id: "market", label: "📊 Market Overview" },
        ]}
      />

      {activeTab === "dashboard" && (
        <>
          {/* Search bar */}
          <div style={{ marginBottom: "var(--sp-4)" }}>
            <AutocompleteSearch onSelect={(symbol) => fetchStock(symbol)} />
          </div>

          {error && (
            <div className="card" style={{ marginBottom: "var(--sp-4)", borderColor: "var(--danger-border)" }}>
              <div className="card-body" style={{ color: "var(--danger)" }}>
                ⚠️ {error}
              </div>
            </div>
          )}

          {loading && !quote && (
            <div className="loading-center">
              <Spinner size="lg" />
            </div>
          )}

          {quote && (
            <div className="card" style={{ marginBottom: "var(--sp-6)" }}>
              <div className="card-body">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "var(--sp-4)",
                    flexWrap: "wrap",
                    gap: "var(--sp-3)",
                  }}
                >
                  <div>
                    <h2 style={{ fontSize: "var(--text-2xl)", fontWeight: 700, margin: 0 }}>
                      {quote.symbol}
                    </h2>
                    <span style={{ color: "var(--text-2)", fontSize: "var(--text-sm)" }}>
                      {quote.exchange} • {quote.currency} • {quote.market_state}
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "var(--primary)" }}>
                      ${quote.price.toFixed(2)}
                    </div>
                    <div
                      style={{
                        color: quote.regular_market_change >= 0 ? "var(--success)" : "var(--danger)",
                        fontSize: "var(--text-lg)",
                        fontWeight: 600,
                      }}
                    >
                      {quote.regular_market_change >= 0 ? "▲" : "▼"}{" "}
                      {Math.abs(quote.regular_market_change).toFixed(2)} (
                      {Math.abs(quote.regular_market_change_percent).toFixed(2)}%)
                    </div>
                  </div>
                </div>
                <StockTable quote={quote} />
              </div>
            </div>
          )}

          {history && <StockChart data={history} />}

          {/* Popular stocks */}
          {quote && (
            <div style={{ marginTop: "var(--sp-6)" }}>
              <h3
                style={{
                  marginBottom: "var(--sp-3)",
                  color: "var(--text-2)",
                  fontSize: "var(--text-sm)",
                }}
              >
                ⚡ Popular Stocks
              </h3>
              <div style={{ display: "flex", gap: "var(--sp-2)", flexWrap: "wrap" }}>
                {POPULAR_STOCKS.map((s) => (
                  <button
                    key={s}
                    onClick={() => fetchStock(s)}
                    className="btn-ghost"
                    style={{
                      fontWeight: 600,
                      fontSize: "var(--text-sm)",
                      background: selectedSymbol === s ? "var(--primary)" : undefined,
                      color: selectedSymbol === s ? "#fff" : undefined,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "market" && (
        <MarketPage
          onSelectStock={(symbol) => {
            fetchStock(symbol);
            setActiveTab("dashboard");
          }}
        />
      )}
    </div>
  );
}
