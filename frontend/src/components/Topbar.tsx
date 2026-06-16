import { motion } from "framer-motion";
import type { TabId } from "./Sidebar";
import { TAB_LABELS } from "./Sidebar";

interface TopbarProps {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  apiStatus: "ok" | "error" | "loading";
  subtitle?: string;
}

const QUICK_LINKS: Array<{ id: TabId; label: string }> = [
  { id: "stocks", label: "Stocks" },
  { id: "market", label: "Market" },
  { id: "watchlist", label: "Watchlist" },
];

export default function Topbar({
  activeTab,
  onTabChange,
  sidebarOpen,
  onToggleSidebar,
  apiStatus,
  subtitle,
}: TopbarProps) {
  return (
    <header className="topbar" role="banner">
      {!sidebarOpen && (
        <button
          className="topbar-hamburger"
          onClick={onToggleSidebar}
          aria-label="Open sidebar"
          title="Open sidebar"
        >
          ☰
        </button>
      )}

      <div className="topbar-nav">
        {QUICK_LINKS.map((link) => {
          const isActive = activeTab === link.id;
          return (
            <button
              key={link.id}
              className={`topbar-nav-link ${isActive ? "active" : ""}`}
              onClick={() => onTabChange(link.id)}
            >
              {isActive && (
                <motion.span
                  className="topbar-nav-indicator"
                  layoutId="topbar-indicator"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <span className="topbar-nav-link-label">{link.label}</span>
            </button>
          );
        })}
      </div>

      <div className="topbar-right">
        <button
          className={`topbar-hermes-indicator topbar-hermes-indicator--${apiStatus}`}
          title={`API ${apiStatus === "ok" ? "connected" : apiStatus === "error" ? "error" : "loading"}`}
          disabled
        >
          <span
            className={`topbar-hermes-indicator-dot${apiStatus === "loading" ? " is-spinning" : ""}`}
            aria-hidden="true"
          />
        </button>
        <div className="topbar-titles">
          <span className="topbar-title">{TAB_LABELS[activeTab] ?? ""}</span>
          {subtitle && <span className="topbar-subtitle">{subtitle}</span>}
        </div>
      </div>
    </header>
  );
}
