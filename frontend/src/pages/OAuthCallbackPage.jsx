import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../store/authStore';

/**
 * OAuthCallbackPage
 *
 * The backend redirects here after a successful OAuth login:
 *   /oauth-callback?token=xxx&customer_id=yyy
 *
 * Or on failure:
 *   /login?error=oauth_failed
 *
 * This page reads the params, stores the token, and navigates to dashboard.
 * Shows a brief loading state while this happens.
 */
export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const customerId = searchParams.get('customer_id');

    if (token && customerId) {
      setAuth(token, customerId);
      navigate('/dashboard', { replace: true });
    } else {
      setError('OAuth sign-in failed. Please try again.');
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-background-primary)',
      gap: 12,
    }}>
      <div className="logo"><div className="logo-dot" />HookWatch</div>
      {error ? (
        <div style={{ fontSize: 13, color: 'var(--color-red)' }}>{error}</div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          Signing you in…
        </div>
      )}
    </div>
  );
}
