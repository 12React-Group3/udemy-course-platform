import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import "./AppLayout.css";

export default function AppLayout() {
    const [mobileOpen, setMobileOpen] = useState(false);

    // Close drawer when resizing to desktop
    useEffect(() => {
        function onResize() {
            if (window.innerWidth > 900) setMobileOpen(false);
        }
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    return (
        <div className="app-shell">
            <Sidebar isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

            <div className="app-main">
                <header className="app-topbar">
                    <button
                        className="app-burger"
                        onClick={() => setMobileOpen(true)}
                        aria-label="Open sidebar"
                    >
                        ☰
                    </button>
                    <div className="app-topbar-title">Welcome</div>
                </header>

                <main className="app-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
