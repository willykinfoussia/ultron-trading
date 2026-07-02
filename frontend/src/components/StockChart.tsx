import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  IPriceLine,
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

export type PaneGroup = "price" | "volume" | "rsi" | "macd";

export interface ChartIndicator {
  id: string;
  paneGroup: PaneGroup;
  seriesType: "line" | "histogram";
  data: { time: UTCTimestamp; value: number; color?: string }[];
  options?: Record<string, unknown>;
  priceLines?: { price: number; color: string; title: string }[];
}

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

const SUB_PANE_ORDER: PaneGroup[] = ["volume", "rsi", "macd"];
const BASE_CHART_HEIGHT = 400;
const SUB_PANE_HEIGHT = 130;

const parseTime = (dateStr: string): UTCTimestamp => {
  return Math.floor(new Date(dateStr).getTime() / 1000) as UTCTimestamp;
};

const computeHeikinAshi = (
  data: { date: string; open: number; high: number; low: number; close: number }[]
) => {
  const ha: {
    time: UTCTimestamp;
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
  indicators?: ChartIndicator[];
}

interface OverlayEntry {
  series: ISeriesApi<"Line" | "Histogram">;
  paneIndex: number;
  priceLines: IPriceLine[];
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

function getActiveSubPaneGroups(indicators: ChartIndicator[]): PaneGroup[] {
  return SUB_PANE_ORDER.filter((group) =>
    indicators.some((ind) => ind.paneGroup === group)
  );
}

function computePaneIndexMap(indicators: ChartIndicator[]): Map<PaneGroup, number> {
  const map = new Map<PaneGroup, number>();
  map.set("price", 0);
  getActiveSubPaneGroups(indicators).forEach((group, index) => {
    map.set(group, index + 1);
  });
  return map;
}

function getLayoutSignature(indicators: ChartIndicator[]): string {
  return getActiveSubPaneGroups(indicators).join(",");
}

function computeChartHeight(indicators: ChartIndicator[]): number {
  return BASE_CHART_HEIGHT + SUB_PANE_HEIGHT * getActiveSubPaneGroups(indicators).length;
}

function addIndicatorSeries(
  chart: IChartApi,
  ind: ChartIndicator,
  paneIndex: number
): ISeriesApi<"Line" | "Histogram"> {
  const series =
    ind.seriesType === "histogram"
      ? chart.addSeries(HistogramSeries, ind.options ?? {}, paneIndex)
      : chart.addSeries(LineSeries, ind.options ?? {}, paneIndex);

  if (ind.paneGroup === "rsi") {
    series.priceScale().applyOptions({
      scaleMargins: { top: 0.1, bottom: 0.1 },
    });
  }

  series.setData(ind.data);
  return series;
}

function applyPriceLines(
  series: ISeriesApi<"Line" | "Histogram">,
  priceLines: ChartIndicator["priceLines"]
): IPriceLine[] {
  if (!priceLines?.length) return [];
  return priceLines.map((line) =>
    series.createPriceLine({
      price: line.price,
      color: line.color,
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: line.title,
    })
  );
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
  const overlaySeriesMapRef = useRef<Map<string, OverlayEntry>>(new Map());
  const layoutSignatureRef = useRef("");
  const chartTypeRef = useRef<ChartType>("candlestick");
  const [chartType, setChartType] = useState<ChartType>("candlestick");

  const chartHeight = useMemo(() => computeChartHeight(indicators), [indicators]);

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
      height: BASE_CHART_HEIGHT,
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
      const currentHeight = container.clientHeight || BASE_CHART_HEIGHT;
      chart.applyOptions({
        width: container.clientWidth,
        height: currentHeight,
      });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      overlaySeriesMapRef.current.clear();
      layoutSignatureRef.current = "";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartType]);

  // Effect 3: update price data when history changes
  useEffect(() => {
    const chart = chartRef.current;
    const priceSeries = priceSeriesRef.current;
    if (!chart || !priceSeries) return;

    priceSeries.setData(getPriceData(chartTypeRef.current));
    chart.timeScale().fitContent();
  }, [data, getPriceData]);

  // Effect 4: sync indicator series across panes
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    chart.applyOptions({ height: chartHeight });

    const paneIndexMap = computePaneIndexMap(indicators);
    const layoutSignature = getLayoutSignature(indicators);
    const overlayMap = overlaySeriesMapRef.current;
    const currentIds = new Set(indicators.map((ind) => ind.id));
    const layoutChanged = layoutSignatureRef.current !== layoutSignature;

    const removeOverlayEntry = (id: string, entry: OverlayEntry) => {
      entry.priceLines.forEach((line) => {
        try {
          entry.series.removePriceLine(line);
        } catch {
          // Price line may already be removed with the series.
        }
      });
      chart.removeSeries(entry.series);
      overlayMap.delete(id);
    };

    if (layoutChanged) {
      overlayMap.forEach((entry, id) => removeOverlayEntry(id, entry));

      while (chart.panes().length > 1) {
        chart.removePane(chart.panes().length - 1);
      }

      indicators.forEach((ind) => {
        const paneIndex = paneIndexMap.get(ind.paneGroup) ?? 0;
        const series = addIndicatorSeries(chart, ind, paneIndex);
        const priceLines = applyPriceLines(series, ind.priceLines);
        overlayMap.set(ind.id, { series, paneIndex, priceLines });
      });

      layoutSignatureRef.current = layoutSignature;
      return;
    }

    overlayMap.forEach((entry, id) => {
      if (!currentIds.has(id)) {
        removeOverlayEntry(id, entry);
      }
    });

    indicators.forEach((ind) => {
      const paneIndex = paneIndexMap.get(ind.paneGroup) ?? 0;
      const existing = overlayMap.get(ind.id);

      if (existing) {
        if (existing.paneIndex !== paneIndex) {
          removeOverlayEntry(ind.id, existing);
          const series = addIndicatorSeries(chart, ind, paneIndex);
          const priceLines = applyPriceLines(series, ind.priceLines);
          overlayMap.set(ind.id, { series, paneIndex, priceLines });
          return;
        }

        existing.series.setData(ind.data);
        if (ind.options) {
          existing.series.applyOptions(ind.options);
        }
        return;
      }

      const series = addIndicatorSeries(chart, ind, paneIndex);
      const priceLines = applyPriceLines(series, ind.priceLines);
      overlayMap.set(ind.id, { series, paneIndex, priceLines });
    });
  }, [indicators, chartHeight]);

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
      <div className="chart-card-body" style={{ minHeight: chartHeight }}>
        <div
          ref={containerRef}
          style={{ width: "100%", height: chartHeight }}
        />
        {loading && (
          <div className="chart-loading-overlay" aria-hidden="true">
            <Spinner size="lg" />
          </div>
        )}
      </div>
    </div>
  );
}
