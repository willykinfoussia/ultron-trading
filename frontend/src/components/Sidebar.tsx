import { motion } from "framer-motion";

export type TabId = "stocks" | "market" | "analysis" | "watchlist" | "system" | "settings";

interface NavItem {
  id: TabId;
  label: string;
  icon: string;
  section: SectionId;
}

type SectionId = "trading" | "tools" | "system";

const SECTIONS: Array<{ id: SectionId; label: string }> = [
  { id: "trading", label: "Trading" },
  { id: "tools", label: "Tools" },
  { id: "system", label: "System" },
];

const NAV: NavItem[] = [
  { id: "market", label: "Market", icon: "📊", section: "trading" },
  { id: "stocks", label: "Stocks", icon: "📈", section: "trading" },
  { id: "analysis", label: "Analysis", icon: "🔬", section: "tools" },
  { id: "watchlist", label: "Watchlist", icon: "⭐", section: "tools" },
  { id: "system", label: "System", icon: "🖥️", section: "system" },
  { id: "settings", label: "Settings", icon: "⚙️", section: "system" },
];

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  version: string;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  sidebarOpen,
  onToggleSidebar,
  version,
}: SidebarProps) {
  const navBySection = SECTIONS.map((sec) => ({
    ...sec,
    items: NAV.filter((n) => n.section === sec.id),
  }));

  return (
    <aside className="sidebar" role="navigation" aria-label="Sidebar">
      <div className="sidebar-header">
        <span className="sidebar-logo" aria-label="Ultron Trading">
          <span>U</span>
          {sidebarOpen && "ltron"}
        </span>
        <button
          className="sidebar-toggle"
          onClick={onToggleSidebar}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          ◀
        </button>
      </div>

      <div className="sidebar-nav">
        {navBySection.map((sec) => (
          <div key={sec.id} className="sidebar-section">
            {sidebarOpen && (
              <p className="sidebar-section-label">{sec.label}</p>
            )}
            {sec.items.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  className={`sidebar-link ${isActive ? "active" : ""}`}
                  onClick={() => onTabChange(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <span className="sidebar-link-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  {sidebarOpen && (
                    <span className="sidebar-link-label">{item.label}</span>
                  )}
                  {isActive && (
                    <motion.span
                      className="sidebar-link-indicator"
                      layoutId="sidebar-indicator"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {sidebarOpen && (
        <div className="sidebar-footer">
          <span className="sidebar-version">v{version || "—"}</span>
        </div>
      )}
    </aside>
  );
}

export const TAB_LABELS: Record<TabId, string> = {
  stocks: "Stocks",
  market: "Market",
  analysis: "Analysis",
  watchlist: "Watchlist",
  system: "System",
  settings: "Settings",
};
