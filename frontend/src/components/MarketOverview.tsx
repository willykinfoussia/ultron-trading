import type { MarketIndex, FearGreed } from '../api/types'

// ── Index Ticker ───────────────────────────────────────────────────────

interface IndexTickerProps {
  indices: MarketIndex[]
}

export default function IndexTicker({ indices }: IndexTickerProps) {
  if (!indices || indices.length === 0) return null

  return (
    <div style={{
      display: 'flex',
      gap: '1.5rem',
      overflowX: 'auto',
      padding: '0.75rem 0',
      marginBottom: '1.5rem',
      scrollbarWidth: 'none',
    }}>
      {indices.map((idx) => {
        const pos = idx.change_percent >= 0
        return (
          <div
            key={idx.name}
            style={{
              flex: '0 0 auto',
              padding: '0.6rem 1rem',
              background: 'var(--bg-card)',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              minWidth: 150,
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>
              {idx.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                {idx.price > 0 ? idx.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
              </span>
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: pos ? 'var(--success)' : 'var(--danger)',
              }}>
                {pos ? '▲' : '▼'} {Math.abs(idx.change_percent).toFixed(2)}%
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Fear & Greed Gauge ─────────────────────────────────────────────────

interface FearGreedGaugeProps {
  data: FearGreed | null
}

export function FearGreedGauge({ data }: FearGreedGaugeProps) {
  if (!data) return null

  const hue = (data.value / 100) * 120 // 0=red, 120=green
  const bg = data.value >= 60 ? 'rgba(112, 173, 71, 0.15)'
    : data.value >= 40 ? 'rgba(255, 192, 0, 0.15)'
    : 'rgba(192, 0, 0, 0.15)'

  return (
    <div style={{
      background: bg,
      borderRadius: '12px',
      border: '1px solid var(--border)',
      padding: '1.5rem',
    }}>
      <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        😱 Fear & Greed Index
      </h3>
      <div style={{
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: `conic-gradient(from 180deg, #C00000 0deg, #FFC000 60deg, #70AD47 120deg, #70AD47 180deg, transparent 180deg)`,
        position: 'relative',
        margin: '0 auto 1rem',
      }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) rotate(${(data.value / 100) * 180 - 90}deg)`,
          width: '4px',
          height: '40px',
          background: 'var(--text-primary)',
          borderRadius: 2,
          transformOrigin: 'bottom center',
        }} />
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: `hsl(${hue}, 70%, 50%)` }}>
            {data.value}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{data.label}</div>
        </div>
      </div>
      <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        {data.description}
      </p>
    </div>
  )
}
