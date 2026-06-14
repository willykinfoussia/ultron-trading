export interface StockQuote {
  symbol: string
  price: number
  currency: string
  exchange: string
  quote_type: string
  market_state: string
  regular_market_change: number
  regular_market_change_percent: number
  regular_market_time: string | null
  message?: string
}

export interface StockHistory {
  symbol: string
  period: string
  interval: string
  data: {
    date: string
    open: number
    high: number
    low: number
    close: number
    volume: number
  }[]
}

export interface SearchResult {
  symbol: string
  shortname: string
  longname: string
  quoteType: string
  exchange: string
  score: number
}

export interface MarketIndex {
  name: string
  symbol: string
  price: number
  change: number
  change_percent: number
}

export interface MarketMover {
  symbol: string
  price: number
  change: number
  change_percent: number
  volume: number
}

export interface MoversData {
  gainers: MarketMover[]
  losers: MarketMover[]
  actives: MarketMover[]
}

export interface SectorPerf {
  name: string
  symbol: string
  change_percent: number
}

export interface FearGreed {
  value: number
  label: string
  description: string
}
