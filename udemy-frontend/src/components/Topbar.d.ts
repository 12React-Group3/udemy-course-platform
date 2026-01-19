import { ComponentType } from 'react';

export interface TopbarProps {
  onLogout?: () => void;
  onLogoClick?: () => void;
  onToggleSidebar?: () => void;
}

declare const Topbar: ComponentType<TopbarProps>;
export default Topbar;
