import { useState, useEffect } from 'react';
import AppLayout from '../components/Layout/AppLayout';
import client from '../api/client';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [retentionDays, setRetentionDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    client.get('/api/settings')
      .then(r => {
        setSettings(r.data.settings);
        setRetentionDays(r.data.settings.default_retention_days ?? 30);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSaveRetention = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await client.put('/api/settings/retention', {
        default_retention_days: Number(retentionDays),
      });
      setSettings(data.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout topbarProps={{ breadcrumb: 'Settings' }}>
      <div className="page-title">Settings</div>

      {/* Account info (read-only from JWT) */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: '0.75rem' }}>Account</div>
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : (
          <div style={{ fontSize: 12 }}>
            {[
              ['Name', settings?.name || '—'],
              ['Email', settings?.email || '—'],
              ['Member since', settings?.created_at ? new Date(settings.created_at).toLocaleDateString() : '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>{k}</span>
                <span className="mono">{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data retention */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: '0.75rem' }}>Data & retention</div>
        {error && <div style={{ fontSize: 12, color: 'var(--color-red)', marginBottom: 8 }}>{error}</div>}
        <form onSubmit={handleSaveRetention}>
          <div className="form-row">
            <label className="form-label">Default log retention (days)</label>
            <input
              className="form-input"
              type="number"
              min={1}
              max={365}
              value={retentionDays}
              onChange={e => setRetentionDays(e.target.value)}
              disabled={loading}
              style={{ maxWidth: 120 }}
            />
            <div className="form-hint">Events older than this are automatically deleted by the nightly cleanup job.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            {[
              { label: 'Encrypt payload bodies', sub: 'AES-256-GCM per-customer key', on: true },
              { label: 'Signature verification', sub: 'HMAC checked before forwarding', on: true },
            ].map(({ label, sub, on }) => (
              <div key={label} className="alert-rule" style={{ flex: 1, pointerEvents: 'none', marginBottom: 0 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{sub}</div>
                </div>
                <div className={`toggle${on ? ' on' : ''}`}><div className="toggle-knob" /></div>
              </div>
            ))}
          </div>
          <button className="btn btn-sm btn-primary" type="submit" disabled={saving || loading} style={{ marginTop: '0.75rem' }}>
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="card" style={{ borderColor: 'var(--color-border-danger)' }}>
        <div className="section-title" style={{ marginBottom: '0.75rem', color: 'var(--color-text-danger)' }}>Danger zone</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500 }}>Delete all event data</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Permanently delete all captured webhook events</div>
          </div>
          <button
            className="btn btn-sm btn-danger"
            onClick={() => confirm('This will permanently delete all event data. Are you sure?')}
          >
            Delete events
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
