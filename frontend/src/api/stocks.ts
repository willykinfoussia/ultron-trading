import type { StockQuote, StockHistory } from './types'

const API_BASE = '/api'

export async function getStockQuote(symbol: string): Promise<StockQuote> {
  const res = await fetch(`${API_BASE}/stocks/${symbol}/quote`)
  if (!res.ok) throw new Error(`Failed to fetch quote for ${symbol}`)
  return res.json()
}

export async function getStockHistory(
  symbol: string,
  period = '1mo',
  interval = '1d'
): Promise<StockHistory> {
  const res = await fetch(
    `${API_BASE}/stocks/${symbol}/history?period=${period}&interval=${interval}`
  )
  if (!res.ok) throw new Error(`Failed to fetch history for ${symbol}`)
  return res.json()
}
