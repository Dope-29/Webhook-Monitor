import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconLoader2, IconCheck } from '@tabler/icons-react';
import client from '../api/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await client.post('/api/auth/forgot-password', { email });
      setDone(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-background-primary)', padding: '1.5rem',
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div className="logo" style={{ marginBottom: '1.5rem' }}>
          <div className="logo-dot" />HookWatch
        </div>

        {done ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <IconCheck size={18} style={{ color: '#3B6D11' }} />
            </div>
            <div style={{ fontWeight: 500, marginBottom: 6 }}>Check your email</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              If <strong>{email}</strong> is registered, you'll receive a reset link shortly.
            </div>
            <Link to="/login" style={{ display: 'block', marginTop: '1.25rem', fontSize: 12, color: '#185FA5' }}>
              Back to login
            </Link>
          </div>
        ) : (
          <div className="card">
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Forgot your password?</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
              Enter your email and we'll send a reset link.
            </div>
            {error && (
              <div style={{ fontSize: 12, color: 'var(--color-red)', marginBottom: 10, padding: '8px 10px', background: 'var(--color-red-light)', borderRadius: 'var(--border-radius-md)' }}>
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <label className="form-label">Work email</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
                {loading ? <IconLoader2 size={14} className="spinner" /> : null}
                Send reset link
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: 12 }}>
              <Link to="/login" style={{ color: '#185FA5' }}>Back to login</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
