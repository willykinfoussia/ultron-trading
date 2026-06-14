import type { StockQuote, StockHistory } from './types'

const API_BASE = '/api'

async function fetchJSON<T>(url: string): Promise<T> {
  console.log(`[API] GET ${url}`)
  try {
    const res = await fetch(url)
    if (!res.ok) {
      const body = await res.text()
      console.error(`[API] ← ${res.status} ${url}: ${body}`)
      throw new Error(`HTTP ${res.status}: ${body}`)
    }
    const data = await res.json()
    console.log(`[API] ← ${res.status} ${url} ✓`)
    return data as T
  } catch (err) {
    console.error(`[API] ✖ ${url}:`, err)
    throw err
  }
}

export async function getStockQuote(symbol: string): Promise<StockQuote> {
  return fetchJSON<StockQuote>(`${API_BASE}/stocks/${symbol}/quote`)
}

export async function getStockHistory(
  symbol: string,
  period = '1mo',
  interval = '1d'
): Promise<StockHistory> {
  return fetchJSON<StockHistory>(
    `${API_BASE}/stocks/${symbol}/history?period=${period}&interval=${interval}`
  )
}
