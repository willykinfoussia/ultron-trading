import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getStockQuote, getStockHistory } from "../api/stocks";
import type { StockQuote, StockHistory } from "../api/types";
import type { StockTabId } from "../components/StockTabs";
import StockChart, { type ChartIndicator } from "../components/StockChart";
import StatGrid from "../components/StatGrid";
import AutocompleteSearch from "../components/AutocompleteSearch";
import StockTabs from "../components/StockTabs";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";
import CompanyProfile from "../components/CompanyProfile";
import FinancialsTable from "../components/FinancialsTable";
import HoldersChart from "../components/HoldersChart";
import NewsFeed from "../components/NewsFeed";
import EmbeddedAnalysis from "../components/EmbeddedAnalysis";
import AnalysisDetailPage from "../pages/AnalysisDetailPage";
import StarToggle from "../components/StarToggle";
import IndicatorPanel from "../components/analysis/IndicatorPanel";
import useWatchlist from "../hooks/useWatchlist";
import type { UTCTimestamp } from "lightweight-charts";

const parseTime = (dateStr: string): UTCTimestamp =>
  Math.floor(new Date(dateStr).getTime() / 1000) as UTCTimestamp;

export default function Stocks({ initialSymbol, onSymbolChange }: Props) {
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [history, setHistory] = useState<StockHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("6mo");
  const [activeTab, setActiveTab] = useState<StockTabId>("overview");
  const [analysisDetailMethodId, setAnalysisDetailMethodId] = useState<string | null>(null);
  const [activeIndicators, setActiveIndicators] = useState<Set<string>>(new Set());
  const { toggle, isWatched } = useWatchlist();

  const handleNavigateToAnalysisDetail = (methodId: string) => {
    setAnalysisDetailMethodId(methodId);
  };

  const fetchStock = useCallback(
    async (symbol: string, historyPeriod = period) => {
      setError(null);
      setLoading(true);
      setActiveTab("overview");
      setAnalysisDetailMethodId(null);
      try {
        const [q, h] = await Promise.all([
          getStockQuote(symbol),
          getStockHistory(symbol, historyPeriod),
        ]);
        setQuote(q);
        setHistory(h);
        setSelectedSymbol(symbol);
        onSymbolChange(symbol);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    },
    [onSymbolChange, period]
  );

  useEffect(() => {
    fetchStock(initialSymbol);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSymbol]);

  async function handlePeriodChange(newPeriod: string) {
    setPeriod(newPeriod);
    setLoading(true);
    try {
      const h = await getStockHistory(selectedSymbol, newPeriod);
      setHistory(h);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  // Compute indicator data based on historical data and active indicators
  const indicatorData = useMemo(() => {
    if (!history || !history.data || history.data.length === 0) {
      return [];
    }

    const closes = history.data.map(d => d.close);
    const highs = history.data.map(d => d.high);
    const lows = history.data.map(d => d.low);
    const dates = history.data.map(d => ({
      time: parseTime(d.date),
      close: d.close
    }));

    const result: ChartIndicator[] = [];

    const toLineData = (
      values: (number | null)[]
    ): ChartIndicator["data"] => {
      return dates
        .map((d, i) => {
          const value = values[i];
          if (value == null) return null;
          return { time: d.time, value };
        })
        .filter((point): point is ChartIndicator["data"][number] => point !== null);
    };

    // Process each active indicator
    activeIndicators.forEach(id => {
      switch (id) {
        case 'sma20': {
          const sma = calculateSMA(closes, 20);
          result.push({
            id: 'sma20',
            paneGroup: 'price',
            seriesType: 'line',
            data: toLineData(sma),
            options: { color: '#ff9800', lineWidth: 2 }
          });
          break;
        }
        case 'sma50': {
          const sma = calculateSMA(closes, 50);
          result.push({
            id: 'sma50',
            paneGroup: 'price',
            seriesType: 'line',
            data: toLineData(sma),
            options: { color: '#9ccc65', lineWidth: 2 }
          });
          break;
        }
        case 'sma200': {
          const sma = calculateSMA(closes, 200);
          result.push({
            id: 'sma200',
            paneGroup: 'price',
            seriesType: 'line',
            data: toLineData(sma),
            options: { color: '#ef5350', lineWidth: 2 }
          });
          break;
        }
        case 'ema9': {
          const ema = calculateEMA(closes, 9);
          result.push({
            id: 'ema9',
            paneGroup: 'price',
            seriesType: 'line',
            data: toLineData(ema),
            options: { color: '#ce93d8', lineWidth: 2 }
          });
          break;
        }
        case 'ema20': {
          const ema = calculateEMA(closes, 20);
          result.push({
            id: 'ema20',
            paneGroup: 'price',
            seriesType: 'line',
            data: toLineData(ema),
            options: { color: '#bcaaa4', lineWidth: 2 }
          });
          break;
        }
        case 'bbands': {
          const { upper, middle, lower } = calculateBollingerBands(highs, lows, closes, 20, 2);
          result.push({
            id: 'bbands-upper',
            paneGroup: 'price',
            seriesType: 'line',
            data: toLineData(upper),
            options: { color: '#90caf9', lineWidth: 1, lineStyle: 2 }
          });
          result.push({
            id: 'bbands-middle',
            paneGroup: 'price',
            seriesType: 'line',
            data: toLineData(middle),
            options: { color: '#64b5f6', lineWidth: 2 }
          });
          result.push({
            id: 'bbands-lower',
            paneGroup: 'price',
            seriesType: 'line',
            data: toLineData(lower),
            options: { color: '#90caf9', lineWidth: 1, lineStyle: 2 }
          });
          break;
        }
        case 'volume': {
          result.push({
            id: 'volume',
            paneGroup: 'volume',
            seriesType: 'histogram',
            data: history.data.map((d) => ({
              time: parseTime(d.date),
              value: d.volume,
              color: d.close >= d.open
                ? 'rgba(38, 166, 154, 0.8)'
                : 'rgba(239, 83, 80, 0.8)',
            })),
            options: {
              priceFormat: { type: 'volume' },
            },
          });
          break;
        }
        case 'rsi': {
          const rsi = calculateRSI(closes, 14);
          result.push({
            id: 'rsi',
            paneGroup: 'rsi',
            seriesType: 'line',
            data: toLineData(rsi),
            options: { color: '#ab47bc', lineWidth: 2 },
            priceLines: [
              { price: 30, color: 'rgba(38, 166, 154, 0.8)', title: '30' },
              { price: 70, color: 'rgba(239, 83, 80, 0.8)', title: '70' },
            ],
          });
          break;
        }
        case 'macd': {
          const { macdLine, signalLine, histogram } = calculateMACD(closes, 12, 26, 9);
          result.push({
            id: 'macd-line',
            paneGroup: 'macd',
            seriesType: 'line',
            data: toLineData(macdLine),
            options: { color: '#42a5f5', lineWidth: 2 },
          });
          result.push({
            id: 'macd-signal',
            paneGroup: 'macd',
            seriesType: 'line',
            data: toLineData(signalLine),
            options: { color: '#ff7043', lineWidth: 2 },
          });
          result.push({
            id: 'macd-hist',
            paneGroup: 'macd',
            seriesType: 'histogram',
            data: toLineData(histogram).map((point) => ({
              ...point,
              color: point.value >= 0
                ? 'rgba(38, 166, 154, 0.8)'
                : 'rgba(239, 83, 80, 0.8)',
            })),
          });
          break;
        }
        default:
          break;
      }
    });

    return result;
  }, [history, activeIndicators]);

  const isPositive = quote ? quote.regular_market_change >= 0 : true;

  return (
    <div className="page page-stagger">
      <motion.div>
        <PageHeader
          title="Stocks"
          meta={quote ? `${quote.exchange} · ${quote.currency}` : "Search and analyze individual stocks"}
        />
      </motion.div>

      <motion.div transition={{ ...STAGGER.transition, delay: 0.05 }}>
        <AutocompleteSearch onSelect={(symbol) => fetchStock(symbol)} loading={loading} />
      </motion.div>

      {quote && (
        <motion.div transition={{ ...STAGGER.transition, delay: 0.07 }}>
          <StockTabs activeTab={activeTab} onChange={setActiveTab} />
        </motion.div>
      )}

      {error && (
        <motion.div className="card" style={{ borderColor: "var(--danger-border)" }}>
          <div className="card-body text-danger">{error}</div>
        </motion.div>
      )}

      {loading && !quote && (
        <div className="card">
          <div className="card-body">
            <div className="loading-center" style={{ padding: "var(--sp-6)" }}>
              <Spinner size="lg" />
            </div>
            <div className="skeleton" style={{ height: 24, width: "30%", marginBottom: 16 }} />
            <div className="stat-grid">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="skeleton" style={{ height: 64 }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {quote && (
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
            >
              <motion.div
                className="card"
                transition={{ ...STAGGER.transition, delay: 0.1 }}
              >
                <div className="card-body">
                  <div className="quote-header">
                    <div>
                      <h2 className="quote-symbol">
                        {quote.long_name || quote.short_name || quote.symbol}{" "}
                        <span className="quote-symbol-ticker">({quote.symbol})</span>
                        <StarToggle
                          symbol={quote.symbol}
                          isWatched={isWatched(quote.symbol)}
                          onToggle={() => toggle(quote.symbol)}
                          size="md"
                        />
                      </h2>
                      <div className="quote-meta">
                        {quote.exchange} · {quote.currency} · {quote.market_state}
                      </div>
                    </div>
                    <div className="quote-price-block">
                      <div className="quote-price">${quote.price.toFixed(2)}</div>
                      <div className={`quote-change ${isPositive ? "positive" : "negative"}`}>
                        {isPositive ? "▲" : "▼"}{" "}
                        {Math.abs(quote.regular_market_change).toFixed(2)} (
                        {Math.abs(quote.regular_market_change_percent).toFixed(2)}%)
                      </div>
                    </div>
                  </div>
                  <StatGrid
                    items={[
                      {
                        label: "Change",
                        value: `${isPositive ? "+" : ""}${quote.regular_market_change.toFixed(2)}`,
                        tone: isPositive ? "positive" : "negative",
                      },
                      {
                        label: "Change %",
                        value: `${isPositive ? "+" : ""}${quote.regular_market_change_percent.toFixed(2)}%`,
                        tone: isPositive ? "positive" : "negative",
                      },
                      { label: "Market State", value: quote.market_state },
                      { label: "Type", value: quote.quote_type },
                    ]}
                  />
                  {/* Indicator panel above the chart */}
                  <div className="indicator-panel-container">
                    <IndicatorPanel
                      onToggleIndicator={(id, enabled) => {
                        if (enabled) {
                          setActiveIndicators(prev => new Set(prev).add(id));
                        } else {
                          setActiveIndicators(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(id);
                            return newSet;
                          });
                        }
                      }}
                      activeIndicators={activeIndicators}
                    />
                  </div>
                  {history && (
                    <motion.div transition={{ ...STAGGER.transition, delay: 0.15 }}>
                      <StockChart
                        data={history}
                        period={period}
                        onPeriodChange={handlePeriodChange}
                        loading={loading}
                        indicators={indicatorData}
                      />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
          {activeTab === "company" && (
            <motion.div
              key="company"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
            >
              <CompanyProfile symbol={quote.symbol} />
            </motion.div>
          )}
          {activeTab === "financials" && (
            <motion.div
              key="financials"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
            >
              <FinancialsTable symbol={quote.symbol} />
            </motion.div>
          )}
          {activeTab === "holders" && (
            <motion.div
              key="holders"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
            >
              <HoldersChart symbol={quote.symbol} />
            </motion.div>
          )}
          {activeTab === "analysis" && analysisDetailMethodId && (
            <motion.div
              key="analysis-detail"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
            >
              <AnalysisDetailPage
                symbol={selectedSymbol}
                methodId={analysisDetailMethodId}
                onBack={() => setAnalysisDetailMethodId(null)}
              />
            </motion.div>
          )}
          {activeTab === "analysis" && !analysisDetailMethodId && (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
            >
              <EmbeddedAnalysis
                symbol={selectedSymbol}
                onViewMethodDetail={handleNavigateToAnalysisDetail}
              />
            </motion.div>
          )}
          {activeTab === "news" && (
            <motion.div
              key="news"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
            >
              <NewsFeed symbol={selectedSymbol} />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

// Simple Moving Average
const calculateSMA = (data: number[], period: number): number[] => {
  const result: number[] = new Array(data.length).fill(null);
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j];
    }
    result[i] = sum / period;
  }
  return result;
};

// Exponential Moving Average
const calculateEMA = (data: number[], period: number): number[] => {
  const result: number[] = new Array(data.length).fill(null);
  const k = 2 / (period + 1);
  let ema: number | null = null;
  for (let i = 0; i < data.length; i++) {
    if (ema === null) {
      // First EMA is just the first data point
      ema = data[i];
    } else {
      // eslint-disable-next-line no-restricted-globals
      ema = data[i] * k + ema * (1 - k);
    }
    result[i] = ema;
  }
  return result;
};

// Bollinger Bands (based on typical price)
const calculateBollingerBands = (
  high: number[],
  low: number[],
  close: number[],
  period: number,
  stdDev: number = 2
) => {
  const typical = high.map((h, i) => (h + low[i] + close[i]) / 3);
  const sma = calculateSMA(typical, period);
  const std: number[] = new Array(typical.length).fill(0);
  for (let i = period - 1; i < typical.length; i++) {
    let sumSq = 0;
    for (let j = 0; j < period; j++) {
      const diff = typical[i - j] - sma[i];
      sumSq += diff * diff;
    }
    const variance = sumSq / period;
    std[i] = Math.sqrt(variance);
  }
  const upper = sma.map((v, i) => (v === null ? null : v + std[i] * stdDev));
  const lower = sma.map((v, i) => (v === null ? null : v - std[i] * stdDev));
  return { upper, middle: sma, lower };
};

// Relative Strength Index (Wilder's smoothing)
const calculateRSI = (closes: number[], period = 14): (number | null)[] => {
  const result: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length <= period) return result;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) avgGain += change;
    else avgLoss -= change;
  }
  avgGain /= period;
  avgLoss /= period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return result;
};

// MACD (12/26/9)
const calculateMACD = (
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
) => {
  const emaFast = calculateEMA(closes, fastPeriod);
  const emaSlow = calculateEMA(closes, slowPeriod);
  const macdLine: (number | null)[] = closes.map((_, i) => {
    const fast = emaFast[i];
    const slow = emaSlow[i];
    if (fast == null || slow == null) return null;
    return fast - slow;
  });

  const signalLine: (number | null)[] = new Array(closes.length).fill(null);
  const macdValues: number[] = [];
  const macdIndices: number[] = [];
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] != null) {
      macdValues.push(macdLine[i]!);
      macdIndices.push(i);
    }
  }

  if (macdValues.length >= signalPeriod) {
    const signalEma = calculateEMA(macdValues, signalPeriod);
    for (let j = signalPeriod - 1; j < macdValues.length; j++) {
      signalLine[macdIndices[j]] = signalEma[j];
    }
  }

  const histogram = macdLine.map((value, i) =>
    value != null && signalLine[i] != null ? value - signalLine[i]! : null
  );

  return { macdLine, signalLine, histogram };
};

const STAGGER = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const },
};

interface Props {
  initialSymbol: string;
  onSymbolChange: (symbol: string) => void;
}