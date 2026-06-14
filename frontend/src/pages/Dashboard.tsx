import { useState, useEffect } from 'react'
import { getStockQuote, getStockHistory } from '../api/stocks'
import { searchStocks } from '../api/market'
import type { StockQuote, StockHistory } from '../api/types'
import StockChart from '../components/StockChart'
import StockTable from '../components/StockTable'
import AutocompleteSearch from '../components/AutocompleteSearch'
import NavTabs from '../components/NavTabs'
import MarketPage from './Market'

const POPULAR_STOCKS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META']

export default function Dashboard() {
  const [quote, setQuote] = useState<StockQuote | null>(null)
  const [history, setHistory] = useState<StockHistory | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL')
  const [activeTab, setActiveTab] = useState<string>('dashboard')
  const [searchResults, setSearchResults] = useState<Array<{symbol: string; shortname: string}>>([])

  async function fetchStock(symbol: string) {
    setLoading(true)
    setError(null)
    try {
      const [q, h] = await Promise.all([
        getStockQuote(symbol),
        getStockHistory(symbol, '6mo'),
      ])
      setQuote(q)
      setHistory(h)
      setSelectedSymbol(symbol)
      setSearchResults([]) // clear search results on explicit fetch
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleSearchSelect(symbol: string) {
    // First try to fetch the stock to validate it
    await fetchStock(symbol)
  }

  function handleSearchChange(query: string) {
    if (!query || query.length < 1) {
      setSearchResults([])
      return
    }
    // Update inline suggestions as user types
    searchStocks(query).then(results => {
      const formatted = results.map(r => ({
        symbol: r.symbol,
        shortname: r.shortname.length > 30 ? r.shortname.slice(0, 30) + '…' : r.shortname,
      }))
      setSearchResults(formatted)
    }).catch(() => setSearchResults([]))
  }

  useEffect(() => {
    fetchStock('AAPL')
  }, [])

  return (
    <div>
      {/* Tabs */}
      <NavTabs
        active={activeTab}
        onChange={(id: string) => setActiveTab(id)}
        tabs={[
          { id: 'dashboard', label: '📈 Stock Lookup' },
          { id: 'market', label: '📊 Market Overview' },
        ]}
      />

      {activeTab === 'dashboard' && (
        <>
          <header className="header">
            <h1>⚡ Ultron <span>Trading</span></h1>
            <div style={{ position: 'relative', maxWidth: 400 }}>
              <AutocompleteSearch
                loading={loading}
                onSelect={handleSearchSelect}
                onSearchChange={handleSearchChange}
              />
              {/* Show inline suggestions if any */}
              {searchResults.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  maxHeight: 160,
                  overflowY: 'auto',
                  zIndex: 1000,
                }}>
                  {searchResults.map((r, i) => (
                    <div
                      key={r.symbol}
                      onClick={() => {
                        handleSearchSelect(r.symbol)
                        setSearchResults([]) // close suggestions on select
                      }}
                      style={{
                        padding: '0.6rem 1rem',
                        cursor: 'pointer',
                        borderBottom: i < searchResults.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700 }}>{r.symbol}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{r.shortname}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </header>

          <main className="main">
            {error && (
              <div style={{ background: 'var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                ⚠️ {error}
              </div>
            )}

            {quote && (
              <div style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem',
                border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 700 }}>{quote.symbol}</h2>
                    <span style={{ color: 'var(--text-secondary)' }}>{quote.exchange} • {quote.currency}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--accent)' }}>
                      ${quote.price.toFixed(2)}
                    </div>
                    <div style={{
                      color: quote.regular_market_change >= 0 ? 'var(--success)' : 'var(--danger)',
                      fontSize: '1.1rem',
                      fontWeight: 600,
                    }}>
                      {quote.regular_market_change >= 0 ? '▲' : '▼'} {Math.abs(quote.regular_market_change).toFixed(2)} ({Math.abs(quote.regular_market_change_percent).toFixed(2)}%)
                    </div>
                  </div>
                </div>
                <StockTable quote={quote} />
              </div>
            )}

            {history && <StockChart data={history} />}

            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Popular Stocks</h3>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {POPULAR_STOCKS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      fetchStock(s)
                      setSearchResults([]) // clear search when picking popular
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: selectedSymbol === s ? 'var(--accent)' : 'var(--bg-card)',
                      color: selectedSymbol === s ? '#fff' : 'var(--text-primary)',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </main>
        </>
      )}

      {activeTab === 'market' && (
        <MarketPage onSelectStock={fetchStock} />
      )}
    </div>
  )
}
