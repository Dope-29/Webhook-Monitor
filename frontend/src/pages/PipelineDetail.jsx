import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IconEdit, IconPlayerPlay, IconCopy, IconCheck, IconSend } from '@tabler/icons-react';
import AppLayout from '../components/Layout/AppLayout';
import client from '../api/client';
import { toastSuccess, toastError } from '../store/toastStore';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

function StatusBadge({ code }) {
  if (!code) return <span className="badge badge-gray">Pending</span>;
  if (code === -1) return <span className="badge badge-danger">Failed</span>;
  if (code >= 200 && code < 300) return <span className="badge badge-success">{code}</span>;
  if (code >= 400 && code < 500) return <span className="badge badge-warn">{code}</span>;
  return <span className="badge badge-danger">{code}</span>;
}

export default function PipelineDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [pausing, setPausing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testSending, setTestSending] = useState(false);

  useEffect(() => {
    Promise.all([
      client.get('/api/pipelines'),
      client.get(`/api/events?pipeline_id=${id}&limit=20`),
    ]).then(([p, e]) => {
      const found = (p.data.pipelines || []).find(pl => pl.id === id);
      setPipeline(found);
      if (found) setForm({ name: found.name, destination_url: found.destination_url, timeout: found.timeout, retention_days: found.retention_days });
      setEvents(e.data.events || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    await client.put(`/api/pipelines/${id}`, { ...form, timeout: Number(form.timeout), retention_days: Number(form.retention_days) });
    setEditing(false);
  };

  const handleTogglePause = async () => {
    setPausing(true);
    try {
      const { data } = await client.put(`/api/pipelines/${id}`, { paused: !pipeline.paused });
      setPipeline(data.pipeline);
    } catch {}
    setPausing(false);
  };

  const proxyUrl = `${BACKEND_URL}/webhook/${id}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(proxyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleTestEvent = async () => {
    setTestSending(true);
    try {
      await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true, source: 'HookWatch test event', timestamp: new Date().toISOString() }),
      });
      toastSuccess('Test event sent! Check Event logs.');
      // Refresh event list after 1s
      setTimeout(() => {
        client.get(`/api/events?pipeline_id=${id}&limit=20`)
          .then(r => setEvents(r.data.events || []))
          .catch(() => {});
      }, 1000);
    } catch {
      toastError('Failed to send test event.');
    } finally {
      setTestSending(false);
    }
  };

  const handleReplay = async (evId) => {
    try {
      await client.post(`/api/events/${evId}/replay`);
      toastSuccess('Replay initiated.');
    } catch {
      toastError('Failed to initiate replay.');
    }
  };

  if (loading) return <AppLayout><div className="empty-state">Loading…</div></AppLayout>;
  if (!pipeline) return <AppLayout><div className="empty-state">Pipeline not found.</div></AppLayout>;

  return (
    <AppLayout topbarProps={{
      breadcrumb: <><span style={{ color: 'var(--color-text-tertiary)', cursor: 'pointer' }} onClick={() => navigate('/pipelines')}>Pipelines</span> / {pipeline.name}</>,
      actions: (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" onClick={handleTestEvent} disabled={testSending || pipeline.paused} title={pipeline.paused ? 'Resume pipeline first' : 'Send a test webhook event'}>
            <IconSend size={13} /> {testSending ? 'Sending…' : 'Test'}
          </button>
          <button className="btn btn-sm" onClick={() => setEditing(e => !e)}><IconEdit size={13} /> Edit</button>
          <button className="btn btn-sm btn-danger" onClick={handleTogglePause} disabled={pausing}>
            {pausing ? '…' : pipeline.paused ? 'Resume' : 'Pause'}
          </button>
        </div>
      ),
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
        <div className="page-title" style={{ margin: 0 }}>{pipeline.name}</div>
        {pipeline.provider && <span className="badge badge-gray">{pipeline.provider}</span>}
        {pipeline.paused && <span className="badge badge-warn">Paused</span>}
      </div>

      <div className="metric-grid">
        <div className="metric"><div className="metric-label">Events today</div><div className="metric-val">{events.length}</div></div>
        <div className="metric"><div className="metric-label">Failures</div><div className="metric-val red">{events.filter(e => e.status_code >= 400).length}</div></div>
        <div className="metric"><div className="metric-label">Timeout</div><div className="metric-val">{pipeline.timeout / 1000}s</div></div>
        <div className="metric"><div className="metric-label">Retention</div><div className="metric-val">{pipeline.retention_days}d</div></div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="card" style={{ borderColor: '#185FA5', marginBottom: '1rem' }}>
          <div className="section-title" style={{ marginBottom: '0.75rem' }}>Edit pipeline</div>
          <form onSubmit={handleUpdate}>
            <div className="two-col">
              <div className="form-row">
                <label className="form-label">Name</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="form-row">
                <label className="form-label">Destination URL</label>
                <input className="form-input" type="url" value={form.destination_url} onChange={e => setForm(f => ({ ...f, destination_url: e.target.value }))} required />
              </div>
              <div className="form-row">
                <label className="form-label">Timeout (ms)</label>
                <input className="form-input" type="number" value={form.timeout} onChange={e => setForm(f => ({ ...f, timeout: e.target.value }))} />
              </div>
              <div className="form-row">
                <label className="form-label">Retention (days)</label>
                <input className="form-input" type="number" min={1} max={365} value={form.retention_days} onChange={e => setForm(f => ({ ...f, retention_days: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-primary" type="submit">Save</button>
              <button className="btn btn-sm" type="button" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="two-col">
        <div className="card">
          <div className="section-title" style={{ marginBottom: '0.75rem' }}>Pipeline config</div>
          <div style={{ fontSize: 12 }}>
            {/* Proxy URL with copy button */}
            <div style={{ padding: '5px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Proxy URL (ingest)</div>
              <div className="copy-row">
                <span className="copy-row-text">{proxyUrl}</span>
                <button className="btn btn-sm" style={{ flexShrink: 0, padding: '3px 8px' }} onClick={handleCopyUrl}>
                  {copied ? <IconCheck size={12} stroke={2.5} style={{ color: 'var(--color-green)' }} /> : <IconCopy size={12} />}
                </button>
              </div>
            </div>
            {[
              ['Destination', pipeline.destination_url],
              ['Timeout', `${pipeline.timeout / 1000}s`],
              ['Retention', `${pipeline.retention_days} days`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '0.5px solid var(--color-border-tertiary)', gap: 12 }}>
                <span style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }}>{k}</span>
                <span className="mono" style={{ textAlign: 'right', wordBreak: 'break-all', fontSize: 11 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="section-title" style={{ marginBottom: '0.75rem' }}>Signature verification</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
            HookWatch verifies provider HMAC signatures before forwarding. Your destination receives only authenticated events.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)' }}>
            <span style={{ fontSize: 12 }}>Signature check</span>
            <div className="toggle on"><div className="toggle-knob" /></div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 6 }}>Secret stored encrypted. Never exposed in logs.</div>
        </div>
      </div>

      {/* Recent events */}
      <div className="card">
        <div className="section-head">
          <div className="section-title">Recent events</div>
          <button className="btn btn-sm" onClick={() => navigate('/events')}>View all</button>
        </div>
        {events.length === 0 ? (
          <div className="empty-state">No events yet for this pipeline.</div>
        ) : (
          <table>
            <thead><tr><th>Event ID</th><th>Status</th><th>Latency</th><th>Time</th><th>Actions</th></tr></thead>
            <tbody>
              {events.map(ev => (
                <tr key={ev.id}>
                  <td className="mono" style={{ color: '#185FA5', cursor: 'pointer' }} onClick={() => navigate(`/events/${ev.id}`)}>{ev.id.slice(0, 12)}</td>
                  <td><StatusBadge code={ev.status_code} /></td>
                  <td style={{ color: ev.latency_ms > 2000 ? '#E24B4A' : 'inherit' }}>{ev.latency_ms ? `${ev.latency_ms}ms` : '—'}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{new Date(ev.created_at).toLocaleTimeString()}</td>
                  <td>
                    <button className="btn btn-sm" onClick={() => handleReplay(ev.id)}>
                      <IconPlayerPlay size={12} stroke={1.5} /> Replay
                    </button>
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
