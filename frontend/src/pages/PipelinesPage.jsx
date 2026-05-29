import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconPlus, IconEdit, IconTrash, IconCopy } from '@tabler/icons-react';
import AppLayout from '../components/Layout/AppLayout';
import client from '../api/client';

export default function PipelinesPage() {
  const navigate = useNavigate();
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', destination_url: '', retention_days: 30, provider: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = () => client.get('/api/pipelines')
    .then(r => setPipelines(r.data.pipelines || []))
    .catch(() => {})
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true); setFormError('');
    try {
      await client.post('/api/pipelines', { ...form, retention_days: Number(form.retention_days) });
      setShowForm(false);
      setForm({ name: '', destination_url: '', retention_days: 30, provider: '' });
      load();
    } catch (err) {
      setFormError(err.response?.data?.error || (err.response?.data?.details?.[0]?.message) || 'Failed to create pipeline.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this pipeline? All associated events will also be deleted.')) return;
    await client.delete(`/api/pipelines/${id}`).catch(() => {});
    load();
  };

  const proxyUrl = (id) => `https://in.hookwatch.io/p/${id.slice(0, 8)}`;

  return (
    <AppLayout topbarProps={{
      actions: (
        <button className="btn btn-sm btn-primary" onClick={() => setShowForm(true)}>
          <IconPlus size={14} /> New pipeline
        </button>
      ),
    }}>
      <div className="page-title">Pipelines</div>

      {/* Create form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '1rem', borderColor: '#185FA5' }}>
          <div className="section-head"><div className="section-title">New pipeline</div></div>
          {formError && <div style={{ fontSize: 12, color: 'var(--color-red)', marginBottom: 8 }}>{formError}</div>}
          <form onSubmit={handleCreate}>
            <div className="two-col">
              <div className="form-row">
                <label className="form-label">Pipeline name</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="stripe-production" />
              </div>
              <div className="form-row">
                <label className="form-label">Destination URL</label>
                <input className="form-input" type="url" value={form.destination_url} onChange={e => setForm(f => ({ ...f, destination_url: e.target.value }))} required placeholder="https://api.myapp.com/webhooks" />
              </div>
              <div className="form-row">
                <label className="form-label">Provider (optional)</label>
                <input className="form-input" value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} placeholder="Stripe" />
              </div>
              <div className="form-row">
                <label className="form-label">Retention (days)</label>
                <input className="form-input" type="number" min={1} max={365} value={form.retention_days} onChange={e => setForm(f => ({ ...f, retention_days: e.target.value }))} required />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create pipeline'}</button>
              <button className="btn btn-sm" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Pipelines table */}
      <div className="card">
        {loading ? (
          <div className="empty-state">Loading pipelines…</div>
        ) : pipelines.length === 0 ? (
          <div className="empty-state">
            No pipelines yet.{' '}
            <button className="btn btn-sm btn-primary" onClick={() => setShowForm(true)}>
              <IconPlus size={12} /> Create first pipeline
            </button>
          </div>
        ) : (
          <table>
            <thead>
              <tr><th>Name</th><th>Destination</th><th>Provider</th><th>Retention</th><th>Proxy URL</th><th /></tr>
            </thead>
            <tbody>
              {pipelines.map(p => (
                <tr key={p.id}>
                  <td className="mono" style={{ color: '#185FA5', cursor: 'pointer' }} onClick={() => navigate(`/pipelines/${p.id}`)}>{p.name}</td>
                  <td className="mono" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.destination_url}</td>
                  <td>{p.provider ? <span className="badge badge-gray">{p.provider}</span> : '—'}</td>
                  <td>{p.retention_days}d</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="mono" style={{ color: '#185FA5' }}>{proxyUrl(p.id)}</span>
                      <IconCopy size={11} stroke={1.5} style={{ cursor: 'pointer', color: 'var(--color-text-tertiary)' }} onClick={() => navigator.clipboard.writeText(`https://in.hookwatch.io/webhook/${p.id}`)} />
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm" onClick={() => navigate(`/pipelines/${p.id}`)}><IconEdit size={12} /></button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id)}><IconTrash size={12} /></button>
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
