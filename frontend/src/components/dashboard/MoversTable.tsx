import { useState, useCallback, useRef, useEffect } from "react";
import type { MarketMover } from "../../api/types";

interface Props {
  title: string;
  icon: string;
  data: MarketMover[];
  onSelect: (symbol: string) => void;
  tone: "positive" | "negative" | "primary";
  maxRows?: number;
  showVolume?: boolean;
}

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

function formatVol(v: number): string {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + "B";
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return v.toString();
}

export function MoversTable({ title, icon, data, onSelect, tone, maxRows = 10, showVolume = false }: Props) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback((e: React.MouseEvent, item: MarketMover) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({
      symbol: item.symbol,
      shortName: item.short_name || item.symbol,
      price: item.price,
      change: item.change,
      changePercent: item.change_percent,
      volume: item.volume,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
    setHoveredSymbol(item.symbol);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
    setHoveredSymbol(null);
  }, []);

  // Close tooltip on scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => { setTooltip(null); setHoveredSymbol(null); };
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  const display = data.slice(0, maxRows);
  const pos = tone === "positive";
  const neg = tone === "negative";

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">{icon} {title}</span>
        <span className="data-table-count">{data.length}</span>
      </div>
      <div className="card-body no-padding">
        <div className="data-table-wrap" ref={scrollRef}>
          <table className="data-table data-table-sm">
            <thead>
              <tr>
                <th style={{ width: "35%" }}>Symbol</th>
                <th className="num" style={{ width: showVolume ? "25%" : "30%" }}>Price</th>
                <th className="num" style={{ width: showVolume ? "20%" : "35%" }}>Chg%</th>
                {showVolume && <th className="num" style={{ width: "20%" }}>Vol</th>}
              </tr>
            </thead>
            <tbody>
              {display.map((item) => {
                const isHovered = hoveredSymbol === item.symbol;
                const itemPos = item.change_percent >= 0;
                return (
                  <tr
                    key={item.symbol}
                    className={`data-table-row${isHovered ? " data-table-row-hovered" : ""}`}
                    onClick={() => onSelect(item.symbol)}
                    onMouseEnter={(e) => handleMouseEnter(e, item)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <td>
                      <div className="mover-cell">
                        <span className={`data-table-symbol ${pos ? "success" : neg ? "danger" : "primary"}`}>
                          {item.symbol}
                        </span>
                        {item.short_name && item.short_name !== item.symbol && (
                          <span className="mover-short-name">{item.short_name}</span>
                        )}
                      </div>
                    </td>
                    <td className="num">${item.price.toFixed(2)}</td>
                    <td className={`num ${itemPos ? "text-success" : "text-danger"}`}>
                      {itemPos ? "+" : ""}{item.change_percent.toFixed(2)}%
                    </td>
                    {showVolume && (
                      <td className="num data-table-volume">{formatVol(item.volume)}</td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="mover-tooltip"
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y - 8,
            transform: "translate(-50%, -100%)",
            zIndex: 1000,
          }}
        >
          <div className="mover-tooltip-header">
            <span className="mover-tooltip-symbol">{tooltip.symbol}</span>
            <span className="mover-tooltip-name">{tooltip.shortName}</span>
          </div>
          <div className="mover-tooltip-body">
            <div className="mover-tooltip-row">
              <span className="mover-tooltip-label">Price</span>
              <span className="mover-tooltip-value">${tooltip.price.toFixed(2)}</span>
            </div>
            <div className="mover-tooltip-row">
              <span className="mover-tooltip-label">Change</span>
              <span className={`mover-tooltip-value ${tooltip.changePercent >= 0 ? "positive" : "negative"}`}>
                {tooltip.changePercent >= 0 ? "+" : ""}{tooltip.changePercent.toFixed(2)}%
              </span>
            </div>
            <div className="mover-tooltip-row">
              <span className="mover-tooltip-label">Volume</span>
              <span className="mover-tooltip-value">{formatVol(tooltip.volume)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
