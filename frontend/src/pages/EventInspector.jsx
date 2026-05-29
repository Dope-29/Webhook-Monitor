import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IconPlayerPlay } from '@tabler/icons-react';
import AppLayout from '../components/Layout/AppLayout';
import client from '../api/client';

const TABS = ['Request payload', 'Response body', 'Headers', 'Replay history'];

export default function EventInspector() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [replaying, setReplaying] = useState(false);

  useEffect(() => {
    client.get(`/api/events/${id}`)
      .then(r => setEvent(r.data.event))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleReplay = async () => {
    setReplaying(true);
    try { await client.post(`/api/events/${id}/replay`); } catch {}
    setReplaying(false);
  };

  const statusBadgeClass = !event?.status_code ? 'badge-gray'
    : event.status_code >= 200 && event.status_code < 300 ? 'badge-success'
    : 'badge-danger';

  if (loading) return <AppLayout><div className="empty-state">Loading event…</div></AppLayout>;
  if (!event) return <AppLayout><div className="empty-state">Event not found.</div></AppLayout>;

  return (
    <AppLayout topbarProps={{
      breadcrumb: <>Event <span className="mono">{id.slice(0, 12)}</span></>,
      actions: (
        <button className="btn btn-sm btn-primary" onClick={handleReplay} disabled={replaying}>
          <IconPlayerPlay size={14} stroke={1.5} />
          {replaying ? 'Replaying…' : 'Replay this event'}
        </button>
      ),
    }}>
      {/* Meta cards */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Status', value: <span className={`badge ${statusBadgeClass}`}>{event.status_code ?? 'Pending'}</span> },
          { label: 'Pipeline', value: <div style={{ fontSize: 13, fontWeight: 500 }} className="mono">{event.pipeline_id?.slice(0, 12)}</div> },
          { label: 'Latency', value: <div style={{ fontSize: 13, fontWeight: 500, color: event.latency_ms > 2000 ? '#E24B4A' : 'inherit' }}>{event.latency_ms ? `${event.latency_ms}ms` : '—'}</div> },
          { label: 'Time', value: <div style={{ fontSize: 13, fontWeight: 500 }}>{new Date(event.created_at).toLocaleString()}</div> },
        ].map(({ label, value }) => (
          <div key={label} className="card" style={{ flex: 1, minWidth: 140, marginBottom: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{label}</div>
            <div style={{ marginTop: 4 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {TABS.map((t, i) => (
          <div key={t} className={`tab${activeTab === i ? ' active' : ''}`} onClick={() => setActiveTab(i)}>{t}</div>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 0 && (
        <div className="two-col">
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Incoming payload (decrypted)</div>
            <div className="payload-box">
              {typeof event.payload === 'object'
                ? JSON.stringify(event.payload, null, 2)
                : event.payload || '(empty payload)'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Event metadata</div>
            <div className="payload-box">
              {`event_id: ${event.id}\npipeline: ${event.pipeline_id}\nstatus: ${event.status_code ?? 'pending'}\nlatency: ${event.latency_ms ? event.latency_ms + 'ms' : 'n/a'}\ncreated: ${new Date(event.created_at).toISOString()}\nexpires: ${new Date(event.expires_at).toISOString()}`}
            </div>
          </div>
        </div>
      )}
      {activeTab === 1 && (
        <div className="payload-box">Response body not yet captured — forward your webhook to a destination to see the response.</div>
      )}
      {activeTab === 2 && (
        <div className="payload-box">Headers are not stored to protect sensitive data per security policy.</div>
      )}
      {activeTab === 3 && (
        <div className="empty-state">No replay history for this event yet.</div>
      )}
    </AppLayout>
  );
}
