export interface StockQuote {
  symbol: string
  price: number
  currency: string
  exchange: string
  quote_type: string
  market_state: string
  regular_market_change: number
  regular_market_change_percent: number
  regular_market_time: string
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
