import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { IconBrandGithub, IconBrandGoogle, IconCheck, IconLoader2 } from '@tabler/icons-react';
import client from '../api/client';
import useAuthStore from '../store/authStore';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const WHY = [
  { title: 'Zero-config setup', desc: 'Paste your proxy URL, done in 2 minutes' },
  { title: 'Full payload history', desc: 'Every event logged, encrypted, and replayable' },
  { title: 'Instant Slack alerts', desc: 'Know within seconds when something breaks' },
];

export default function AuthPage({ mode = 'signup' }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth } = useAuthStore();
  const isSignup = mode === 'signup';

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    searchParams.get('error') === 'oauth_failed'
      ? 'OAuth sign-in failed. Please try again or use email/password.'
      : ''
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
      const payload = isSignup
        ? { name: form.name, email: form.email, password: form.password }
        : { email: form.email, password: form.password };
      const { data } = await client.post(endpoint, payload);
      setAuth(data.token, data.customer_id, isSignup ? form.name : null);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      {/* Left — Form */}
      <div style={{ padding: '2.5rem', background: 'var(--color-background-primary)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="logo" style={{ marginBottom: '1.5rem' }}>
          <div className="logo-dot" />HookWatch
        </div>

        <h1 style={{ fontSize: 16, fontWeight: 500, marginBottom: '0.25rem' }}>
          {isSignup ? 'Create your account' : 'Welcome back'}
        </h1>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
          {isSignup ? '14-day free trial, no credit card needed' : 'Sign in to your HookWatch account'}
        </p>

        {error && (
          <div style={{ fontSize: 12, color: 'var(--color-red)', marginBottom: '0.75rem', padding: '8px 10px', background: 'var(--color-red-light)', borderRadius: 'var(--border-radius-md)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <div className="form-row">
              <label className="form-label">Full name</label>
              <input
                className="form-input"
                type="text"
                placeholder="Jon Smith"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
          )}
          <div className="form-row">
            <label className="form-label">Work email</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div className="form-row">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
              minLength={8}
            />
          </div>

          <button className="btn btn-primary btn-full" type="submit" disabled={loading} style={{ marginBottom: 10 }}>
            {loading ? <IconLoader2 size={14} className="spinner" /> : null}
            {isSignup ? 'Create account' : 'Sign in'}
          </button>
          {!isSignup && (
            <div style={{ textAlign: 'right', marginTop: -4, marginBottom: 4 }}>
              <Link to="/forgot-password" style={{ fontSize: 11, color: '#185FA5' }}>Forgot password?</Link>
            </div>
          )}
        </form>

        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-tertiary)', margin: '4px 0' }}>or</div>

        <a
          href={`${BACKEND_URL}/api/auth/github`}
          className="btn btn-full"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none', marginBottom: 6 }}
        >
          <IconBrandGithub size={14} stroke={1.5} /> Continue with GitHub
        </a>

        <a
          href={`${BACKEND_URL}/api/auth/google`}
          className="btn btn-full"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}
        >
          <IconBrandGoogle size={14} stroke={1.5} /> Continue with Google
        </a>

        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: '1rem', textAlign: 'center' }}>
          {isSignup ? (
            <>Already have an account?{' '}<Link to="/login" style={{ color: '#185FA5' }}>Log in</Link></>
          ) : (
            <>Don't have an account?{' '}<Link to="/signup" style={{ color: '#185FA5' }}>Sign up free</Link></>
          )}
        </div>
      </div>

      {/* Right — Why panel */}
      <div style={{ padding: '2.5rem', background: 'var(--color-background-secondary)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem' }}>Why teams use HookWatch</div>
        {WHY.map(({ title, desc }) => (
          <div key={title} className="onboarding-step">
            <div className="step-num done"><IconCheck size={10} stroke={2.5} /></div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{title}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
