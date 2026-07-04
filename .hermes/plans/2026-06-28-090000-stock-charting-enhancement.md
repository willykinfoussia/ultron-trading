# Stock Charting Enhancement Plan — Implementation Plan

> **For Hermes:** Implement task-by-task. Each task is self-contained.

**Goal:** Transform the basic stock price display into a professional-grade charting suite with multiple chart types, technical indicators, drawing tools, and event markers — similar to TradingView or StockCharts.com.

**Architecture:** 
- Frontend: React-based charting library (lightweight-charts recommended) 
- Backend: Extend existing yfinance data fetching + technical analysis methods
- UI: Modular indicator panels, toolbar for chart type selection, drawing tools
- Performance: Client-side calculation for most indicators (already have price data), server-only for complex profiles

**Tech Stack:** 
- lightweight-charts (TradingView lightweight) for high-performance charts
- Existing React/Framer Motion infrastructure
- yfinance for data (already integrated)
- Technical analysis methods (extend existing ones)

---

## Current State

- Basic price display exists but limited to simple line charts in AnalysisCard
- Technical analysis methods (RSI, MACD, etc.) exist in backend but only return single values
- No interactive charting, no overlays, no drawing tools
- Consensus report aggregates signals but doesn't visualize them on price chart

---

## Phase 1: Foundation & Basic Charting

**Objective:** Replace basic price display with interactive candlestick/OHLC chart using lightweight-charts.

**Files to create/modify:**
- Create: `frontend/src/components/stock-chart/StockChart.tsx` (main chart component)
- Create: `frontend/src/components/stock-chart/chart-controls/ChartTypeSelector.tsx`
- Modify: `frontend/src/pages/Stocks.tsx` (replace basic display with StockChart)
- Create: `frontend/src/styles/stock-chart.css`

**Step 1: Install lightweight-charts**
```bash
cd /home/opc/ultron-trading/frontend && npm install lightweight-charts
```

**Step 2: Create StockChart.tsx**
```tsx
import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, BarData } from 'lightweight-charts';
import type { StockQuote } from '../../api/types';

interface StockChartProps {
  symbol: string;
  historicalData: { date: string; open: number; high: number; low: number; close: number; volume: number }[];
}

export default function StockChart({ symbol, historicalData }: StockChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chart, setChart] = useState<IChartApi | null>(null);
  const [candlesSeries, setCandlesSeries] = useState<ISeriesApi<'Candlestick'>>();
  
  useEffect(() => {
    // Initialize chart
    const domElement = chartRef.current;
    if (!domElement) return;
    
    const chartInstance = createChart(domElement, {
      width: domElement.clientWidth,
      height: 400,
      layout: {
        background: { color: '#131722' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#1f2329' },
        horzLines: { color: '#1f2329' },
      },
    });
    
    setChart(chartInstance);
    
    // Add candlestick series
    const series = chartInstance.addCandlestickSeries();
    setCandlesSeries(series);
    
    // Set data
    const barData: BarData[] = historicalData.map(d => ({
      time: Math.floor(new Date(d.date).getTime() / 1000),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
    
    series.setData(barData);
    
    // Cleanup
    return () => {
      chartInstance.remove();
      setChart(null);
      setCandlesSeries(undefined);
    };
  }, [historicalData, symbol]);
  
  // Update data when historicalData changes
  useEffect(() => {
    if (candlesSeries && historicalData.length > 0) {
      const barData: BarData[] = historicalData.map(d => ({
        time: Math.floor(new Date(d.date).getTime() / 1000),
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));
      candlesSeries.setData(barData);
    }
  }, [historicalData, candlesSeries]);
  
  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
}
```

**Step 3: Create ChartTypeSelector.tsx**
```tsx
import { useState } from 'react';
import type { StockChartProps } from './StockChart';

interface ChartTypeSelectorProps {
  onChartTypeChange: (type: 'candlestick' | 'bar' | 'line' | 'area' | 'heikin-ashi') => void;
}

export default function ChartTypeSelector({ onChartTypeChange }: ChartTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<'candlestick' | 'bar' | 'line' | 'area' | 'heikin-ashi'>('candlestick');
  
  const types = [
    { id: 'candlestick', label: 'Shendan' },
    { id: 'bar', label: 'OHLC Bars' },
    { id: 'line', label: 'Line Chart' },
    { id: 'area', label: 'Area Chart' },
    { id: 'heikin-ashi', label: 'Heikin-Ashi' },
  ];
  
  return (
    <div className="chart-type-selector">
      {types.map(type => (
        <button
          key={type.id}
          onClick={() => { setSelectedType(type.id); onChartTypeChange(type.id); }}
          className={`chart-type-btn ${selectedType === type.id ? 'active' : ''}`}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
}
```

**Step 4: Add CSS**
```css
/* === Stock Chart === */
.chart-type-selector {
  display: flex;
  gap: var(--sp-1);
  margin-bottom: var(--sp-2);
}

.chart-type-btn {
  padding: var(--sp-1) var(--sp-2);
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  font-size: var(--text-xs);
  color: var(--text-2);
  cursor: pointer;
  transition: background 0.2s;
}

.chart-type-btn.active {
  background: var(--primary);
  color: var(--primary-foreground);
  border-color: var(--primary);
}

.stock-chart-container {
  position: relative;
  height: 100%;
}

/* Responsive */
@media (max-width: 768px) {
  .chart-type-selector {
    flex-wrap: wrap;
  }
}
```

**Step 5: Update Stocks.tsx to use new chart**

Replace the basic price display with:
```tsx
import StockChart from '../../components/stock-chart/StockChart';
// ... 

{quote && historicalData && (
  <>
    <ChartTypeSelector onChartTypeChange={handleChartTypeChange} />
    <StockChart 
      symbol={quote.symbol} 
      historicalData={historicalData} 
    </>
  </>
)}
```

**Verification:** 
- Chart displays candlesticks with correct OHLC data
- Chart type switching works
- Responsive on mobile/desktop
- No console errors

---

## Phase 2: Core Technical Overlays

**Objective:** Add moving averages, Bollinger Bands, and other core overlays that can be toggled.

**Files:**
- Modify: `frontend/src/components/stock-chart/StockChart.tsx` (add overlay series management)
- Create: `frontend/src/components/stock-chart/indicator-panel/IndicatorPanel.tsx`
- Extend backend technical methods to support series calculation

**Step 1: Enhance StockChart to manage overlay series**

Add state for overlay series and methods to add/remove them:
```tsx
// In StockChart.tsx
const [overlaySeries, setOverlaySeries] = useState<Map<string, ISeriesApi<any>>>(new Map());

// Function to add/remove overlay
const addOverlaySeries = (type: string, options: any, data: any[]) => {
  if (!chart) return null;
  let series: ISeriesApi<any>;
  
  switch (type) {
    case 'line':
      series = chart.addLineSeries(options);
      break;
    case 'histogram':
      series = chart.addHistogramSeries(options);
      break;
    // Add other series types as needed
    default:
      series = chart.addLineSeries(options);
  }
  
  series.setData(data);
  overlaySeries.set(type, series);
  return series;
};

const removeOverlaySeries = (type: string) => {
  const series = overlaySeries.get(type);
  if (series) {
    chart.removeSeries(series);
    overlaySeries.delete(type);
  }
};

// UseEffect to clean up overlays on chart destroy
useEffect(() => {
  return () => {
    if (chart) {
      overlaySeries.forEach(series => chart.removeSeries(series));
      chart.remove();
    }
  };
}, [chart, overlaySeries]);
```

**Step 2: Create Indicator Panel**

```tsx
// IndicatorPanel.tsx
import { useState } from 'react';

interface IndicatorPanelProps {
  onToggleIndicator: (id: string, enabled: boolean) => void;
}

const INDICATORS = [
  { id: 'sma20', label: 'SMA 20', category: 'Trend' },
  { id: 'sma50', label: 'SMA 50', category: 'Trend' },
  { id: 'ema9', label: 'EMA 9', category: 'Trend' },
  { id: 'bollinger', label: 'Bollinger Bands', category: 'Volatility' },
  { id: 'volume', label: 'Volume', category: 'Volume' },
  // ... add more
];

export default function IndicatorPanel({ onToggleIndicator }: IndicatorPanelProps) {
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  
  const toggleIndicator = (id: string) => {
    setToggles(prev => ({ ...prev, [id]: !prev[id] }));
    onToggleIndicator(id, !toggles[id]);
  };
  
  return (
    <div className="indicator-panel">
      {['Trend', 'Volatility', 'Momentum', 'Volume'].map(category => (
        <div key={category} className="indicator-category">
          <h4>{category}</h4>
          {INDICATORS
            .filter(ind => ind.category === category)
            .map(ind => (
              <label key={ind.id} className="indicator-item">
                <input
                  type="checkbox"
                  checked={toggles[ind.id] ?? false}
                  onChange={() => toggleIndicator(ind.id)}
                />
                <span>{ind.label}</span>
              </label>
            ))}
        </div>
      ))}
    </div>
  );
}
```

**Step 3: Extend backend methods to return series data**

Modify existing technical methods (in `backend/app/services/analysis/`) to optionally return full series instead of single values when `return_series=true` param is passed.

Example for SMA in `fundamental.py`:
```python
# In SMAMethod.run()
if params.get('return_series', False):
    # Return full series for charting
    sma_series = sma_indicator.sma_indicator()
    recent_sma = sma_series.tail(len(hist))
    return {
      'sma_series': [
        {
          'time': int(idx.timestamp()),
          'value': float(val)
        } for idx, val in recent_sma.items()
      ],
      'period': period
    }
else:
    # Original single value logic
    # ...
```

**Step 4: Connect frontend to backend for overlay data**

In StockChart, when an indicator is toggled:
1. Call backend API to get series data (e.g., `/api/stocks/{symbol}/indicators/sma?period=20&return_series=true`)
2. Add series to chart with appropriate options
3. Remove when toggled off

**Verification:**
- SMA/EMA lines overlay correctly on price chart
- Bollinger Bands show upper/middle/lower bands
- Toggling indicators works without performance lag
- Series update when symbol/timeframe changes

---

## Phase 3: Oscillators & Subcharts

**Objective:** Add oscillators (RSI, MACD, Stoch) in separate panels below main chart.

**Files:**
- Create: `frontend/src/components/stock-chart/subchart/Subchart.tsx`
- Modify: StockChart to manage multiple subcharts
- Extend backend methods to return oscillator series

**Step 1: Create Subchart component**

Similar to StockChart but for indicators that oscillate (typically 0-100 or -100 to +100 range).

**Step 2: Modify StockChart layout**

Instead of single chart, create a container with:
- Main price chart (50% height)
- RSI subchart (20%)
- MACD subchart (20%)
- Volume subchart (optional)

Use a flex container with fixed ratios.

**Step 3: Extend backend for oscillator series**

Methods like RSI, MACD already calculate series internally - modify to return full series when requested.

Example for RSI in `technical.py`:
```python
# In RSIMethod.run()
if params.get('return_series', False):
    recent_rsi = rsi_series.tail(60)  # or match price data length
    return {
      'rsi_series': [
        {
          'time': int(idx.timestamp()),
          'rsi': float(val)
        } for idx, val in recent_rsi.items()
      ],
      'overbought': 70,
      'oversold': 30,
      'period': period
    }
```

**Step 4: Connect frontend**

When viewing stock:
1. Fetch price data for main chart
2. Fetch indicator series data for each enabled oscillator
3. Populate respective subcharts

**Verification:**
- RSI shows 0-100 scale with 30/70 bands
- MACD shows MACD line, signal line, histogram
- All series sync with price chart zoom/pan
- Correct scaling for each indicator type

---

## Phase 4: Volume Analysis & Profile

**Objective:** Add volume-based analysis including Volume Profile and OBV.

**Files:**
- Create: `frontend/src/components/stock-chart/volume-panel/VolumePanel.tsx`
- Extend backend for volume indicators

**Step 1: Volume series (simple)**
- Volume histogram series below price chart (standard)
- Volume MA as overlay on volume histogram

**Step 2: Volume Profile (complex)**
- Requires price-volume histogram at each price level
- Calculate: for each price bin, sum volume traded at that price
- Display as horizontal histogram on right side of chart
- Show POC (Point of Control), VAH/VAL (Value Area High/Low)

**Step 3: Other volume indicators**
- OBV: cumulative volume series
- MFI: similar to RSI but uses volume
- A/D Line: accumulation/distribution

**Backend consideration:** 
- Volume Profile requires intraday or tick data for accuracy
- Daily data gives approximate profile but less precise
- May need to label as "Approximate VP (Daily Data)"

**Verification:**
- Volume histogram shows correctly
- Volume MA overlays volume histogram
- Approximate Volume Profile displays as horizontal histogram
- OBV/MFI series calculate correctly

---

## Phase 5: Advanced Patterns & Drawing Tools

**Objective:** Add Ichimoku, SuperTrend, drawing tools (trendlines, Fibonacci, etc.)

**Files:**
- Create: `frontend/src/components/stock-chart/drawing-tools/DrawingToolbar.tsx`
- Create: `frontend/src/components/stock-chart/advanced-indicators/AdvancedIndicatorsPanel.tsx`
- Implement drawing tool state management

**Step 1: Drawing tools foundation**

Using lightweight-charts' built-in tools:
- Line tool (for trendlines, support/resistance)
- Rectangle tool (for channels, zones)
- Fibonacci tool (custom implementation needed)
- Text tool (for labels)

Lightweight-charts doesn't have built-in Fibonacci, so we'd need to:
1. Use line tool with custom snap-to-price levels
2. Or create custom pane with price level inputs

**Step 2: Advanced indicators**

Implement as overlays:
- Ichimoku: 5 lines (Tenkan, Kijun, Senkou A/B, Chikou)
- SuperTrend: single line with color changes
- Parabolic SAR: dot series
- ADX: main line + DI+/DI- lines (could be 3 series)
- Aroon: up/down lines (2 series)

**Step 3: UI for drawing tools**

Toolbar with buttons:
- [✏️] Trendline
- [📐] Fibonacci Retracement
- [📊] Fibonacci Extension
- [📏] Measure Tool
- [📝] Text Label
- [🗑️] Clear All

State management:
- Store drawn objects in React state
- Serialize/deserialize for persistence
- Allow editing/deleting

**Verification:**
- Drawing tools work correctly
- Objects persist across symbol changes (if desired)
- Advanced indicators calculate and display correctly
- No performance degradation with many objects

---

## Phase 6: Event Markers

**Objective:** Add markers for dividends, splits, earnings, news, economic events.

**Files:**
- Create: `frontend/src/components/stock-chart/event-markers/EventMarkers.tsx`
- Extend backend to fetch event data

**Step 1: Event data sources**

From yfinance:
- Dividends: `ticker.dividends`
- Splits: `ticker.splits` 
- Earnings: `ticker.calendar` or `ticker.earnings` (may be limited)
- News: already implemented in news sentiment
- Economic events: would need external API (Investing.com, ForexFactory, etc.) - lower priority

**Step 2: Marker implementation**

In lightweight-charts:
- Use `createLineSource()` for vertical lines (events on date axis)
- Or use `createText()` for labels above/below chart
- Custom pane for event timeline below chart

**Step 3: Marker types**

Different visual styles:
- Dividend: 💰 green arrow up with amount
- Split: 🔁 blue arrow with ratio (e.g., "2:1")
- Earnings: 📊 purple circle with "E" 
- News: 📰 orange circle with excerpt on hover
- Economic: 🌐 gray globe with tooltip

**Step 3: Backend extension**

Add methods to fetch event data:
- `get_dividends(symbol, lookback_days)`
- `get_splits(symbol, lookback_days)`
- `get_earnings(symbol, lookback_days)`
- `get_news(symbol, lookback_days)` (already have from sentiment)
- `get_economic_events(lookback_days)` (lower priority)

**Verification:**
- Markers appear at correct dates
- Tooltips show relevant info
- Clicking markers could open detail modal
- Performance OK with many events

---

## Phase 7: Statistics Panel

**Objective:** Add collapsible panel with statistical metrics.

**Files:**
- Create: `frontend/src/components/stock-chart/stats-panel/StatsPanel.tsx`
- Calculate stats from historical data

**Step 1: Statistics to display**

Returns:
- Total return, annualized return
- Volatility (annualized std dev)
- Sharpe ratio (assuming risk-free rate)
- Max drawdown
- Beta (vs SPY or index)
- Alpha
- Sortino ratio
- Calmar ratio
- Win rate (if trades defined)

**Step 2: Implementation**

Calculate from historical price series:
```python
# Example: annualized return
total_return = (last_price / first_price) - 1
years = (last_date - first_date).days / 365.25
annualized_return = (1 + total_return) ** (1/years) - 1

# Volatility
daily_returns = [p[i]/p[i-1] - 1 for i in range(1, len(prices))]
volatility = np.std(daily_returns) * np.sqrt(252)  # annualized

# Max drawdown
peak = prices[0]
max_dd = 0
for price in prices:
    if price > peak:
        peak = price
    dd = (peak - price) / peak
    max_dd = max(max_dd, dd)
```

**Step 3: UI**

Accordion or toggle panel showing:
- Key metrics in grid format
- Time period selector (1M, 3M, 6M, YTD, 1Y, 3Y, 5Y, ALL)
- Benchmark comparison (SPQ, sector ETF, etc.)

**Verification:**
- Stats calculate correctly vs known benchmarks
- Time period selector updates calculations
- Clear labels and explanations for each metric

---

## Phase 8: Performance & Polish

**Objective:** Optimize performance, add polishing touches, ensure reliability.

**Files:**
- Various optimization passes
- Add loading states, error handling
- Implement caching where beneficial

**Step 1: Performance considerations**

- Limit data points: downsample to max 500-1000 candles for display
- Debounce resize events
- Use requestAnimationFrame for heavy calculations
- Virtualize long lists (if any)
- Web workers for heavy calculations? (probably not needed for typical stock data)

**Step 2: Features to add**
- Chart synchronization (link zoom/pan across multiple symbols)
- Screenshot/export chart as PNG
- Theme switching (light/dark)
- Custom indicator builder (advanced)
- Alert system (price crosses indicator, etc.)

**Step 3: Testing**
- Cross-browser testing (Chrome, Firefox, Safari)
- Mobile testing
- Error handling (no data, API limits, etc.)
- Load testing with many symbols

---

## Summary of Implementation Approach

| Component | Implementation Strategy | Data Source | Complexity |
|-----------|------------------------|-------------|------------|
| Chart Types (Candle, OHLC, Line, Area, HA) | lightweight-charts native series | OHLCV from yfinance | Low |
| Trend Overlays (MA, EMA, VWAP, Linear Reg) | Extend existing TA methods → return series | Price series | Low-Med |
| Volatility (BB, Keltner, ATR, Donchian) | Extend TA methods → return series/bands | Price series | Low-Med |
| Momentum (RSI, MACD, Stoch, etc.) | Extend TA methods → return oscillator series | Price/volume series | Low-Med |
| Volume Analysis | Volume histogram + OBV/MFI/VP | Volume + price series | Med (VP complex) |
| Support/Resistance | Drawing tools + horizontal levels | Price series + pivot calc | Med-High |
| Advanced Indicators | Ichimoku, SuperTrend, etc. as overlays | Price/volume series | Med |
| Drawing Tools | lightweight-charts tools + custom state | User input | High (state mgmt) |
| Event Markers | Vertical lines + tooltips | Dividends/splits/earnings/news | Low-Med |
| Statistics Panel | Calculated from price/returns series | Price series | Low-Med |

**Phased Delivery Suggestion:**
1. **Phase 1-2** (Foundation + Core Overlays) → Delivers 80% of value with moderate effort
2. **Phase 3-4** (Oscillators + Volume) → Adds important analytical tools
3. **Phase 5-8** (Advanced features) → Nice-to-have for power users

**Critical Path:** Get Phase 1-2 working first - this replaces the basic price display with a professional chart that already shows trends and volatility context.

**Backward Compatibility:** All changes are additive. Existing analysis methods and consensus report remain functional.

--- 

**Next Step:** If approved, begin with Phase 1 implementation. The foundation (basic candlestick chart with type switching) can be completed in 1-2 days and provides immediate value over the current static display.