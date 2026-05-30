import { useState, useEffect } from 'react';
import {
  IconKey, IconCopy, IconTrash, IconPlus, IconCheck,
  IconLoader2, IconAlertTriangle, IconEye, IconEyeOff,
} from '@tabler/icons-react';
import AppLayout from '../components/Layout/AppLayout';
import client from '../api/client';
import { toastSuccess, toastError } from '../store/toastStore';
import { useConfirm } from '../components/ConfirmModal';
import { SkeletonTableBody } from '../components/Skeleton';

const BLANK_FORM = { name: '', expires_days: '' };

function timeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ApiKeysPage() {
  const confirm = useConfirm();
  const [keys,    setKeys]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form,    setForm]    = useState(BLANK_FORM);
  const [saving,  setSaving]  = useState(false);
  const [newKey,  setNewKey]  = useState(null); // { raw_key, key }
  const [copied,  setCopied]  = useState(null);
  const [showRaw, setShowRaw] = useState(false);

  const load = () =>
    client.get('/api/api-keys')
      .then(r => setKeys(r.data.keys || []))
      .catch(() => toastError('Failed to load API keys.'))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toastError('Enter a key name.');
    setSaving(true);
    try {
      const payload = { name: form.name.trim() };
      if (form.expires_days) payload.expires_days = parseInt(form.expires_days);
      const { data } = await client.post('/api/api-keys', payload);
      setKeys(prev => [data.key, ...prev]);
      setNewKey({ raw_key: data.raw_key, key: data.key });
      setShowModal(false);
      setForm(BLANK_FORM);
    } catch (err) {
      toastError(err.response?.data?.error || 'Failed to create key.');
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (key) => {
    const ok = await confirm({
      title: 'Revoke API key',
      message: `Revoke "${key.name}"? Any integrations using this key will immediately stop working.`,
      confirmLabel: 'Revoke',
      danger: true,
    });
    if (!ok) return;
    try {
      await client.delete(`/api/api-keys/${key.id}`);
      setKeys(prev => prev.map(k => k.id === key.id ? { ...k, revoked: true } : k));
      toastSuccess('Key revoked.');
    } catch {
      toastError('Failed to revoke key.');
    }
  };

  return (
    <AppLayout topbarProps={{
      breadcrumb: 'API keys',
      actions: (
        <button className="btn btn-sm btn-primary" onClick={() => setShowModal(true)}>
          <IconPlus size={13} /> New API key
        </button>
      ),
    }}>
      <div className="page-title">API keys</div>

      {/* New key reveal */}
      {newKey && (
        <div className="card" style={{ borderColor: 'var(--color-blue)', borderWidth: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <IconAlertTriangle size={16} style={{ color: '#C0892B' }} />
            <span style={{ fontWeight: 600, fontSize: 13 }}>Save your API key — it won't be shown again</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              flex: 1, padding: '8px 12px', background: 'var(--color-background-secondary)',
              borderRadius: 'var(--border-radius-md)', fontFamily: 'monospace', fontSize: 12,
              wordBreak: 'break-all', letterSpacing: '0.02em',
            }}>
              {showRaw ? newKey.raw_key : newKey.raw_key.replace(/(?<=^.{14}).*(?=.{4}$)/g, '•'.repeat(30))}
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => setShowRaw(v => !v)} title="Toggle visibility">
              {showRaw ? <IconEyeOff size={14} /> : <IconEye size={14} />}
            </button>
            <button className="btn btn-sm btn-primary" onClick={() => handleCopy(newKey.raw_key, 'new')}>
              {copied === 'new' ? <IconCheck size={13} /> : <IconCopy size={13} />}
              {copied === 'new' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8 }}>
            Store this in an environment variable. Treat it like a password.
          </div>
          <button
            className="btn btn-sm"
            style={{ marginTop: 10 }}
            onClick={() => setNewKey(null)}
          >
            I've saved it
          </button>
        </div>
      )}

      {/* Keys table */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: '0.5rem' }}>Your API keys</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
          Use API keys with <code style={{ fontSize: 11, background: 'var(--color-background-secondary)', padding: '1px 5px', borderRadius: 4 }}>Authorization: Bearer hw_...</code> to authenticate API requests.
        </div>

        {loading ? (
          <table className="table">
            <thead><tr><th>Name</th><th>Key</th><th>Last used</th><th>Expires</th><th>Status</th><th></th></tr></thead>
            <SkeletonTableBody cols={6} rows={3} />
          </table>
        ) : keys.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <IconKey size={20} stroke={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
            <div>No API keys yet.</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
              Create an API key to authenticate programmatic access to HookWatch.
            </div>
            <button className="btn btn-sm btn-primary" onClick={() => setShowModal(true)} style={{ marginTop: 4 }}>
              <IconPlus size={13} /> Create API key
            </button>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Key</th>
                <th>Last used</th>
                <th>Expires</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id} style={{ opacity: k.revoked ? 0.5 : 1 }}>
                  <td style={{ fontWeight: 500, fontSize: 12 }}>{k.name}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <code style={{ fontSize: 11, background: 'var(--color-background-secondary)', padding: '2px 6px', borderRadius: 4 }}>
                        {k.key_prefix}
                      </code>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => handleCopy(k.key_prefix, k.id)}
                        disabled={k.revoked}
                        title="Copy prefix"
                        style={{ padding: '2px 5px' }}
                      >
                        {copied === k.id ? <IconCheck size={10} /> : <IconCopy size={10} />}
                      </button>
                    </div>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                    {timeAgo(k.last_used_at)}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                    {formatDate(k.expires_at)}
                  </td>
                  <td>
                    <span className={`badge ${k.revoked ? 'badge-error' : 'badge-success'}`}>
                      {k.revoked ? 'Revoked' : 'Active'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {!k.revoked && (
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => handleRevoke(k)}
                        title="Revoke"
                      >
                        <IconTrash size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Usage example */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: '0.5rem' }}>Usage</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
          Include your API key in the Authorization header:
        </div>
        <div style={{
          padding: '10px 14px',
          background: 'var(--color-background-secondary)',
          borderRadius: 'var(--border-radius-md)',
          fontFamily: 'monospace', fontSize: 11,
          color: 'var(--color-text-secondary)',
          lineHeight: 1.7,
        }}>
          curl -H "Authorization: Bearer hw_your_key_here" \<br />
          &nbsp;&nbsp;&nbsp;&nbsp;https://api.hookwatch.io/api/pipelines
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8 }}>
          API keys have the same permissions as your account. Keep them secret.
        </div>
      </div>

      {/* Create key modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: '1rem' }}>Create API key</div>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  KEY NAME
                </label>
                <input
                  className="input"
                  placeholder="e.g. Production server"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  autoFocus
                  required
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  EXPIRY (optional)
                </label>
                <select
                  className="input"
                  value={form.expires_days}
                  onChange={e => setForm(f => ({ ...f, expires_days: e.target.value }))}
                >
                  <option value="">No expiry</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                  <option value="365">1 year</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>
                  {saving ? <IconLoader2 size={12} className="spinner" /> : null}
                  Create key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
