import { useMemo } from 'react'
import type { MarketMover } from '../api/types'

interface Props {
  movers: MarketMover[]
  onSelect: (symbol: string) => void
}

export default function MarketHeatmap({ movers, onSelect }: Props) {
  // Use gainers + losers combined, take top 50 by abs change
  const heatmapData = useMemo(() => {
    const all = [...movers].sort((a, b) => Math.abs(b.change_percent) - Math.abs(a.change_percent)).slice(0, 60)
    // Sort into a grid layout — roughly square
    const cols = Math.ceil(Math.sqrt(all.length))
    const rows: MarketMover[][] = []
    for (let i = 0; i < all.length; i += cols) {
      rows.push(all.slice(i, i + cols))
    }
    return rows
  }, [movers])

  const maxAbs = useMemo(() => {
    const all = heatmapData.flat()
    return Math.max(...all.map((d) => Math.abs(d.change_percent)), 5)
  }, [heatmapData])

  if (heatmapData.length === 0) return null

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: '12px',
      border: '1px solid var(--border)',
      padding: '1.5rem',
    }}>
      <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        🗺️ Market Heatmap
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: '3px', minWidth: 'min-content' }}>
          {heatmapData.map((row, ri) => (
            <div key={ri} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {row.map((item) => {
                const pos = item.change_percent >= 0
                const intensity = Math.min(Math.abs(item.change_percent) / maxAbs, 1)
                const bg = pos
                  ? `rgba(112, 173, 71, ${0.15 + intensity * 0.7})`
                  : `rgba(192, 0, 0, ${0.15 + intensity * 0.7})`

                return (
                  <div
                    key={item.symbol}
                    onClick={() => onSelect(item.symbol)}
                    title={`${item.symbol}: ${item.change_percent >= 0 ? '+' : ''}${item.change_percent.toFixed(2)}% — $${item.price.toFixed(2)}`}
                    style={{
                      width: 80,
                      height: 50,
                      borderRadius: 6,
                      background: bg,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.1s, box-shadow 0.1s',
                      border: '1px solid transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: intensity > 0.5 ? '#fff' : 'var(--text-primary)',
                    }}>
                      {item.symbol}
                    </span>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      color: intensity > 0.5 ? 'rgba(255,255,255,0.9)' : pos ? 'var(--success)' : 'var(--danger)',
                    }}>
                      {pos ? '+' : ''}{item.change_percent.toFixed(1)}%
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
