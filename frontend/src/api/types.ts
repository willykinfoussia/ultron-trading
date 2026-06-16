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

// Company Profile
export interface CompanyProfile {
  symbol: string
  short_name: string
  long_name: string
  sector: string
  industry: string
  country: string
  website: string
  description: string
  employees: number
  market_cap: number
  currency: string
  pe_ratio: number
  eps: number
  dividend_yield: number
  beta: number
  fifty_two_week_high: number
  fifty_two_week_low: number
  day_high: number
  day_low: number
  day_open: number
  previous_close: number
  volume: number
  average_volume: number
}

// Financials
export interface CompanyFinancials {
  annual_revenue: { year: number; revenue: number }[]
  annual_income: { year: number; net_income: number }[]
  quarterly_earnings: { quarter: string; revenue: number; net_income: number }[]
  total_cash: number
  total_debt: number
  free_cash_flow: number
  profit_margin: number
  operating_margin: number
  roe: number
}

// Holders
export interface CompanyHolders {
  major_holders: { name: string; shares: number; percent: number }[]
  institutional_holders: { name: string; shares: number; percent: number }[]
  mutual_fund_holders: { name: string; shares: number; percent: number }[]
}

// News
export interface NewsItem {
  title: string
  publisher: string
  link: string
  providerPublishTime: string
  summary: string
}

// Analysis types
export interface AnalysisResult {
  method_id: string
  method_name: string
  category: string
  symbol: string
  result: Record<string, unknown>
  signal: 'buy' | 'sell' | 'hold' | 'neutral'
  confidence: number
  explanation: string
  chart_data: Record<string, unknown> | null
  computed_at: string
}

export interface AnalysisMethod {
  method_id: string
  method_name: string
  category: string
  description: string
  parameters: Record<string, { type: string; default: unknown; description: string }>
}
