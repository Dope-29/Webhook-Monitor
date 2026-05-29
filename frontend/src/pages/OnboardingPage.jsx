import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import client from '../api/client';

const STEPS = [
  { n: 1, label: 'Create account', done: true },
  { n: 2, label: 'Set up your first pipeline', done: false },
  { n: 3, label: 'Configure alerts', done: false },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', destination_url: '', provider: '', retention_days: 30 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdPipeline, setCreatedPipeline] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await client.post('/api/pipelines', {
        ...form,
        retention_days: Number(form.retention_days),
      });
      setCreatedPipeline(data.pipeline);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details?.[0]?.message || 'Failed to create pipeline.');
    } finally {
      setLoading(false);
    }
  };

  // The real local proxy URL — this is what the user pastes into their provider's dashboard
  const proxyUrl = createdPipeline
    ? `${window.location.origin.replace('5173', '5000')}/webhook/${createdPipeline.id}`
    : null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background-tertiary)' }}>
      <header className="topbar" style={{ background: 'var(--color-background-primary)' }}>
        <div className="logo"><div className="logo-dot" />HookWatch</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Step 2 of 3 — Set up your first pipeline</div>
        <button className="btn btn-sm" onClick={() => navigate('/dashboard')}>Skip for now</button>
      </header>

      <div style={{ padding: '2rem' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          {/* Step indicator */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: '1.5rem' }}>
            {STEPS.map((step, i) => (
              <>
                <div key={step.n} style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: step.done ? '#EAF3DE' : i === 1 ? '#185FA5' : 'var(--color-background-secondary)',
                  color: step.done ? '#3B6D11' : i === 1 ? '#E6F1FB' : 'var(--color-text-tertiary)',
                  fontSize: 10, fontWeight: 500,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {step.done ? <IconCheck size={10} stroke={2.5} /> : step.n}
                </div>
                {i < STEPS.length - 1 && (
                  <div key={`line-${i}`} style={{ height: 2, flex: 1, background: i === 0 ? '#EAF3DE' : 'var(--color-border-tertiary)' }} />
                )}
              </>
            ))}
          </div>

          {/* After creation: show the real proxy URL and a "Go to dashboard" button */}
          {createdPipeline ? (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconCheck size={12} stroke={2.5} style={{ color: '#3B6D11' }} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Pipeline created!</div>
              </div>

              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                Copy the proxy URL below and paste it as your webhook endpoint in your provider's dashboard (Stripe, Shopify, etc.). Incoming webhooks will be captured, encrypted, and forwarded to your destination.
              </div>

              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
                Your proxy URL <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-text-tertiary)' }}>(paste this in your provider)</span>
              </div>
              <div className="url-pill" style={{ width: '100%', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span className="mono" style={{ fontSize: 11 }}>{proxyUrl}</span>
                <IconCopy size={13} stroke={1.5} style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => navigator.clipboard.writeText(proxyUrl)} />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/dashboard')}>
                  Go to dashboard →
                </button>
                <button className="btn btn-sm" onClick={() => navigate('/pipelines')}>
                  View all pipelines
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreate}>
              <div className="card">
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: '1rem' }}>Create your first pipeline</div>

                {error && <div style={{ fontSize: 12, color: 'var(--color-red)', marginBottom: '0.75rem' }}>{error}</div>}

                <div className="form-row">
                  <label className="form-label">Pipeline name</label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                    placeholder="e.g. stripe-production"
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">Destination URL <span style={{ color: 'var(--color-text-tertiary)' }}>(your actual server)</span></label>
                  <input
                    className="form-input"
                    type="url"
                    value={form.destination_url}
                    onChange={e => setForm(f => ({ ...f, destination_url: e.target.value }))}
                    required
                    placeholder="https://api.yourapp.com/webhooks"
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">Provider <span style={{ color: 'var(--color-text-tertiary)' }}>(optional)</span></label>
                  <input
                    className="form-input"
                    value={form.provider}
                    onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                    placeholder="e.g. Stripe"
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">Retention (days)</label>
                  <input
                    className="form-input"
                    type="number"
                    min={1}
                    max={365}
                    value={form.retention_days}
                    onChange={e => setForm(f => ({ ...f, retention_days: e.target.value }))}
                    required
                  />
                </div>

                <div className="divider" />

                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                  After creation, you'll receive a proxy URL to paste into your webhook provider. Events will be captured, encrypted, and forwarded automatically.
                </div>

                <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
                  {loading ? 'Creating…' : 'Create pipeline →'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
