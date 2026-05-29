import { useNavigate } from 'react-router-dom';
import { IconBell, IconLoader2 } from '@tabler/icons-react';
import useAuthStore from '../../store/authStore';

export default function Topbar({ title, actions, breadcrumb }) {
  const navigate = useNavigate();
  const { logout, customerId } = useAuthStore();
  const initials = customerId ? customerId.slice(0, 2).toUpperCase() : '??';

  return (
    <header className="topbar">
      <div className="logo" onClick={() => navigate('/dashboard')}>
        <div className="logo-dot" />
        HookWatch
      </div>

      {breadcrumb && (
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          {breadcrumb}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {actions}
        <IconBell size={16} stroke={1.5} style={{ color: 'var(--color-text-secondary)', cursor: 'pointer' }} />
        <div
          className="avatar"
          style={{ cursor: 'pointer' }}
          onClick={logout}
          title="Click to log out"
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
