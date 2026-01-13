import { NavLink } from "react-router-dom";
import "./Sidebar.css";

const navItems = [
    { label: "Dashboard", to: "/dashboard", icon: "🏠" },
    { label: "Courses", to: "/courses", icon: "📚" },
    { label: "Tasks", to: "/tasks", icon: "✅" },
    { label: "Profile", to: "/profile", icon: "👤" },
];

export default function Sidebar({ isOpen, onClose }) {
    return (
        <>
            {/* Mobile overlay */}
            <div
                className={`sb-overlay ${isOpen ? "show" : ""}`}
                onClick={onClose}
            />

            <aside className={`sb ${isOpen ? "open" : ""}`}>
                <div className="sb-header">
                    <div className="sb-title">Udemy Course Platform</div>
                    <button className="sb-close" onClick={onClose} aria-label="Close sidebar">
                        ✕
                    </button>
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
            </aside>
        </>
    );
}
