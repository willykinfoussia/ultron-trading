import type { SectorPerf } from "../api/types";

interface Props {
  sectors: SectorPerf[];
}

function sectorStyle(change: number, maxAbs: number) {
  const intensity = Math.min(Math.abs(change) / maxAbs, 1);
  const pos = change >= 0;
  const alpha = 0.05 + intensity * 0.25;
  const borderAlpha = 0.1 + intensity * 0.3;
  if (pos) {
    return {
      background: `rgba(26, 205, 142, ${alpha})`,
      borderColor: `rgba(26, 205, 142, ${borderAlpha})`,
    };
  }
  return {
    background: `rgba(244, 63, 94, ${alpha})`,
    borderColor: `rgba(244, 63, 94, ${borderAlpha})`,
  };
}

export default function SectorGrid({ sectors }: Props) {
  if (!sectors || sectors.length === 0) return null;

  const maxAbs = Math.max(...sectors.map((s) => Math.abs(s.change_percent)), 3);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Sector Performance</span>
      </div>
      <div className="card-body">
        <div className="sector-grid-cards">
          {sectors.map((sector) => {
            const pos = sector.change_percent >= 0;
            const style = sectorStyle(sector.change_percent, maxAbs);
            return (
              <div
                key={sector.symbol}
                className="sector-card"
                style={{ background: style.background, borderColor: style.borderColor, border: "1px solid" }}
              >
                <div className="sector-card-name">{sector.name}</div>
                <div className={`sector-card-value ${pos ? "positive" : "negative"}`}>
                  {pos ? "+" : ""}
                  {sector.change_percent.toFixed(2)}%
                </div>
              </div>
            );
          })}
        </div>

        <div>
          {sectors.map((sector) => {
            const pos = sector.change_percent >= 0;
            const widthPct = Math.min((Math.abs(sector.change_percent) / maxAbs) * 50, 50);
            return (
              <div key={sector.symbol} className="sector-bar-row">
                <span className="sector-bar-label">{sector.name}</span>
                <div className="sector-bar-track">
                  {pos ? (
                    <>
                      <div style={{ flex: 1 }} />
                      <div
                        className="sector-bar-fill positive"
                        style={{ width: `${widthPct}%` }}
                      />
                    </>
                  ) : (
                    <>
                      <div
                        className="sector-bar-fill negative"
                        style={{ width: `${widthPct}%` }}
                      />
                      <div style={{ flex: 1 }} />
                    </>
                  )}
                </div>
                <span className={`sector-bar-value ${pos ? "positive" : "negative"}`}>
                  {pos ? "+" : ""}
                  {sector.change_percent.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
