import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { IconLoader2, IconCheck, IconX } from '@tabler/icons-react';
import client from '../api/client';
import useAuthStore from '../store/authStore';

export default function TeamAcceptPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [status, setStatus] = useState('loading'); // loading | needs_signup | error | success
  const [info,   setInfo]   = useState(null);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    // First fetch info to show the user context
    client.get(`/api/team/invite-info/${token}`)
      .then(r => {
        setInfo(r.data.invite);
        // Now accept
        return client.post(`/api/team/accept/${token}`);
      })
      .then(r => {
        const { status: s, token: jwt, customer_id } = r.data;
        if (s === 'needs_signup') {
          // No account yet — redirect to signup with pre-filled email
          navigate(`/signup?email=${encodeURIComponent(r.data.email)}&invite=${token}`);
          return;
        }
        // Accepted — log them in to workspace
        setAuth(jwt, customer_id);
        setStatus('success');
        setTimeout(() => navigate('/dashboard'), 2000);
      })
      .catch(() => setStatus('error'));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-background-primary)',
    }}>
      <div style={{
        width: 360, background: 'var(--color-surface)', borderRadius: 'var(--border-radius-lg)',
        border: '1px solid var(--color-border)', padding: '2rem',
        boxShadow: 'var(--shadow-md)', textAlign: 'center',
      }}>
        <div className="logo" style={{ justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div className="logo-dot" />HookWatch
        </div>

        {status === 'loading' && (
          <>
            <IconLoader2 size={32} className="spinner" style={{ color: 'var(--color-blue)', margin: '0 auto 1rem' }} />
            <div style={{ fontSize: 14, fontWeight: 500 }}>Accepting invitation…</div>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', background: '#E6F4EC',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem',
            }}>
              <IconCheck size={22} style={{ color: '#2D7D46' }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>You're in!</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              {info?.owner_name ? `Joined ${info.owner_name}'s workspace. ` : ''}
              Redirecting to dashboard…
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', background: '#FDECEA',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem',
            }}>
              <IconX size={22} style={{ color: '#C0392B' }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Invite expired or invalid</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
              This invite link is no longer valid. Ask the workspace owner to send a new invitation.
            </div>
            <button className="btn btn-sm" onClick={() => navigate('/login')}>Go to login</button>
          </>
        )}
      </div>
    </div>
  );
}
