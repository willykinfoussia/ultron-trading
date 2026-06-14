import type { StockQuote } from '../api/types'

interface Props {
  quote: StockQuote
}

export default function StockTable({ quote }: Props) {
  const isPositive = quote.regular_market_change >= 0

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '1rem',
      marginTop: '1rem',
    }}>
      <div style={{ padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '8px' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Change</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: isPositive ? 'var(--success)' : 'var(--danger)' }}>
          {isPositive ? '+' : ''}{quote.regular_market_change.toFixed(2)}
        </div>
      </div>
      <div style={{ padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '8px' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Change %</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: isPositive ? 'var(--success)' : 'var(--danger)' }}>
          {isPositive ? '+' : ''}{quote.regular_market_change_percent.toFixed(2)}%
        </div>
      </div>
      <div style={{ padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '8px' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Market State</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{quote.market_state}</div>
      </div>
      <div style={{ padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '8px' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Type</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{quote.quote_type}</div>
      </div>
    </div>
  )
}
