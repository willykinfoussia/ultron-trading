import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

export type StockTabId = "overview" | "company" | "financials" | "holders" | "analysis" | "news";

interface TabDef {
  id: StockTabId;
  label: string;
}

const TABS: TabDef[] = [
  { id: "overview", label: "Overview" },
  { id: "company", label: "Company" },
  { id: "financials", label: "Financials" },
  { id: "holders", label: "Holders" },
  { id: "analysis", label: "Analysis" },
  { id: "news", label: "News" },
];

interface Props {
  activeTab: StockTabId;
  onChange: (tab: StockTabId) => void;
}

export default function StockTabs({ activeTab, onChange }: Props) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    if (!tabsRef.current) return;
    const activeEl = tabsRef.current.querySelector(
      `[data-tab="${activeTab}"]`
    ) as HTMLElement | null;
    if (activeEl) {
      setIndicator({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
      });
    }
  }, [activeTab]);

  return (
    <div className="stock-tabs-wrapper">
      <div className="stock-tabs" ref={tabsRef} role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            data-tab={tab.id}
            aria-selected={activeTab === tab.id}
            className={`stock-tab${activeTab === tab.id ? " active" : ""}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
        <motion.div
          className="stock-tab-indicator"
          animate={{ left: indicator.left, width: indicator.width }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          style={{ position: "absolute", bottom: 0, height: 2 }}
        />
      </div>
    </div>
  );
}
