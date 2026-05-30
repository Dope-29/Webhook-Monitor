import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconPlus, IconEdit, IconTrash, IconCopy, IconCheck, IconArrowLeft } from '@tabler/icons-react';
import AppLayout from '../components/Layout/AppLayout';
import client from '../api/client';
import { SkeletonTableBody } from '../components/Skeleton';
import { useConfirm } from '../components/ConfirmModal';
import { toastSuccess, toastError } from '../store/toastStore';

const BLANK_FORM = { name: '', destination_url: '', retention_days: 30, provider: '' };

export default function PipelinesPage() {
  const navigate = useNavigate();
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);

  // 'list' | 'form' | 'created'
  const [view, setView] = useState('list');
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [createdPipeline, setCreatedPipeline] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = () =>
    client.get('/api/pipelines')
      .then(r => setPipelines(r.data.pipelines || []))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const { data } = await client.post('/api/pipelines', {
        ...form,
        retention_days: Number(form.retention_days),
      });
      setCreatedPipeline(data.pipeline);
      setView('created');
      load(); // refresh list in background
    } catch (err) {
      setFormError(
        err.response?.data?.error ||
        err.response?.data?.details?.[0]?.message ||
        'Failed to create pipeline.'
      );
    } finally {
      setSaving(false);
    }
  };

  const confirm = useConfirm();
  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete pipeline?',
      message: 'All associated events will also be permanently deleted.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await client.delete(`/api/pipelines/${id}`);
      toastSuccess('Pipeline deleted.');
      load();
    } catch {
      toastError('Failed to delete pipeline.');
    }
  };

  const proxyUrl = (id) => `http://localhost:5000/webhook/${id}`;

  const handleCopy = (url) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const resetToList = () => {
    setView('list');
    setForm(BLANK_FORM);
    setFormError('');
    setCreatedPipeline(null);
  };

  // ── Creation form (onboarding style) ───────────────────────────────────────
  if (view === 'form' || view === 'created') {
    return (
      <AppLayout topbarProps={{
        breadcrumb: (
          <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }} onClick={resetToList}>
            <IconArrowLeft size={13} stroke={1.5} />Pipelines
          </span>
        ),
      }}>
        <div style={{ maxWidth: 560, margin: '0 auto', paddingTop: '0.5rem' }}>

          {/* ── Success: proxy URL reveal ── */}
          {view === 'created' && createdPipeline && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <IconCheck size={14} stroke={2.5} style={{ color: '#3B6D11' }} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    <span className="mono">{createdPipeline.name}</span> created
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    Paste the proxy URL below into your provider's webhook settings
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
                Proxy URL{' '}
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-text-tertiary)' }}>
                  (your provider calls this — not your server)
                </span>
              </div>
              <div
                className="url-pill"
                style={{ width: '100%', justifyContent: 'space-between', marginBottom: '1.25rem', cursor: 'pointer' }}
                onClick={() => handleCopy(proxyUrl(createdPipeline.id))}
              >
                <span className="mono" style={{ fontSize: 11 }}>{proxyUrl(createdPipeline.id)}</span>
                {copied
                  ? <IconCheck size={13} stroke={2.5} style={{ color: 'var(--color-green)', flexShrink: 0 }} />
                  : <IconCopy size={13} stroke={1.5} style={{ flexShrink: 0 }} />
                }
              </div>

              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: '1.25rem', padding: '8px 10px', background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)' }}>
                Incoming webhooks are caught, AES-256-GCM encrypted, saved in under 30ms, then forwarded to{' '}
                <span className="mono">{createdPipeline.destination_url}</span>.
                If your server is down, events are held and retried automatically.
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/pipelines/${createdPipeline.id}`)}>
                  View pipeline →
                </button>
                <button className="btn btn-sm" onClick={() => { setForm(BLANK_FORM); setCreatedPipeline(null); setView('form'); }}>
                  <IconPlus size={12} /> Create another
                </button>
                <button className="btn btn-sm" onClick={resetToList}>
                  Back to list
                </button>
              </div>
            </div>
          )}

          {/* ── Creation form ── */}
          {view === 'form' && (
            <form onSubmit={handleCreate}>
              <div className="card">
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: '1rem' }}>New pipeline</div>

                {formError && (
                  <div style={{ fontSize: 12, color: 'var(--color-red)', marginBottom: '0.75rem', padding: '8px 10px', background: 'var(--color-red-light)', borderRadius: 'var(--border-radius-md)' }}>
                    {formError}
                  </div>
                )}

                <div className="form-row">
                  <label className="form-label">Pipeline name</label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                    placeholder="e.g. stripe-production"
                    autoFocus
                  />
                </div>

                <div className="form-row">
                  <label className="form-label">
                    Destination URL{' '}
                    <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>(your actual server)</span>
                  </label>
                  <input
                    className="form-input"
                    type="url"
                    value={form.destination_url}
                    onChange={e => setForm(f => ({ ...f, destination_url: e.target.value }))}
                    required
                    placeholder="https://api.yourapp.com/webhooks"
                  />
                  <div className="form-hint">
                    HookWatch forwards captured events here. Use <a href="https://webhook.site" target="_blank" rel="noreferrer" style={{ color: '#185FA5' }}>webhook.site</a> to test.
                  </div>
                </div>

                <div className="two-col">
                  <div className="form-row">
                    <label className="form-label">Provider <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>(optional)</span></label>
                    <input
                      className="form-input"
                      value={form.provider}
                      onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                      placeholder="e.g. Stripe, Shopify"
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
                </div>

                <div className="divider" />

                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                  After creation you'll get a proxy URL to paste into your provider. Events are encrypted at rest and forwarded automatically.
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>
                    {saving ? 'Creating…' : 'Create pipeline →'}
                  </button>
                  <button className="btn btn-sm" type="button" onClick={resetToList}>
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </AppLayout>
    );
  }

  // ── Pipeline list ───────────────────────────────────────────────────────────
  return (
    <AppLayout topbarProps={{
      actions: (
        <button className="btn btn-sm btn-primary" onClick={() => setView('form')}>
          <IconPlus size={14} /> New pipeline
        </button>
      ),
    }}>
      <div className="page-title">Pipelines</div>

      <div className="card">
        {loading ? (
          <table>
            <thead><tr><th>Name</th><th>Destination</th><th>Provider</th><th>Retention</th><th>Proxy URL</th><th /></tr></thead>
            <SkeletonTableBody rows={4} cols={6} />
          </table>
        ) : pipelines.length === 0 ? (
          <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div>No pipelines yet.</div>
            <button className="btn btn-sm btn-primary" onClick={() => setView('form')}>
              <IconPlus size={12} /> Create your first pipeline
            </button>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Destination</th>
                <th>Provider</th>
                <th>Retention</th>
                <th>Proxy URL</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pipelines.map(p => (
                <tr key={p.id}>
                  <td
                    className="mono"
                    style={{ color: '#185FA5', cursor: 'pointer' }}
                    onClick={() => navigate(`/pipelines/${p.id}`)}
                  >
                    {p.name}
                  </td>
                  <td className="mono" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.destination_url}
                  </td>
                  <td>{p.provider ? <span className="badge badge-gray">{p.provider}</span> : '—'}</td>
                  <td>{p.retention_days}d</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="mono" style={{ color: '#185FA5', fontSize: 11 }}>{proxyUrl(p.id)}</span>
                      <IconCopy
                        size={11}
                        stroke={1.5}
                        style={{ cursor: 'pointer', color: 'var(--color-text-tertiary)' }}
                        onClick={() => navigator.clipboard.writeText(proxyUrl(p.id))}
                      />
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm" onClick={() => navigate(`/pipelines/${p.id}`)}>
                        <IconEdit size={12} />
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id)}>
                        <IconTrash size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
}
