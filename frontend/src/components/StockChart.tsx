import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  BarSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries,
} from "lightweight-charts";
import type { StockHistory } from "../api/types";
import Spinner from "../components/Spinner";

// Chart types
type ChartType =
  | "candlestick"
  | "bar"
  | "line"
  | "area"
  | "heikin-ashi";

// Period options (matching those used elsewhere)
const PERIODS = [
  { id: "1mo", label: "1M" },
  { id: "3mo", label: "3M" },
  { id: "6mo", label: "6M" },
  { id: "1y", label: "1Y" },
  { id: "2y", label: "2Y" },
  { id: "5y", label: "5Y" },
];

// Helper: convert string date to Unix timestamp (seconds)
const parseTime = (dateStr: string): number => {
  return Math.floor(new Date(dateStr).getTime() / 1000);
};

// Helper: compute Heikin-Ashi candles from OHLC
const computeHeikinAshi = (
  data: { date: string; open: number; high: number; low: number; close: number }[]
) => {
  const ha: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
  }[] = [];

  data.forEach((d, i) => {
    const time = parseTime(d.date);
    const close = (d.open + d.high + d.low + d.close) / 4;
    let open = d.open;
    if (i === 0) {
      open = (d.open + d.close) / 2;
    } else {
      const prev = ha[i - 1];
      open = (prev.open + prev.close) / 2;
    }
    const high = Math.max(d.high, open, close);
    const low = Math.min(d.low, open, close);
    ha.push({ time, open, high, low, close });
  });
  return ha;
};

interface Props {
  data: StockHistory;
  period: string;
  onPeriodChange: (period: string) => void;
  loading?: boolean;
  /** Indicator data to overlay on the chart */
  indicators?: {
    id: string;
    data: { time: number; value: number }[];
    type: 'line' | 'histogram';
    options?: any;
  }[];
}

export default function StockChart({
  data,
  period,
  onPeriodChange,
  loading,
  indicators = [],
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chart, setChart] = useState<IChartApi | null>(null);
  // Main series (price) - candlestick, bar, line, area, or heikin-ashi
  const [priceSeries, setPriceSeries] = useState<ISeriesApi<any> | null>(null);
  // Map of overlay series by id
  const overlaySeriesMap = useRef<Map<string, ISeriesApi<any>>>(new Map());
  const [chartType, setChartType] = useState<ChartType>("candlestick");

  // Memoized data for each chart type to avoid recomputation on every render
  const candleData = useCallback(() => {
    return data.data.map((d) => ({
      time: parseTime(d.date),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
  }, [data.data]);

  const haData = useCallback(() => {
    return computeHeikinAshi(data.data);
  }, [data.data]);

  // Bar data (OHLC) - same as candle for now; could be different if we want HLC
  const barData = useCallback(() => {
    return data.data.map((d) => ({
      time: parseTime(d.date),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
  }, [data.data]);

  // Line data (close only)
  const lineData = useCallback(() => {
    return data.data.map((d) => ({
      time: parseTime(d.date),
      value: d.close,
    }));
  }, [data.data]);

  // Area data (same as line)
  const areaData = useCallback(() => {
    return data.data.map((d) => ({
      time: parseTime(d.date),
      value: d.close,
    }));
  }, [data.data]);

  // Initialize or update chart
  useEffect(() => {
    if (!containerRef.current) return;

    // Create chart if not exists
    if (!chart) {
      const chartInstance = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 400,
        layout: {
          background: { color: "#131722" },
          textColor: "#d1d4dc",
        },
        grid: {
          vertLines: { color: "#1f2329" },
          horzLines: { color: "#1f2329" },
        },
        crosshair: {
          mode: 0,
        },
        rightPriceScale: {
          borderColor: "rgba(197, 203, 206, 0.5)",
        },
        timeScale: {
          borderColor: "rgba(197, 203, 206, 0.5)",
          visible: true,
          secondsVisible: false,
        },
      });
      setChart(chartInstance);

      // Create initial price series based on default type
      let priceSeriesInstance: ISeriesApi<any>;
      switch (chartType) {
        case "candlestick":
          priceSeriesInstance = chartInstance.addSeries(CandlestickSeries);
          break;
        case "bar":
          priceSeriesInstance = chartInstance.addSeries(BarSeries);
          break;
        case "line":
          priceSeriesInstance = chartInstance.addSeries(LineSeries);
          break;
        case "area":
          priceSeriesInstance = chartInstance.addSeries(AreaSeries);
          break;
        case "heikin-ashi":
          priceSeriesInstance = chartInstance.addSeries(CandlestickSeries); // HA also uses candlestick style
          break;
      }
      setPriceSeries(priceSeriesInstance);

      // Set initial price data
      updatePriceSeriesData();
    } else {
      // Chart exists, just update price data
      updatePriceSeriesData();
    }

    // Update overlay series when indicators change
    updateOverlaySeries();

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (chart) {
        chart.applyOptions({
          width: containerRef.current?.clientWidth ?? 0,
          height: 400,
        });
      }
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Cleanup
    return () => {
      if (chart) {
        // Remove all series
        if (priceSeries) {
          chart.removeSeries(priceSeries);
          setPriceSeries(null);
        }
        overlaySeriesMap.current.forEach((series) => {
          chart.removeSeries(series);
        });
        overlaySeriesMap.current.clear();
        chart.remove();
        setChart(null);
        setPriceSeries(null);
      }
      resizeObserver.disconnect();
    };
  }, [chart, chartType, data, containerRef, indicators]);

  // Update price series data when data or chartType changes
  const updatePriceSeriesData = useCallback(() => {
    if (!priceSeries) return;

    let dataToSet: any[] = [];
    switch (chartType) {
      case "candlestick":
        dataToSet = candleData();
        break;
      case "bar":
        dataToSet = barData();
        break;
      case "line":
        dataToSet = lineData();
        break;
      case "area":
        dataToSet = areaData();
        break;
      case "heikin-ashi":
        dataToSet = haData();
        break;
    }
    priceSeries.setData(dataToSet);
  }, [chartType, priceSeries, candleData, haData, barData, lineData, areaData]);

  // Update overlay series when indicators change
  const updateOverlaySeries = useCallback(() => {
    if (!chart) return;

    const currentIds = new Set(indicators.map((ind) => ind.id));
    const existingIds = new Set(overlaySeriesMap.current.keys());

    // Remove indicators that are no longer present
    existingIds.forEach((id) => {
      if (!currentIds.has(id)) {
        const series = overlaySeriesMap.current.get(id);
        if (series) {
          chart.removeSeries(series);
          overlaySeriesMap.current.delete(id);
        }
      }
    });

    // Add or update existing indicators
    indicators.forEach((ind) => {
      const existingSeries = overlaySeriesMap.current.get(ind.id);
      if (existingSeries) {
        // Update data
        existingSeries.setData(ind.data);
      } else {
        // Create new series
        let newSeries: ISeriesApi<any>;
        switch (ind.type) {
          case "line":
            newSeries = chart.addSeries(LineSeries);
            break;
          case "histogram":
            newSeries = chart.addSeries(HistogramSeries);
            break;
          default:
            // Default to line
            newSeries = chart.addSeries(LineSeries);
        }
        // Apply options if provided
        if (ind.options) {
          newSeries.applyOptions(ind.options);
        }
        // Set data
        newSeries.setData(ind.data);
        // Store in map
        overlaySeriesMap.current.set(ind.id, newSeries);
      }
    });
  }, [chart, indicators]);

  // Change chart type
  const handleChartTypeChange = (type: ChartType) => {
    setChartType(type);
    // If chart exists, we need to replace series
    if (chart && priceSeries) {
      chart.removeSeries(priceSeries);
      let newSeries: ISeriesApi<any>;
      switch (type) {
        case "candlestick":
          newSeries = chart.addSeries(CandlestickSeries);
          break;
        case "bar":
          newSeries = chart.addSeries(BarSeries);
          break;
        case "line":
          newSeries = chart.addSeries(LineSeries);
          break;
        case "area":
          newSeries = chart.addSeries(AreaSeries);
          break;
        case "heikin-ashi":
          newSeries = chart.addSeries(CandlestickSeries);
          break;
      }
      setPriceSeries(newSeries);
      updatePriceSeriesData();
    }
  };

  if (loading) {
    return (
      <div className="chart-card chart-animate">
        <div className="card-header">
          <span className="card-title">Price History — {data.symbol}</span>
        </div>
        <div className="chart-card-body">
          <div className="loading-center" style={{ padding: "var(--sp-6)" }}>
            <Spinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.data || data.data.length === 0) {
    return (
      <div className="chart-card chart-animate">
        <div className="card-header">
          <span className="card-title">Price History — {data.symbol}</span>
        </div>
        <div className="chart-card-body">
          <div className="empty-state">No data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-card chart-animate">
      <div className="card-header">
        <span className="card-title">Price History — {data.symbol}</span>
        <div className="btn-group">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={period === p.id ? "active" : ""}
              onClick={() => onPeriodChange(p.id)}
              disabled={loading}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="btn-group chart-type-group">
          {[
            { id: "candlestick", label: "Candle" },
            { id: "bar", label: "OHLC" },
            { id: "line", label: "Line" },
            { id: "area", label: "Area" },
            { id: "heikin-ashi", label: "HA" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              className={chartType === t.id ? "active" : ""}
              onClick={() => handleChartTypeChange(t.id as ChartType as any)}
              disabled={loading}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-card-body">
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}