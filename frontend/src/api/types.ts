export interface StockQuote {
  symbol: string
  short_name: string
  long_name: string
  price: number
  currency: string
  exchange: string
  quote_type: string
  market_state: string
  regular_market_change: number
  regular_market_change_percent: number
  regular_market_time: string | null
  message?: string
  history_data?: { date: string; open: number; high: number; low: number; close: number; volume: number }[]
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
  short_name: string
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
  how_it_works: string
  pros: string[]
  cons: string[]
  interpretation_guide: {
    buy_signal: string
    sell_signal: string
    hold_signal: string
    confidence_meaning: string
  }
  example_scenarios: {
    scenario: string
    outcome: string
  }[]
}

// Consensus report types
export interface ConsensusReport {
  symbol: string
  computed_at: string
  overall: {
    score: number
    verdict: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL'
    confidence: number
    signal_distribution: { buy: number; sell: number; hold: number; neutral: number }
  }
  categories: CategoryConsensus[]
  risk_metrics: RiskMetrics
  key_metrics: KPI[]
  insights: Insight[]
  conflicts: Conflict[]
  chart_data: ConsensusChartData
  method_details: MethodDetail[]
}

export interface CategoryConsensus {
  category: string
  weight: number
  score: number
  confidence: number
  signal_counts: { buy: number; sell: number; hold: number; neutral: number }
  methods: MethodSummary[]
}

export interface RiskMetrics {
  expected_return: number
  volatility_estimate: number
  sharpe_estimate: number
  max_drawdown_estimate: number
  var_95: number
  risk_reward_ratio: number
}

export interface KPI {
  label: string
  value: string
  trend?: 'up' | 'down' | 'neutral'
  tooltip?: string
}

export interface Insight {
  type: 'bullish' | 'bearish' | 'neutral' | 'risk' | 'opportunity'
  title: string
  description: string
  confidence: number
  supporting_methods: string[]
}

export interface Conflict {
  type: 'divergence' | 'contradiction'
  categories: string[]
  description: string
  severity: 'low' | 'medium' | 'high'
}

export interface MethodDetail {
  method_id: string
  method_name: string
  category: string
  signal: string
  confidence: number
  key_result: string
  explanation: string
  weight_in_consensus: number
  chart_data_preview?: unknown
}

export interface ConsensusChartData {
  signal_distribution: { buy: number; sell: number; hold: number; neutral: number }
  method_confidences: number[]
  category_scores: { category: string; score: number }[]
  // Additional charts can be added here as needed
}

export interface MethodSummary {
  method_id: string;
  method_name: string;
  category: string;
  signal: string;
  confidence: number;
  key_result: string;
  explanation: string;
}

// AI Dynamic Report (Hermes) types
export type AIBlockType = "text" | "indicator" | "chart" | "risk_gauge" | "table";
export type AIStatus = "positive" | "negative" | "neutral";

export interface AIBlock {
  type: AIBlockType;
  title?: string;
  content?: string;
  label?: string;
  value?: string;
  status?: AIStatus;
  chart_type?: "bar" | "pie" | "line";
  data?: { name: string; value: number }[];
  score?: number;
  headers?: string[];
  rows?: string[][];
}

export interface AIReport {
  verdict: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
  confidence: number;
  summary: string;
  buy_thesis: string;
  sell_thesis: string;
  blocks: AIBlock[];
  source?: string;
}