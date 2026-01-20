import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";
import "./AppLayout.css";

const COLLAPSED_KEY = "sidebarCollapsed";

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  });

  const [isMobile, setIsMobile] = useState(() =>
    window.matchMedia("(max-width: 768px)").matches
  );

  // Close drawer on route changes (mobile UX)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // Persist desktop collapse preference
  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  // Track breakpoint changes
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // ESC closes drawer when open (mainly for mobile drawer)
  useEffect(() => {
    if (!isSidebarOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsSidebarOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSidebarOpen]);

  // Force expanded sidebar on mobile (always show words)
  const effectiveCollapsed = isMobile ? false : collapsed;

  // Only used for desktop layout spacing
  const sbWidth = useMemo(() => (effectiveCollapsed ? 76 : 260), [effectiveCollapsed]);

  function toggleSidebar() {
    setIsSidebarOpen((v) => !v);
  }

  function closeSidebar() {
    setIsSidebarOpen(false);
  }

  function toggleCollapse() {
    setCollapsed((prev) => !prev);
  }

  return (
    <div
      className="app-shell"
      style={{ ["--app-sb-width" as any]: `${sbWidth}px` }}
    >
      <div className={`app-topbar ${isSidebarOpen ? "sb-open" : ""}`}>
        <Topbar onLogoClick={() => navigate("/dashboard")} onToggleSidebar={toggleSidebar} />
      </div>

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        collapsed={effectiveCollapsed}
        onToggleCollapse={toggleCollapse}
      />

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
