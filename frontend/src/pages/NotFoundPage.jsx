import { useNavigate } from 'react-router-dom';
import { IconArrowLeft, IconPlugConnectedX } from '@tabler/icons-react';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-background-primary)', padding: '2rem', gap: 12,
    }}>
      <div className="logo" style={{ marginBottom: '0.5rem' }}>
        <div className="logo-dot" />HookWatch
      </div>
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--color-blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <IconPlugConnectedX size={22} style={{ color: 'var(--color-blue)' }} />
      </div>
      <div style={{ fontWeight: 600, fontSize: 28, color: 'var(--color-text-tertiary)' }}>404</div>
      <div style={{ fontWeight: 500, fontSize: 15 }}>Page not found</div>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
        The page you're looking for doesn't exist or was moved.
      </div>
      <button className="btn btn-sm btn-primary" onClick={() => navigate(-1)} style={{ marginTop: 4 }}>
        <IconArrowLeft size={13} /> Go back
      </button>
    </div>
  );
}
