import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MarketMover } from "../../api/types";

interface Props {
  movers: MarketMover[];
  onSelect: (symbol: string) => void;
}

// ── Color scale ──────────────────────────────────────────────
function heatColor(pct: number): string {
  // pct is -100 to +100 (clamped)
  // Negative: red gradient. Positive: green gradient.
  const clamped = Math.max(-10, Math.min(10, pct));
  const intensity = Math.abs(clamped) / 10; // 0..1

  if (clamped >= 0) {
    // Green: from subtle to vivid
    const r = Math.round(26 + (1 - intensity) * 30);
    const g = Math.round(180 + intensity * 55);
    const b = Math.round(120 + intensity * 40);
    const alpha = 0.25 + intensity * 0.65;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } else {
    // Red: from subtle to vivid
    const r = Math.round(220 + intensity * 35);
    const g = Math.round(50 + (1 - intensity) * 40);
    const b = Math.round(60 + (1 - intensity) * 30);
    const alpha = 0.25 + intensity * 0.65;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

function textColor(pct: number): string {
  const clamped = Math.max(-10, Math.min(10, pct));
  return Math.abs(clamped) > 5 ? "#fff" : "var(--text)";
}

// ── Treemap squarified layout ────────────────────────────────
interface TreemapRect {
  symbol: string;
  shortName: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  x: number;
  y: number;
  w: number;
  h: number;
  area: number;
}

function squarify(
  items: { symbol: string; shortName: string; price: number; change: number; changePercent: number; volume: number; area: number }[],
  width: number,
  height: number
): TreemapRect[] {
  if (items.length === 0) return [];
  if (items.length === 1) {
    const it = items[0];
    return [{ ...it, x: 0, y: 0, w: width, h: height, area: it.area }];
  }

  // Sort by area descending
  const sorted = [...items].sort((a, b) => b.area - a.area);
  const totalArea = sorted.reduce((s, i) => s + i.area, 0);
  const scale = (width * height) / totalArea;

  const rects: TreemapRect[] = [];
  let remaining = [...sorted];
  let x = 0, y = 0, w = width, h = height;

  while (remaining.length > 0) {
    const isHorizontal = w >= h;
    const row = getRow(remaining, isHorizontal ? w : h, scale);
    const rowSum = row.reduce((s, i) => s + i.area * scale, 0);

    let offset = 0;
    for (const item of row) {
      const itemArea = item.area * scale;
      const rectW = isHorizontal ? rowSum / h : itemArea / (rowSum / w);
      const rectH = isHorizontal ? itemArea / (rowSum / w) : rowSum / h;

      rects.push({
        symbol: item.symbol,
        shortName: item.shortName,
        price: item.price,
        change: item.change,
        changePercent: item.changePercent,
        volume: item.volume,
        x: isHorizontal ? x : x + offset,
        y: isHorizontal ? y + offset : y,
        w: isHorizontal ? rectW : w,
        h: isHorizontal ? h : rectH,
        area: item.area,
      });
      offset += isHorizontal ? rectH : rectW;
    }

    if (isHorizontal) {
      x += rowSum / h;
      w -= rowSum / h;
    } else {
      y += rowSum / w;
      h -= rowSum / w;
    }

    remaining = remaining.slice(row.length);
  }

  return rects;
}

function getRow<T extends { area: number }>(
  items: T[],
  side: number,
  scale: number
): T[] {
  if (items.length <= 1) return items;
  const row: T[] = [items[0]];
  let rowArea = items[0].area * scale;
  let i = 1;

  while (i < items.length) {
    const nextArea = items[i].area * scale;
    const newRowArea = rowArea + nextArea;

    const rowAreas = row.map((r) => r.area * scale);
    const minRow = Math.min(...rowAreas);
    const maxRow = Math.max(...rowAreas);

    const currentRowSide = rowArea / side;
    const currentWorst = Math.max(
      currentRowSide / minRow,
      maxRow / currentRowSide
    );

    const newRowSide = newRowArea / side;
    const newMin = Math.min(minRow, nextArea);
    const newMax = Math.max(maxRow, nextArea);
    const newWorst = Math.max(
      newRowSide / newMin,
      newMax / newRowSide
    );

    if (newWorst <= currentWorst || row.length === 1) {
      row.push(items[i]);
      rowArea = newRowArea;
      i++;
    } else {
      break;
    }
  }

  return row;
}

// ── Tooltip ──────────────────────────────────────────────────
interface TooltipData {
  symbol: string;
  shortName: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  x: number;
  y: number;
}

// ── Main component ───────────────────────────────────────────
export function TreemapHeatmap({ movers, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 400 });
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);

  // Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDims({ w: width, h: height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Prepare data
  const rects = useMemo(() => {
    const all = [...movers]
      .sort((a, b) => Math.abs(b.change_percent) - Math.abs(a.change_percent))
      .slice(0, 50);

    if (all.length === 0) return [];

    // Use volume as area proxy, with a minimum
    const maxVol = Math.max(...all.map((d) => d.volume), 1);
    const items = all.map((d) => ({
      symbol: d.symbol,
      shortName: d.short_name || d.symbol,
      price: d.price,
      change: d.change,
      changePercent: d.change_percent,
      volume: d.volume,
      area: Math.max(d.volume / maxVol, 0.02), // min 2% area
    }));

    return squarify(items, dims.w, dims.h);
  }, [movers, dims.w, dims.h]);

  const handleMouseEnter = useCallback((e: React.MouseEvent, r: TreemapRect) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({
      symbol: r.symbol,
      shortName: r.shortName,
      price: r.price,
      change: r.change,
      changePercent: r.changePercent,
      volume: r.volume,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
    setHoveredSymbol(r.symbol);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
    setHoveredSymbol(null);
  }, []);

  if (rects.length === 0) return null;

  const maxAbs = Math.max(...rects.map((r) => Math.abs(r.changePercent)), 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as const }}
      className="card"
    >
      <div className="card-header">
        <span className="card-title">🗺️ Market Heatmap</span>
        <div className="heatmap-legend">
          <span className="heatmap-legend-label">−{maxAbs.toFixed(0)}%</span>
          <div className="heatmap-legend-gradient" />
          <span className="heatmap-legend-label">+{maxAbs.toFixed(0)}%</span>
        </div>
      </div>
      <div className="card-body no-padding">
        <div className="treemap-container" ref={containerRef}>
          <svg
            className="treemap-svg"
            width={dims.w}
            height={dims.h}
            viewBox={`0 0 ${dims.w} ${dims.h}`}
          >
            <AnimatePresence>
              {rects.map((r) => {
                const isHovered = hoveredSymbol === r.symbol;
                const pos = r.changePercent >= 0;
                const fontSize = Math.max(10, Math.min(r.w / 6, r.h / 4, 14));
                const showPrice = r.w > 50 && r.h > 30;
                const showChange = r.w > 35 && r.h > 20;

                return (
                  <motion.g
                    key={r.symbol}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => handleMouseEnter(e, r)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => onSelect(r.symbol)}
                  >
                    <rect
                      x={r.x + 1}
                      y={r.y + 1}
                      width={Math.max(r.w - 2, 1)}
                      height={Math.max(r.h - 2, 1)}
                      rx={4}
                      ry={4}
                      fill={heatColor(r.changePercent)}
                      stroke={isHovered ? "var(--primary)" : "var(--surface)"}
                      strokeWidth={isHovered ? 2 : 1}
                      style={{
                        filter: isHovered ? "brightness(1.15)" : "none",
                        transition: "filter 0.15s, stroke 0.15s",
                      }}
                    />
                    <text
                      x={r.x + r.w / 2}
                      y={r.y + r.h / 2 - (showPrice ? fontSize * 0.4 : 0)}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={fontSize}
                      fontWeight={700}
                      fontFamily="var(--font-mono)"
                      fill={textColor(r.changePercent)}
                      style={{ pointerEvents: "none" }}
                    >
                      {r.symbol}
                    </text>
                    {showChange && (
                      <text
                        x={r.x + r.w / 2}
                        y={r.y + r.h / 2 + fontSize * 0.9}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={fontSize * 0.8}
                        fontWeight={600}
                        fontFamily="var(--font-mono)"
                        fill={textColor(r.changePercent)}
                        opacity={0.85}
                        style={{ pointerEvents: "none" }}
                      >
                        {pos ? "+" : ""}{r.changePercent.toFixed(1)}%
                      </text>
                    )}
                    {showPrice && (
                      <text
                        x={r.x + r.w / 2}
                        y={r.y + r.h / 2 + fontSize * 1.8}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={fontSize * 0.65}
                        fontWeight={500}
                        fontFamily="var(--font-mono)"
                        fill={textColor(r.changePercent)}
                        opacity={0.6}
                        style={{ pointerEvents: "none" }}
                      >
                        ${r.price.toFixed(2)}
                      </text>
                    )}
                  </motion.g>
                );
              })}
            </AnimatePresence>
          </svg>
        </div>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="treemap-tooltip"
            style={{
              position: "fixed",
              left: tooltip.x,
              top: tooltip.y - 8,
              transform: "translate(-50%, -100%)",
              zIndex: 1000,
            }}
          >
            <div className="treemap-tooltip-header">
              <span className="treemap-tooltip-symbol">{tooltip.symbol}</span>
              <span className="treemap-tooltip-name">{tooltip.shortName}</span>
            </div>
            <div className="treemap-tooltip-body">
              <div className="treemap-tooltip-row">
                <span className="treemap-tooltip-label">Price</span>
                <span className="treemap-tooltip-value">${tooltip.price.toFixed(2)}</span>
              </div>
              <div className="treemap-tooltip-row">
                <span className="treemap-tooltip-label">Change</span>
                <span className={`treemap-tooltip-value ${tooltip.changePercent >= 0 ? "positive" : "negative"}`}>
                  {tooltip.changePercent >= 0 ? "+" : ""}{tooltip.changePercent.toFixed(2)}%
                </span>
              </div>
              <div className="treemap-tooltip-row">
                <span className="treemap-tooltip-label">Volume</span>
                <span className="treemap-tooltip-value">{formatVol(tooltip.volume)}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function formatVol(v: number): string {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + "B";
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return v.toString();
}
