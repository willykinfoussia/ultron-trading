import { useState, useEffect, useCallback } from 'react'
import { getMarketIndices, getMovers, getSectors, getFearGreed } from '../api/market'
import type { MarketIndex, MoversData, SectorPerf, FearGreed } from '../api/types'
import IndexTicker, { FearGreedGauge } from '../components/MarketOverview'
import MoversTabs from '../components/MoversTabs'
import SectorGrid from '../components/SectorGrid'
import MarketHeatmap from '../components/MarketHeatmap'

interface Props {
  onSelectStock: (symbol: string) => void
}

export default function MarketPage({ onSelectStock }: Props) {
  const [indices, setIndices] = useState<MarketIndex[]>([])
  const [movers, setMovers] = useState<MoversData>({ gainers: [], losers: [], actives: [] })
  const [sectors, setSectors] = useState<SectorPerf[]>([])
  const [fearGreed, setFearGreed] = useState<FearGreed | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [idx, mov, sec, fg] = await Promise.all([
        getMarketIndices(),
        getMovers(),
        getSectors(),
        getFearGreed(),
      ])
      setIndices(idx)
      setMovers(mov)
      setSectors(sec)
      setFearGreed(fg)
      setLastUpdate(new Date())
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60_000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading && !indices.length) {
    return (
      <div className="loading-spinner">
        <div>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
          <div>Loading market data...</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>📊 Market Overview</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {lastUpdate && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Updated {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.8rem',
              opacity: loading ? 0.6 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? '⟳ Loading...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="error-banner">⚠️ {error}</div>}

      {/* Index Ticker */}
      <IndexTicker indices={indices} />

      {/* Main grid — responsive */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 300px',
        gap: '1.5rem',
        marginBottom: '2rem',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
          <MoversTabs
            gainers={movers.gainers}
            losers={movers.losers}
            actives={movers.actives}
            onSelect={onSelectStock}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <FearGreedGauge data={fearGreed} />
        </div>
      </div>

      {/* Sectors */}
      <div style={{ marginBottom: '2rem' }}>
        <SectorGrid sectors={sectors} />
      </div>

      {/* Heatmap */}
      <MarketHeatmap
        movers={[...movers.gainers, ...movers.losers]}
        onSelect={onSelectStock}
      />
    </div>
  )
}
