import { useState, useEffect, useCallback } from 'react'
import { getMarketIndices, getMovers, getSectors, getFearGreed } from '../api/market'
import type { MarketIndex, MoversData, SectorPerf, FearGreed } from '../api/types'
import IndexTicker, { FearGreedGauge } from "../components/MarketOverview";
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
    // Auto-refresh every 60s
    const interval = setInterval(fetchData, 60_000)
    return () => clearInterval(interval)
  }, [fetchData])

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
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
            }}
          >
            {loading ? '⟳' : '↻'} Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(192,0,0,0.15)',
          border: '1px solid var(--danger)',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          color: 'var(--danger)',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Index Ticker */}
      <IndexTicker indices={indices} />

      {/* Main grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 300px',
        gap: '1.5rem',
        marginBottom: '2rem',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Movers */}
          <MoversTabs
            gainers={movers.gainers}
            losers={movers.losers}
            actives={movers.actives}
            onSelect={onSelectStock}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Fear & Greed */}
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
