import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { StockHistory } from '../api/types'

interface Props {
  data: StockHistory
}

export default function StockChart({ data }: Props) {
  const chartData = data.data.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    close: d.close,
    volume: d.volume,
  }))

  const minPrice = Math.min(...chartData.map((d) => d.close))
  const maxPrice = Math.max(...chartData.map((d) => d.close))
  const isPositive = chartData.length > 1 && chartData[chartData.length - 1].close >= chartData[0].close

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: '12px',
      padding: '1.5rem',
      border: '1px solid var(--border)',
    }}>
      <h3 style={{ marginBottom: '1rem' }}>
        {data.symbol} — {data.period} Chart
      </h3>
      <div style={{ width: '100%', height: '400px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? '#70AD47' : '#C00000'} stopOpacity={0.3} />
                <stop offset="95%" stopColor={isPositive ? '#70AD47' : '#C00000'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
            <XAxis
              dataKey="date"
              stroke="#888"
              tick={{ fill: '#888', fontSize: 12 }}
              tickLine={{ stroke: '#888' }}
            />
            <YAxis
              domain={[minPrice * 0.98, maxPrice * 1.02]}
              stroke="#888"
              tick={{ fill: '#888', fontSize: 12 }}
              tickLine={{ stroke: '#888' }}
              tickFormatter={(v: number) => `$${v.toFixed(0)}`}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
              }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Close']}
            />
            <Area
              type="monotone"
              dataKey="close"
              stroke={isPositive ? '#70AD47' : '#C00000'}
              strokeWidth={2}
              fill="url(#colorPrice)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
