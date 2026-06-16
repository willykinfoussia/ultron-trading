import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar, { type TabId } from "./components/Sidebar";
import Topbar from "./components/Topbar";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toast, type ToastKind, type ToastState } from "./components/Toast";
import Stocks from "./pages/Stocks";
import Market from "./pages/Market";
import "./styles.css";

async function checkApiHealth(): Promise<"ok" | "error" | "loading"> {
  try {
    const r = await fetch("/api/market/indices", { signal: AbortSignal.timeout(5000) });
    return r.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}

const PAGE_MOTION = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("stocks");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [apiStatus, setApiStatus] = useState<"ok" | "error" | "loading">("loading");
  const [toast, setToastState] = useState<ToastState>(null);
  const [version, setVersion] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");

  const setToast = useCallback((message: string, kind: ToastKind = "info") => {
    setToastState({ message, kind });
  }, []);

  const navigateToStock = useCallback((symbol: string) => {
    setSelectedSymbol(symbol);
    setActiveTab("stocks");
  }, []);

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__setToast = setToast;
  }, [setToast]);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      const status = await checkApiHealth();
      if (active) setApiStatus(status);
    };
    poll();
    const id = setInterval(poll, 30_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    fetch("/api/version")
      .then((r) => r.json())
      .then((d: Record<string, string>) => {
        if (d.version) setVersion(d.version);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToastState(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  function renderPage() {
    switch (activeTab) {
      case "stocks":
        return (
          <Stocks
            initialSymbol={selectedSymbol}
            onSymbolChange={setSelectedSymbol}
          />
        );
      case "market":
        return <Market onSelectStock={navigateToStock} />;
      case "analysis":
        return <AnalysisPlaceholder />;
      case "watchlist":
        return <WatchlistPlaceholder />;
      case "system":
        return <SystemPage apiStatus={apiStatus} version={version} />;
      case "settings":
        return <SettingsPage />;
      default:
        return (
          <Stocks
            initialSymbol={selectedSymbol}
            onSymbolChange={setSelectedSymbol}
          />
        );
    }
  }

  const topbarSubtitle = activeTab === "stocks" ? selectedSymbol : undefined;

  return (
    <div className={`layout ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
        version={version}
      />

      <div className="main-area">
        <Topbar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(true)}
          apiStatus={apiStatus}
          subtitle={topbarSubtitle}
        />

        <main role="main" className="main-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              className="page-transition"
              {...PAGE_MOTION}
            >
              <ErrorBoundary>{renderPage()}</ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <Toast toast={toast} />
    </div>
  );
}

function AnalysisPlaceholder() {
  return (
    <div className="page">
      <div className="placeholder-hero">
        <span className="placeholder-icon">🔬</span>
        <h1 className="placeholder-title">Analysis</h1>
        <p className="placeholder-desc">
          Sector analysis, technical indicators, and comparative charts — coming soon.
        </p>
      </div>
      <div className="placeholder-skeleton-grid">
        {[1, 2, 3].map((n) => (
          <div key={n} className="card">
            <div className="card-body">
              <div className="skeleton" style={{ height: 14, width: "40%", marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 80 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WatchlistPlaceholder() {
  return (
    <div className="page">
      <div className="placeholder-hero">
        <span className="placeholder-icon">⭐</span>
        <h1 className="placeholder-title">Watchlist</h1>
        <p className="placeholder-desc">
          Track your favorite stocks and get alerts on price movements.
        </p>
      </div>
      <div className="card">
        <div className="card-header">
          <span className="card-title">Your watchlist</span>
        </div>
        <div className="card-body">
          <div className="empty-state">
            <span className="empty-state-icon">📋</span>
            <span className="empty-state-title">No stocks yet</span>
            <span className="empty-state-desc">
              Add symbols from the Stocks or Market page to build your watchlist.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SystemPage({ apiStatus, version }: { apiStatus: string; version: string }) {
  const ok = apiStatus === "ok";
  return (
    <div className="page system-page">
      <div className="system-cards-grid">
        <div className="card metric-card">
          <div className="card-header">
            <span className="card-title">
              <span className="metric-icon">🌐</span>
              API Status
            </span>
          </div>
          <div className="card-body">
            <div
              className={`stat-cell-value ${ok ? "positive" : "negative"}`}
              style={{ fontSize: "var(--text-xl)" }}
            >
              {apiStatus.toUpperCase()}
            </div>
            <p className="metric-details">
              {ok ? "All market endpoints responding." : "Unable to reach the API."}
            </p>
          </div>
        </div>
        <div className="card metric-card">
          <div className="card-header">
            <span className="card-title">
              <span className="metric-icon">📦</span>
              Version
            </span>
          </div>
          <div className="card-body">
            <div className="stat-cell-value mono">v{version || "—"}</div>
            <p className="metric-details">Ultron Trading frontend</p>
          </div>
        </div>
        <div className="card metric-card">
          <div className="card-header">
            <span className="card-title">
              <span className="metric-icon">⚡</span>
              Polling
            </span>
          </div>
          <div className="card-body">
            <div className="stat-cell-value">30s / 60s</div>
            <p className="metric-details">API health / market data refresh intervals</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="page settings-page">
      <div className="placeholder-hero" style={{ paddingTop: "var(--sp-4)" }}>
        <span className="placeholder-icon">⚙️</span>
        <h1 className="placeholder-title">Settings</h1>
        <p className="placeholder-desc">Theme, accent color, and display preferences.</p>
      </div>
      <div className="card">
        <div className="card-header">
          <span className="card-title">Appearance</span>
        </div>
        <div className="card-body">
          <div className="settings-row">
            <button type="button" className="settings-theme-btn active">
              <span>🌙</span>
              <span>Dark (active)</span>
            </button>
            <button type="button" className="settings-theme-btn" disabled>
              <span>☀️</span>
              <span>Light (soon)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
