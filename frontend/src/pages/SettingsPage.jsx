import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/Layout/AppLayout';
import client from '../api/client';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('Acme Corp');
  const [slug, setSlug] = useState('acme-corp');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    await client.put('/api/settings', { workspace_name: name, retention_days: 30 }).catch(() => {});
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AppLayout topbarProps={{ breadcrumb: 'Settings' }}>
      <div className="page-title">Settings</div>

      {/* Workspace */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: '0.75rem' }}>Workspace</div>
        <form onSubmit={handleSave}>
          <div className="form-row">
            <label className="form-label">Workspace name</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="form-row">
            <label className="form-label">Workspace slug</label>
            <input className="form-input mono" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} />
            <div className="form-hint">Used in your proxy URLs: in.hookwatch.io/{slug}/...</div>
          </div>
          <button className="btn btn-sm btn-primary" type="submit" disabled={saving}>
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>

      {/* Data & Privacy */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: '0.75rem' }}>Data &amp; privacy</div>
        {[
          { label: 'Default log retention', sub: 'Auto-delete events after', control: <div className="form-input" style={{ width: 120, fontSize: 12 }}>30 days ▾</div> },
          { label: 'Encrypt payload bodies', sub: 'AES-256 per-workspace key', control: <div className="toggle on"><div className="toggle-knob" /></div> },
          { label: 'Mask sensitive fields', sub: 'Redact card numbers, tokens in logs', control: <div className="toggle on"><div className="toggle-knob" /></div> },
        ].map(({ label, sub, control }) => (
          <div key={label} className="alert-rule">
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{sub}</div>
            </div>
            {control}
          </div>
        ))}
      </div>

      {/* Danger zone */}
      <div className="card" style={{ borderColor: 'var(--color-border-danger)' }}>
        <div className="section-title" style={{ marginBottom: '0.75rem', color: 'var(--color-text-danger)' }}>Danger zone</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500 }}>Delete workspace</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Permanently delete all pipelines, logs, and data</div>
          </div>
          <button className="btn btn-sm btn-danger" onClick={() => confirm('This will permanently delete all data. Are you sure?')}>Delete workspace</button>
        </div>
      </div>
    </AppLayout>
  );
}
