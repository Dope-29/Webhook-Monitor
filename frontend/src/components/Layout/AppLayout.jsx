import { useState, useCallback } from 'react';
import Topbar from './Topbar';
import Sidebar from './Sidebar';

export default function AppLayout({ children, topbarProps }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const close = useCallback(() => setSidebarOpen(false), []);
  const toggle = useCallback(() => setSidebarOpen(v => !v), []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar {...(topbarProps || {})} onMenuToggle={toggle} />
      <div className={`app-layout${sidebarOpen ? ' sidebar-open' : ''}`}>
        {/* Mobile overlay */}
        <div className="sidebar-overlay" onClick={close} />
        <Sidebar onNav={close} />
        <main className="main fade-in">{children}</main>
      </div>
    </div>
  );
}
