import { NavLink } from 'react-router-dom';
import {
  IconLayoutDashboard, IconGitBranch, IconListDetails, IconPlayerPlay,
  IconBellRinging, IconHistory, IconUsers, IconKey, IconCreditCard,
  IconSettings,
} from '@tabler/icons-react';

const NAV = [
  { to: '/dashboard', label: 'Overview',     icon: IconLayoutDashboard },
  { to: '/pipelines', label: 'Pipelines',    icon: IconGitBranch },
  { to: '/events',    label: 'Event logs',   icon: IconListDetails },
  { to: '/replay',    label: 'Replay queue', icon: IconPlayerPlay },
];

const ALERTS = [
  { to: '/alerts',         label: 'Alert rules',   icon: IconBellRinging },
  { to: '/alerts/history', label: 'Alert history', icon: IconHistory },
];

const WORKSPACE = [
  { to: '/team',     label: 'Team',     icon: IconUsers },
  { to: '/api-keys', label: 'API keys', icon: IconKey },
  { to: '/billing',  label: 'Billing',  icon: IconCreditCard },
  { to: '/settings', label: 'Settings', icon: IconSettings },
];

function SidebarLink({ to, label, Icon, onClick }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
      onClick={onClick}
    >
      <Icon size={15} stroke={1.5} />
      {label}
    </NavLink>
  );
}

export default function Sidebar({ onNav }) {
  return (
    <nav className="sidebar">
      {NAV.map(({ to, label, icon: Icon }) => (
        <SidebarLink key={to} to={to} label={label} Icon={Icon} onClick={onNav} />
      ))}

      <div className="sidebar-section">Alerts</div>
      {ALERTS.map(({ to, label, icon: Icon }) => (
        <SidebarLink key={to} to={to} label={label} Icon={Icon} onClick={onNav} />
      ))}

      <div className="sidebar-section">Workspace</div>
      {WORKSPACE.map(({ to, label, icon: Icon }) => (
        <SidebarLink key={to} to={to} label={label} Icon={Icon} onClick={onNav} />
      ))}

      <div className="sidebar-footer">
        <div style={{ marginBottom: 2 }}>HookWatch</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/privacy" style={{ color: 'inherit', textDecoration: 'underline', textDecorationColor: 'var(--color-border-secondary)' }}>Privacy</a>
          <a href="/terms"   style={{ color: 'inherit', textDecoration: 'underline', textDecorationColor: 'var(--color-border-secondary)' }}>Terms</a>
        </div>
      </div>
    </nav>
  );
}
