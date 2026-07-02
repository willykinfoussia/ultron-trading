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
  type UTCTimestamp,
} from "lightweight-charts";
import type { StockHistory } from "../api/types";
import Spinner from "../components/Spinner";

type ChartType =
  | "candlestick"
  | "bar"
  | "line"
  | "area"
  | "heikin-ashi";

const PERIODS = [
  { id: "1mo", label: "1M" },
  { id: "3mo", label: "3M" },
  { id: "6mo", label: "6M" },
  { id: "1y", label: "1Y" },
  { id: "2y", label: "2Y" },
  { id: "5y", label: "5Y" },
];

const CHART_TYPES: { id: ChartType; label: string }[] = [
  { id: "candlestick", label: "Candle" },
  { id: "bar", label: "OHLC" },
  { id: "line", label: "Line" },
  { id: "area", label: "Area" },
  { id: "heikin-ashi", label: "HA" },
];

const parseTime = (dateStr: string): UTCTimestamp => {
  return Math.floor(new Date(dateStr).getTime() / 1000) as UTCTimestamp;
};

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
  indicators?: {
    id: string;
    data: { time: UTCTimestamp; value: number }[];
    type: "line" | "histogram";
    options?: Record<string, unknown>;
  }[];
}

function createPriceSeries(
  chart: IChartApi,
  chartType: ChartType
): ISeriesApi<"Candlestick" | "Bar" | "Line" | "Area"> {
  switch (chartType) {
    case "candlestick":
      return chart.addSeries(CandlestickSeries);
    case "bar":
      return chart.addSeries(BarSeries);
    case "line":
      return chart.addSeries(LineSeries);
    case "area":
      return chart.addSeries(AreaSeries);
    case "heikin-ashi":
      return chart.addSeries(CandlestickSeries);
  }
}

export default function StockChart({
  data,
  period,
  onPeriodChange,
  loading = false,
  indicators = [],
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const priceSeriesRef = useRef<ISeriesApi<"Candlestick" | "Bar" | "Line" | "Area"> | null>(null);
  const overlaySeriesMapRef = useRef<Map<string, ISeriesApi<"Line" | "Histogram">>>(new Map());
  const chartTypeRef = useRef<ChartType>("candlestick");
  const [chartType, setChartType] = useState<ChartType>("candlestick");

  const getPriceData = useCallback(
    (type: ChartType) => {
      switch (type) {
        case "candlestick":
          return data.data.map((d) => ({
            time: parseTime(d.date),
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
          }));
        case "bar":
          return data.data.map((d) => ({
            time: parseTime(d.date),
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
          }));
        case "line":
        case "area":
          return data.data.map((d) => ({
            time: parseTime(d.date),
            value: d.close,
          }));
        case "heikin-ashi":
          return computeHeikinAshi(data.data);
      }
    },
    [data.data]
  );

  chartTypeRef.current = chartType;

  // Effect 1: create chart once on mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth,
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

    chartRef.current = chart;

    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({
        width: container.clientWidth,
        height: 400,
      });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      overlaySeriesMapRef.current.clear();
      priceSeriesRef.current = null;
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // Effect 2: create or replace price series when chart type changes
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const previousSeries = priceSeriesRef.current;
    if (previousSeries) {
      chart.removeSeries(previousSeries);
    }

    const nextSeries = createPriceSeries(chart, chartType);
    nextSeries.setData(getPriceData(chartType));
    priceSeriesRef.current = nextSeries;
    chart.timeScale().fitContent();
    // getPriceData is read for the initial series payload; ongoing updates are handled in Effect 3.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartType]);

  // Effect 3: update price data when history changes (same chart type)
  useEffect(() => {
    const chart = chartRef.current;
    const priceSeries = priceSeriesRef.current;
    if (!chart || !priceSeries) return;

    priceSeries.setData(getPriceData(chartTypeRef.current));
    chart.timeScale().fitContent();
  }, [data, getPriceData]);

  // Effect 4: sync overlay indicator series
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const currentIds = new Set(indicators.map((ind) => ind.id));
    const overlayMap = overlaySeriesMapRef.current;

    overlayMap.forEach((series, id) => {
      if (!currentIds.has(id)) {
        chart.removeSeries(series);
        overlayMap.delete(id);
      }
    });

    indicators.forEach((ind) => {
      const existingSeries = overlayMap.get(ind.id);
      if (existingSeries) {
        existingSeries.setData(ind.data);
        if (ind.options) {
          existingSeries.applyOptions(ind.options);
        }
        return;
      }

      const newSeries =
        ind.type === "histogram"
          ? chart.addSeries(HistogramSeries)
          : chart.addSeries(LineSeries);

      if (ind.options) {
        newSeries.applyOptions(ind.options);
      }
      newSeries.setData(ind.data);
      overlayMap.set(ind.id, newSeries);
    });
  }, [indicators]);

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
        <div className="chart-controls">
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
            {CHART_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={chartType === t.id ? "active" : ""}
                onClick={() => setChartType(t.id)}
                disabled={loading}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="chart-card-body">
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        {loading && (
          <div className="chart-loading-overlay" aria-hidden="true">
            <Spinner size="lg" />
          </div>
        )}
      </div>
    </div>
  );
}
