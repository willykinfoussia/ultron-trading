interface IndicatorOption {
  id: string;
  label: string;
}

const INDICATORS: IndicatorOption[] = [
  { id: "sma20", label: "SMA 20" },
  { id: "sma50", label: "SMA 50" },
  { id: "ema9", label: "EMA 9" },
  { id: "ema20", label: "EMA 20" },
  { id: "bbands", label: "Bollinger" },
];

interface Props {
  activeIndicators: Set<string>;
  onToggleIndicator: (id: string, enabled: boolean) => void;
}

export default function IndicatorPanel({ activeIndicators, onToggleIndicator }: Props) {
  return (
    <div className="indicator-panel">
      <div className="chip-group-label">Indicators</div>
      <div className="chip-group">
        {INDICATORS.map((indicator) => {
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
  );
}
