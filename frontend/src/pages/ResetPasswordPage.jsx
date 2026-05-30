import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { IconLoader2, IconCheck } from '@tabler/icons-react';
import client from '../api/client';
import useAuthStore from '../store/authStore';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    setError('');
    try {
      const { data } = await client.post('/api/auth/reset-password', { token, password });
      setAuth(data.token, data.customer_id);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div className="card" style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
          <div style={{ color: 'var(--color-red)', marginBottom: 8 }}>Invalid reset link.</div>
          <Link to="/forgot-password" style={{ color: '#185FA5', fontSize: 12 }}>Request a new one</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-background-primary)', padding: '1.5rem',
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div className="logo" style={{ marginBottom: '1.5rem' }}>
          <div className="logo-dot" />HookWatch
        </div>
        <div className="card">
          <div style={{ fontWeight: 500, marginBottom: 4 }}>Set new password</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
            Choose a strong password with at least 8 characters.
          </div>
          {error && (
            <div style={{ fontSize: 12, color: 'var(--color-red)', marginBottom: 10, padding: '8px 10px', background: 'var(--color-red-light)', borderRadius: 'var(--border-radius-md)' }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <label className="form-label">New password</label>
              <input className="form-input" type="password" placeholder="••••••••" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div className="form-row">
              <label className="form-label">Confirm password</label>
              <input className="form-input" type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>
            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              {loading ? <IconLoader2 size={14} className="spinner" /> : <IconCheck size={14} />}
              Set password & sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
