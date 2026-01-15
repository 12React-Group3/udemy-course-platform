import { NavLink } from "react-router-dom";
import { isAdmin, logout } from "../auth/authStore";
import './Sidebar.css';

const navItems = [
    { label: "Dashboard", to: "/dashboard", icon: "🏠" },
    { label: "Courses", to: "/courses", icon: "📚" },
    { label: "Tasks", to: "/tasks", icon: "✅" },
    { label: "Profile", to: "/profile", icon: "👤" },
];

const adminItems = [
    { label: "Admin", to: "/admin", icon: "🛠️" },
];

export default function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }) {
    const showAdmin = isAdmin();
    return (
        <>
            {/* Mobile overlay */}
            <div
                className={`sb-overlay ${isOpen ? "show" : ""}`}
                onClick={onClose}
            />

            <aside className={`sb ${isOpen ? "open" : ""} ${collapsed ? "collapsed" : ""}`}>
                <div className="sb-header">
                    <div className="sb-title">Udemy Course Platform</div>

                    <div className="sb-header-actions">
                        {/* Desktop collapse toggle */}
                        <button
                            className="sb-collapse"
                            onClick={onToggleCollapse}
                            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                            type="button"
                        >
                            {collapsed ? "⟨" : "⟩"}
                        </button>

                        {/* Mobile close button */}
                        <button className="sb-close" onClick={onClose} aria-label="Close sidebar" type="button">
                            ✕
                        </button>
                    </div>
                </div>

                <nav className="sb-nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `sb-link ${isActive ? "active" : ""}`
                            }
                            onClick={onClose} // mobile: close after navigating
                        >
                            <span className="sb-icon" aria-hidden="true">{item.icon}</span>
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {showAdmin && (
                    <>
                        <div className="sb-divider" />
                        <div className="sb-sectionLabel">Admin</div>

                        {adminItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) => `sb-link ${isActive ? "active" : ""}`}
                                onClick={onClose}
                            >
                                <span className="sb-icon" aria-hidden="true">{item.icon}</span>
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </>
                )}

                {!collapsed && (
                    <div className="sidebar-footer">
                        <button
                            className="sidebar-logout"
                            type="button"
                            onClick={() => {
                                logout();
                                onClose?.(); // closes mobile drawer if open (safe no-op on desktop)
                            }}
                        >
                            Logout
                        </button>
                    </div>
                )}

            </aside>
        </>
    );
}
