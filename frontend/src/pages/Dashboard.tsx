import { useState, useEffect } from 'react'
import { getStockQuote, getStockHistory } from '../api/stocks'
import type { StockQuote, StockHistory } from '../api/types'
import StockChart from '../components/StockChart'
import SearchBar from '../components/SearchBar'
import StockTable from '../components/StockTable'

const POPULAR_STOCKS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META']

export default function Dashboard() {
  const [quote, setQuote] = useState<StockQuote | null>(null)
  const [history, setHistory] = useState<StockHistory | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL')

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
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStock('AAPL')
  }, [])

  return (
    <div>
      <header className="header">
        <h1>⚡ Ultron <span>Trading</span></h1>
        <SearchBar onSearch={fetchStock} loading={loading} />
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
                onClick={() => fetchStock(s)}
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
    </div>
  )
}
