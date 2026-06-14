import type { SearchResult, MarketIndex, MoversData, SectorPerf, FearGreed } from './types'

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

// ── Search ─────────────────────────────────────────────────────────────
export async function searchStocks(query: string): Promise<SearchResult[]> {
  const data = await fetchJSON<{ results: SearchResult[] }>(`${API_BASE}/search/?q=${encodeURIComponent(query)}`)
  return data.results
}

// ── Market ─────────────────────────────────────────────────────────────
export async function getMarketIndices(): Promise<MarketIndex[]> {
  const data = await fetchJSON<{ indices: MarketIndex[] }>(`${API_BASE}/market/indices`)
  return data.indices
}

export async function getMovers(): Promise<MoversData> {
  return fetchJSON<MoversData>(`${API_BASE}/market/movers`)
}

export async function getSectors(): Promise<SectorPerf[]> {
  const data = await fetchJSON<{ sectors: SectorPerf[] }>(`${API_BASE}/market/sectors`)
  return data.sectors
}

export async function getFearGreed(): Promise<FearGreed> {
  return fetchJSON<FearGreed>(`${API_BASE}/market/fear-greed`)
}
