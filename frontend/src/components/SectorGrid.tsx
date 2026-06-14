import type { SectorPerf } from '../api/types'

interface Props {
  sectors: SectorPerf[]
}

export default function SectorGrid({ sectors }: Props) {
  if (!sectors || sectors.length === 0) return null

  // Normalize change_percent to 0-100 range for color intensity
  const maxAbs = Math.max(...sectors.map((s) => Math.abs(s.change_percent)), 3)

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: '12px',
      border: '1px solid var(--border)',
      padding: '1.5rem',
    }}>
      <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        🏭 Sector Performance
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '0.75rem',
      }}>
        {sectors.map((sector) => {
          const pos = sector.change_percent >= 0
          const intensity = Math.min(Math.abs(sector.change_percent) / maxAbs, 1)
          const bgColor = pos
            ? `rgba(112, 173, 71, ${0.05 + intensity * 0.25})`
            : `rgba(192, 0, 0, ${0.05 + intensity * 0.25})`
          const borderColor = pos
            ? `rgba(112, 173, 71, ${0.1 + intensity * 0.3})`
            : `rgba(192, 0, 0, ${0.1 + intensity * 0.3})`

          return (
            <div
              key={sector.symbol}
              style={{
                padding: '0.75rem',
                borderRadius: '10px',
                background: bgColor,
                border: `1px solid ${borderColor}`,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                {sector.name}
              </div>
              <div style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: pos ? 'var(--success)' : 'var(--danger)',
              }}>
                {pos ? '+' : ''}{sector.change_percent.toFixed(2)}%
              </div>
            </div>
          )
        })}
      </div>

      {/* Bar chart summary */}
      <div style={{ marginTop: '1.5rem' }}>
        {sectors.map((sector) => {
          const pos = sector.change_percent >= 0
          const width_pct = Math.min(Math.abs(sector.change_percent) / maxAbs * 50, 50)
          return (
            <div key={sector.symbol} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.4rem', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', width: 90, textAlign: 'right', flexShrink: 0 }}>
                {sector.name}
              </span>
              <div style={{ flex: 1, height: 20, background: 'var(--bg-primary)', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                {pos ? (
                  <>
                    <div style={{ flex: 1 }} />
                    <div style={{
                      width: `${width_pct}%`,
                      background: `linear-gradient(90deg, rgba(112,173,71,0.4), rgba(112,173,71,0.9))`,
                      borderRadius: '0 4px 4px 0',
                    }} />
                  </>
                ) : (
                  <>
                    <div style={{
                      width: `${width_pct}%`,
                      background: `linear-gradient(270deg, rgba(192,0,0,0.4), rgba(192,0,0,0.9))`,
                      borderRadius: '4px 0 0 4px',
                    }} />
                    <div style={{ flex: 1 }} />
                  </>
                )}
              </div>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: pos ? 'var(--success)' : 'var(--danger)',
                width: 55,
                flexShrink: 0,
              }}>
                {pos ? '+' : ''}{sector.change_percent.toFixed(2)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
