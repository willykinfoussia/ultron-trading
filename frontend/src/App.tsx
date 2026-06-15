import { useCallback, useEffect, useState } from "react";
import Sidebar, { type TabId } from "./components/Sidebar";
import Topbar from "./components/Topbar";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toast, type ToastKind, type ToastState } from "./components/Toast";
import Dashboard from "./pages/Dashboard";
import Market from "./pages/Market";
import "./styles.css";

/* ── API health check ── */
async function checkApiHealth(): Promise<"ok" | "error" | "loading"> {
  try {
    const r = await fetch("/api/market/indices", { signal: AbortSignal.timeout(5000) });
    return r.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}

/* ── App ── */
export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [apiStatus, setApiStatus] = useState<"ok" | "error" | "loading">("loading");
  const [toast, setToastState] = useState<ToastState>(null);
  const [version, setVersion] = useState("");

  const setToast = useCallback((message: string, kind: ToastKind = "info") => {
    setToastState({ message, kind });
  }, []);

  // Expose setToast for child components via window (legacy compat)
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__setToast = setToast;
  }, [setToast]);

  // API health poll
  useEffect(() => {
    let active = true;
    const poll = async () => {
      const status = await checkApiHealth();
      if (active) setApiStatus(status);
    };
    poll();
    const id = setInterval(poll, 30_000);
    return () => { active = false; clearInterval(id); };
  }, []);

  // Fetch version
  useEffect(() => {
    fetch("/api/version")
      .then((r) => r.json())
      .then((d: Record<string, string>) => {
        if (d.version) setVersion(d.version);
      })
      .catch(() => {});
  }, []);

  // Auto-hide toast
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToastState(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  function renderPage() {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "market":
        return <Market onSelectStock={() => setActiveTab("dashboard")} />;
      case "analysis":
        return <AnalysisPlaceholder />;
      case "watchlist":
        return <WatchlistPlaceholder />;
      case "system":
        return <SystemPage apiStatus={apiStatus} />;
      case "settings":
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  }

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
        />

        <main role="main" className="main-content">
          <ErrorBoundary key={activeTab}>
            {renderPage()}
          </ErrorBoundary>
        </main>
      </div>

      <Toast toast={toast} />
    </div>
  );
}

/* ── Placeholder pages ── */
function AnalysisPlaceholder() {
  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <span className="card-title">🔬 Analysis</span>
        </div>
        <div className="card-body">
          <p style={{ color: "var(--text-2)" }}>Coming soon — sector analysis, charts, and more.</p>
        </div>
      </div>
    </div>
  );
}

function WatchlistPlaceholder() {
  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <span className="card-title">⭐ Watchlist</span>
        </div>
        <div className="card-body">
          <p style={{ color: "var(--text-2)" }}>Coming soon — track your favorite stocks.</p>
        </div>
      </div>
    </div>
  );
}

function SystemPage({ apiStatus }: { apiStatus: string }) {
  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <span className="card-title">🖥️ System</span>
        </div>
        <div className="card-body">
          <p style={{ color: "var(--text-2)" }}>
            API Status:{" "}
            <span style={{ color: apiStatus === "ok" ? "var(--success)" : "var(--danger)" }}>
              {apiStatus}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <span className="card-title">⚙️ Settings</span>
        </div>
        <div className="card-body">
          <p style={{ color: "var(--text-2)" }}>Coming soon — theme, accent, preferences.</p>
        </div>
      </div>
    </div>
  );
}
