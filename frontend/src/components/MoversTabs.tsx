import { useState } from 'react'
import type { MarketMover } from '../api/types'

interface Props {
  gainers: MarketMover[]
  losers: MarketMover[]
  actives: MarketMover[]
  onSelect: (symbol: string) => void
}

type Tab = 'gainers' | 'losers' | 'actives'

const TAB_CONFIG: { key: Tab; label: string; icon: string; color: string }[] = [
  { key: 'gainers', label: 'Top Gainers', icon: '🚀', color: 'var(--success)' },
  { key: 'losers', label: 'Top Losers', icon: '📉', color: 'var(--danger)' },
  { key: 'actives', label: 'Most Active', icon: '🔥', color: 'var(--accent)' },
]

export default function MoversTabs({ gainers, losers, actives, onSelect }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('gainers')

  const data: Record<Tab, MarketMover[]> = { gainers, losers, actives }
  const items = data[activeTab]
  const config = TAB_CONFIG.find((t) => t.key === activeTab)!

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: '12px',
      border: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      {/* Tab headers */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: activeTab === tab.key ? 'var(--bg-hover, #1e1e3a)' : 'transparent',
              border: 'none',
              color: activeTab === tab.key ? tab.color : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: activeTab === tab.key ? 700 : 400,
              fontSize: '0.85rem',
              borderBottom: activeTab === tab.key ? `2px solid ${tab.color}` : '2px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ maxHeight: 500, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontWeight: 600 }}>Symbol</th>
              <th style={{ padding: '0.6rem 1rem', textAlign: 'right', fontWeight: 600 }}>Price</th>
              <th style={{ padding: '0.6rem 1rem', textAlign: 'right', fontWeight: 600 }}>Change</th>
              <th style={{ padding: '0.6rem 1rem', textAlign: 'right', fontWeight: 600 }}>Volume</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const pos = item.change_percent >= 0
              return (
                <tr
                  key={item.symbol}
                  onClick={() => onSelect(item.symbol)}
                  style={{
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover, rgba(255,255,255,0.02))',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover, #1e1e3a)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'var(--bg-hover, rgba(255,255,255,0.02))')}
                >
                  <td style={{ padding: '0.5rem 1rem', fontWeight: 700, color: config.color }}>
                    {item.symbol}
                  </td>
                  <td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: 600 }}>
                    ${item.price.toFixed(2)}
                  </td>
                  <td style={{
                    padding: '0.5rem 1rem',
                    textAlign: 'right',
                    fontWeight: 600,
                    color: pos ? 'var(--success)' : 'var(--danger)',
                  }}>
                    {pos ? '+' : ''}{item.change_percent.toFixed(2)}%
                  </td>
                  <td style={{ padding: '0.5rem 1rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {formatVolume(item.volume)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function formatVolume(v: number): string {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + 'B'
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K'
  return v.toString()
}
