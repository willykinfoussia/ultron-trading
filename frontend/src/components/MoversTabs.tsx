import { useState } from "react";
import type { MarketMover } from "../api/types";
import SegmentedControl, { type SegmentTab } from "./SegmentedControl";

interface Props {
  gainers: MarketMover[];
  losers: MarketMover[];
  actives: MarketMover[];
  onSelect: (symbol: string) => void;
}

type Tab = "gainers" | "losers" | "actives";

const TABS: SegmentTab[] = [
  { id: "gainers", label: "Top Gainers", icon: "🚀", tone: "success" },
  { id: "losers", label: "Top Losers", icon: "📉", tone: "danger" },
  { id: "actives", label: "Most Active", icon: "🔥", tone: "primary" },
];

const SYMBOL_TONE: Record<Tab, "success" | "danger" | "primary"> = {
  gainers: "success",
  losers: "danger",
  actives: "primary",
};

function formatVolume(v: number): string {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + "B";
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return v.toString();
}

export default function MoversTabs({ gainers, losers, actives, onSelect }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("gainers");

  const data: Record<Tab, MarketMover[]> = { gainers, losers, actives };
  const items = data[activeTab];
  const symbolTone = SYMBOL_TONE[activeTab];

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Market Movers</span>
      </div>
      <div className="card-body no-padding">
        <div style={{ padding: "var(--sp-3) var(--sp-4)", borderBottom: "1px solid var(--border-subtle)" }}>
          <SegmentedControl
            tabs={TABS}
            active={activeTab}
            onChange={(id) => setActiveTab(id as Tab)}
            fullWidth
            layoutId="movers-segment"
          />
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th className="num">Price</th>
                <th className="num">Change</th>
                <th className="num">Volume</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const pos = item.change_percent >= 0;
                return (
                  <tr
                    key={item.symbol}
                    className="data-table-row"
                    onClick={() => onSelect(item.symbol)}
                  >
                    <td>
                      <div className="mover-cell">
                        <span className={`data-table-symbol ${symbolTone}`}>{item.symbol}</span>
                        {item.short_name && item.short_name !== item.symbol && (
                          <span className="mover-short-name">{item.short_name}</span>
                        )}
                      </div>
                    </td>
                    <td className="num">${item.price.toFixed(2)}</td>
                    <td className={`num data-table-change ${pos ? "positive" : "negative"}`}>
                      {pos ? "+" : ""}
                      {item.change_percent.toFixed(2)}%
                    </td>
                    <td className="num data-table-volume">{formatVolume(item.volume)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
