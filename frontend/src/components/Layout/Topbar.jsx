import { useNavigate } from 'react-router-dom';
import { IconBell, IconMenu2 } from '@tabler/icons-react';
import useAuthStore from '../../store/authStore';

export default function Topbar({ actions, breadcrumb, onMenuToggle }) {
  const navigate = useNavigate();
  const { logout, userName } = useAuthStore();

  const initials = userName
    ? userName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'ME';

  return (
    <header className="topbar">
      {/* Mobile hamburger */}
      <button className="mobile-menu-btn" onClick={onMenuToggle} title="Menu" aria-label="Open navigation">
        <IconMenu2 size={18} />
      </button>

      {/* Logo */}
      <div className="logo" onClick={() => navigate('/dashboard')}>
        <div className="logo-dot" />
        HookWatch
      </div>

      {/* Breadcrumb */}
      {breadcrumb && (
        <div className="breadcrumb" style={{ flex: 1 }}>
          {breadcrumb}
        </div>
      )}

      {/* Right side */}
      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
        {actions}
        <IconBell
          size={16}
          stroke={1.5}
          style={{ color: 'var(--color-text-secondary)', cursor: 'pointer', flexShrink: 0 }}
          onClick={() => navigate('/alerts/history')}
          title="Alert history"
        />
        <div
          className="avatar"
          style={{ cursor: 'pointer', flexShrink: 0 }}
          onClick={logout}
          title={`${userName || 'Account'} — click to log out`}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
