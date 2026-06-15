import type { TabId } from "./Sidebar";

interface TopbarProps {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  apiStatus: "ok" | "error" | "loading";
}

const QUICK_LINKS: Array<{ id: TabId; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "market", label: "Market" },
  { id: "watchlist", label: "Watchlist" },
];

const TAB_LABELS: Record<TabId, string> = {
  dashboard: "Dashboard",
  market: "Market",
  analysis: "Analysis",
  watchlist: "Watchlist",
  system: "System",
  settings: "Settings",
};

export default function Topbar({
  activeTab,
  onTabChange,
  sidebarOpen,
  onToggleSidebar,
  apiStatus,
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

      {/* Quick nav links */}
      <div className="topbar-nav">
        {QUICK_LINKS.map((link) => (
          <button
            key={link.id}
            className={`topbar-nav-link ${activeTab === link.id ? "active" : ""}`}
            onClick={() => onTabChange(link.id)}
          >
            {link.label}
          </button>
        ))}
      </div>

      {/* Right side: API status + page title */}
      <div className="topbar-right">
        {/* API status indicator */}
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
        <span className="topbar-title">{TAB_LABELS[activeTab] ?? ""}</span>
      </div>
    </header>
  );
}
