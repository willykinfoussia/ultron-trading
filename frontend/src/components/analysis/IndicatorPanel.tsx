interface IndicatorOption {
  id: string;
  label: string;
}

interface IndicatorGroup {
  label: string;
  items: IndicatorOption[];
}

const GROUPS: IndicatorGroup[] = [
  {
    label: "Trends",
    items: [
      { id: "sma20", label: "SMA 20" },
      { id: "sma50", label: "SMA 50" },
      { id: "sma200", label: "SMA 200" },
      { id: "ema9", label: "EMA 9" },
      { id: "ema20", label: "EMA 20" },
    ],
  },
  {
    label: "Volatility",
    items: [{ id: "bbands", label: "Bollinger" }],
  },
  {
    label: "Momentum",
    items: [
      { id: "rsi", label: "RSI" },
      { id: "macd", label: "MACD" },
    ],
  },
  {
    label: "Volume",
    items: [{ id: "volume", label: "Volume" }],
  },
];

interface Props {
  activeIndicators: Set<string>;
  onToggleIndicator: (id: string, enabled: boolean) => void;
}

export default function IndicatorPanel({ activeIndicators, onToggleIndicator }: Props) {
  return (
    <div className="indicator-panel">
      {GROUPS.map((group) => (
        <div key={group.label} className="indicator-panel-group">
          <div className="chip-group-label">{group.label}</div>
          <div className="chip-group">
            {group.items.map((indicator) => {
              const isActive = activeIndicators.has(indicator.id);
              return (
                <button
                  key={indicator.id}
                  type="button"
                  className={`chip${isActive ? " active" : ""}`}
                  aria-pressed={isActive}
                  onClick={() => onToggleIndicator(indicator.id, !isActive)}
                >
                  {indicator.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
