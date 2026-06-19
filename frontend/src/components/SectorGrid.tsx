import type { SectorPerf } from "../api/types";

interface Props {
  sectors: SectorPerf[];
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
        <div className="sector-bars-only">
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
                  {pos ? "+" : ""}{sector.change_percent.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
