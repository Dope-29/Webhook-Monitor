import { NavLink, useNavigate } from 'react-router-dom';
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

function SidebarLink({ to, label, Icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
    >
      <Icon size={16} stroke={1.5} />
      {label}
    </NavLink>
  );
}

export default function Sidebar() {
  return (
    <nav className="sidebar">
      {NAV.map(({ to, label, icon: Icon }) => (
        <SidebarLink key={to} to={to} label={label} Icon={Icon} />
      ))}
      <div className="sidebar-section">Alerts</div>
      {ALERTS.map(({ to, label, icon: Icon }) => (
        <SidebarLink key={to} to={to} label={label} Icon={Icon} />
      ))}
      <div className="sidebar-section">Workspace</div>
      {WORKSPACE.map(({ to, label, icon: Icon }) => (
        <SidebarLink key={to} to={to} label={label} Icon={Icon} />
      ))}
    </nav>
  );
}
