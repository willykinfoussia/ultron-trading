import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MarketMover } from "../../api/types";

interface Props {
  movers: MarketMover[];
  onSelect: (symbol: string) => void;
}

// ── Color scale ──────────────────────────────────────────────
function heatColor(pct: number): string {
  const clamped = Math.max(-10, Math.min(10, pct));
  const intensity = Math.abs(clamped) / 10;

  if (clamped >= 0) {
    const r = Math.round(26 + (1 - intensity) * 30);
    const g = Math.round(180 + intensity * 55);
    const b = Math.round(120 + intensity * 40);
    const alpha = 0.3 + intensity * 0.6;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } else {
    const r = Math.round(220 + intensity * 35);
    const g = Math.round(50 + (1 - intensity) * 40);
    const b = Math.round(60 + (1 - intensity) * 30);
    const alpha = 0.3 + intensity * 0.6;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

function textColor(pct: number): string {
  return Math.abs(pct) > 4 ? "#fff" : "var(--text)";
}

// ── Simple grid layout (more reliable than squarify) ─────────
interface GridRect {
  symbol: string;
  shortName: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  col: number;
  row: number;
}

function layoutGrid(items: Omit<GridRect, "col" | "row">[], cols: number): GridRect[] {
  return items.map((item, i) => ({
    ...item,
    col: i % cols,
    row: Math.floor(i / cols),
  }));
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
  const [dims, setDims] = useState({ w: 800, h: 500 });
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);

  // Measure container — with fallback
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDims({ w: Math.round(rect.width), h: Math.round(rect.height) });
      }
    };

    // Measure immediately and after a short delay (for layout settle)
    measure();
    const timer1 = setTimeout(measure, 100);
    const timer2 = setTimeout(measure, 500);

    const obs = new ResizeObserver(measure);
    obs.observe(el);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      obs.disconnect();
    };
  }, []);

  // Prepare data — top 24 movers by absolute change
  const { gridRects, cellW, cellH } = useMemo(() => {
    const MAX_ITEMS = 24;
    const all = [...movers]
      .sort((a, b) => Math.abs(b.change_percent) - Math.abs(a.change_percent))
      .slice(0, MAX_ITEMS);

    if (all.length === 0) {
      return { gridRects: [], cols: 0, rows: 0, cellW: 0, cellH: 0 };
    }

    // Determine columns based on container width
    const cols = dims.w > 900 ? 8 : dims.w > 600 ? 6 : dims.w > 400 ? 4 : 3;
    const rows = Math.ceil(all.length / cols);
    const gap = 3;
    const cellW = (dims.w - gap * (cols + 1)) / cols;
    const cellH = Math.max(50, (dims.h - gap * (rows + 1)) / rows);

    const items = all.map((d) => ({
      symbol: d.symbol,
      shortName: d.short_name || d.symbol,
      price: d.price,
      change: d.change,
      changePercent: d.change_percent,
      volume: d.volume,
    }));

    const gridRects = layoutGrid(items, cols);

    return { gridRects, cellW, cellH };
  }, [movers, dims.w, dims.h]);

  const handleMouseEnter = useCallback((e: React.MouseEvent, r: GridRect) => {
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

  if (gridRects.length === 0) return null;

  const maxAbs = Math.max(...gridRects.map((r) => Math.abs(r.changePercent)), 5);
  const gap = 3;

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
              {gridRects.map((r) => {
                const isHovered = hoveredSymbol === r.symbol;
                const pos = r.changePercent >= 0;
                const x = gap + r.col * (cellW + gap);
                const y = gap + r.row * (cellH + gap);
                const w = cellW;
                const h = cellH;

                // Dynamic font sizing based on cell size
                const symbolSize = Math.max(11, Math.min(w / 5.5, h / 3.5, 16));
                const changeSize = symbolSize * 0.75;
                const priceSize = symbolSize * 0.6;
                const showPrice = w > 60 && h > 45;
                const showChange = w > 40 && h > 30;

                // Text Y positions
                const hasBottomText = showChange || showPrice;
                const symbolY = hasBottomText ? y + h * 0.42 : y + h / 2;
                const changeY = y + h * 0.72;
                const priceY = y + h * 0.92;

                return (
                  <motion.g
                    key={r.symbol}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as const }}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => handleMouseEnter(e, r)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => onSelect(r.symbol)}
                  >
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      rx={6}
                      ry={6}
                      fill={heatColor(r.changePercent)}
                      stroke={isHovered ? "var(--primary)" : "var(--surface-2)"}
                      strokeWidth={isHovered ? 2 : 1}
                      style={{
                        filter: isHovered ? "brightness(1.15) saturate(1.2)" : "none",
                        transition: "filter 0.15s, stroke 0.15s",
                      }}
                    />
                    {/* Symbol */}
                    <text
                      x={x + w / 2}
                      y={symbolY}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={symbolSize}
                      fontWeight={700}
                      fontFamily="var(--font-mono)"
                      fill={textColor(r.changePercent)}
                      style={{ pointerEvents: "none" }}
                    >
                      {r.symbol}
                    </text>
                    {/* Change % */}
                    {showChange && (
                      <text
                        x={x + w / 2}
                        y={changeY}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={changeSize}
                        fontWeight={600}
                        fontFamily="var(--font-mono)"
                        fill={textColor(r.changePercent)}
                        opacity={0.9}
                        style={{ pointerEvents: "none" }}
                      >
                        {pos ? "+" : ""}{r.changePercent.toFixed(1)}%
                      </text>
                    )}
                    {/* Price */}
                    {showPrice && (
                      <text
                        x={x + w / 2}
                        y={priceY}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={priceSize}
                        fontWeight={500}
                        fontFamily="var(--font-mono)"
                        fill={textColor(r.changePercent)}
                        opacity={0.55}
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
