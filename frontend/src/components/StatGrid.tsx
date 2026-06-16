interface StatItem {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}

interface Props {
  items: StatItem[];
}

export default function StatGrid({ items }: Props) {
  return (
    <div className="stat-grid">
      {items.map((item) => (
        <div key={item.label} className="stat-cell">
          <div className="stat-cell-label">{item.label}</div>
          <div
            className={`stat-cell-value${
              item.tone === "positive"
                ? " positive"
                : item.tone === "negative"
                  ? " negative"
                  : ""
            }`}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
