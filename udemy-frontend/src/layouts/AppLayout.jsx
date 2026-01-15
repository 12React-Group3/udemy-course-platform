import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import "./AppLayout.css";

export default function AppLayout() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    // Close drawer when resizing to desktop
    useEffect(() => {
        function onResize() {
            if (window.innerWidth > 900) setMobileOpen(false);
        }

        function onKeyDown(e) {
            if (e.key === "Escape") setMobileOpen(false);
        }

        window.addEventListener("resize", onResize);
        window.addEventListener("keydown", onKeyDown);

        return () => {
            window.removeEventListener("resize", onResize);
            window.removeEventListener("keydown", onKeyDown);
        };
    }, []);


    return (
        <div className={`app-shell ${collapsed ? "sb-collapsed" : ""}`}>
            <div className="app-main">
                <header className="app-topbar">

                    <div className="app-topbar-title">Welcome</div>

                    <div className="app-topbar-spacer" />

                    <button
                        className="app-burger"
                        onClick={() => setMobileOpen(true)}
                        aria-label="Open sidebar"
                    >
                        ☰
                    </button>
                </header>

                <main className="app-content">
                    <Outlet />
                </main>
            </div>

            <Sidebar
                isOpen={mobileOpen}
                onClose={() => setMobileOpen(false)}
                collapsed={collapsed}
                onToggleCollapse={() => setCollapsed(v => !v)}
            />
        </div>

    );
}
