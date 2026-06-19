import type { MarketMover } from "../api/types";

interface Props {
  gainers: MarketMover[];
  losers: MarketMover[];
  actives: MarketMover[];
  onSelect: (symbol: string) => void;
}

function formatVolume(v: number): string {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + "B";
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return v.toString();
}

interface ColumnProps {
  title: string;
  icon: string;
  items: MarketMover[];
  tone: "success" | "danger" | "primary";
  onSelect: (symbol: string) => void;
}

function MoversColumn({ title, icon, items, tone, onSelect }: ColumnProps) {
  return (
    <div className="movers-col">
      <div className="movers-col-header">
        <span className="movers-col-icon">{icon}</span>
        <span className="movers-col-title">{title}</span>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Sym</th>
            <th className="num">Chg%</th>
            <th className="num">Vol</th>
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
                  <span className={`data-table-symbol ${tone}`}>{item.symbol}</span>
                </td>
                <td className={`num data-table-change ${pos ? "positive" : "negative"}`}>
                  {pos ? "+" : ""}{item.change_percent.toFixed(1)}%
                </td>
                <td className="num data-table-volume">{formatVolume(item.volume)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function MoversPanel({ gainers, losers, actives, onSelect }: Props) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Market Movers</span>
      </div>
      <div className="card-body no-padding">
        <div className="movers-cols">
          <MoversColumn title="Gainers" icon="🚀" items={gainers} tone="success" onSelect={onSelect} />
          <MoversColumn title="Losers" icon="📉" items={losers} tone="danger" onSelect={onSelect} />
          <MoversColumn title="Most Active" icon="🔥" items={actives} tone="primary" onSelect={onSelect} />
        </div>
      </div>
    </div>
  );
}
