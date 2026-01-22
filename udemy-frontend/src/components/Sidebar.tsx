import type { ReactNode } from "react";
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, BookOpen, CheckSquare, Shield, Users } from 'lucide-react';
import { isAdmin, isTutor, getRole, logout } from '../auth/authStore';
import './Sidebar.css';

type NavItem = {
  label: string;
  to: string;
  icon: ReactNode;
};

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: <Home size={18} /> },
  { label: 'Courses', to: '/courses', icon: <BookOpen size={18} /> },
  { label: 'Tasks', to: '/tasks', icon: <CheckSquare size={18} /> },
];

const adminItems: NavItem[] = [{ label: 'Admin', to: '/admin', icon: <Shield size={18} /> }];

const tutorItems: NavItem[] = [{ label: 'Subscribers', to: '/subscribers', icon: <Users size={18} /> }];

export type SidebarProps = {
  /** Mobile drawer open/close */
  isOpen: boolean;
  onClose?: () => void;
  /** Desktop collapsed state */
  collapsed: boolean;
  onToggleCollapse: () => void;
};

export default function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const showAdmin = isAdmin();
  const showTutor = isTutor();
  const role = getRole();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    onClose?.();
    navigate('/login', { replace: true });
  }

  return (
    <>
      {/* Mobile overlay */}
      <div className={`sb-overlay ${isOpen ? 'show' : ''}`} onClick={onClose} />

      <aside className={`sb ${isOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
        <div className="sb-header">
          <div className="sb-title">Udemy Course Platform</div>

          <div className="sb-header-actions">
            {/* Desktop collapse toggle */}
            <button
              className="sb-collapse"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              type="button"
            >
              {collapsed ? '⟨' : '⟩'}
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
              className={({ isActive }) => `sb-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="sb-icon" aria-hidden="true">{item.icon}</span>
              <span className="sb-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {showTutor && (
          <>
            <div className="sb-divider" />
            <div className="sb-sectionLabel">Tutor</div>

            {tutorItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `sb-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <span className="sb-icon" aria-hidden="true">{item.icon}</span>
                <span className="sb-label">{item.label}</span>
              </NavLink>
            ))}
          </>
        )}

        {showAdmin && (
          <>
            <div className="sb-divider" />
            <div className="sb-sectionLabel">Admin</div>

            {adminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `sb-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <span className="sb-icon" aria-hidden="true">{item.icon}</span>
                <span className="sb-label">{item.label}</span>
              </NavLink>
            ))}
          </>
        )}

        {!collapsed && (
          <div className="sidebar-footer">
            {role && (
              <div className={`sb-role-badge sb-role-${role.toLowerCase()}`}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </div>
            )}
            <button className="sidebar-logout" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
