import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IconPlayerPlay, IconCheck } from '@tabler/icons-react';
import AppLayout from '../components/Layout/AppLayout';
import client from '../api/client';
import { toastSuccess, toastError } from '../store/toastStore';
import { SkeletonCard } from '../components/Skeleton';

const TABS = ['Request payload', 'Response body', 'Replay history'];

function StatusBadge({ code }) {
  if (code === null || code === undefined) return <span className="badge badge-gray">Pending</span>;
  if (code === -1) return <span className="badge badge-danger">Failed</span>;
  if (code >= 200 && code < 300) return <span className="badge badge-success">{code}</span>;
  if (code >= 400 && code < 500) return <span className="badge badge-warn">{code}</span>;
  return <span className="badge badge-danger">{code}</span>;
}

export default function EventInspector() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [replaying, setReplaying] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    client.get(`/api/events/${id}`)
      .then(r => setEvent(r.data.event))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const loadHistory = useCallback(() => {
    setHistoryLoading(true);
    client.get(`/api/events/${id}/replay-history`)
      .then(r => setHistory(r.data.attempts || []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [id]);

  useEffect(() => {
    if (activeTab === 2) loadHistory();
  }, [activeTab, loadHistory]);

  const handleReplay = async () => {
    setReplaying(true);
    try {
      await client.post(`/api/events/${id}/replay`);
      toastSuccess('Replay initiated.');
      // Refresh history after a short delay
      setTimeout(loadHistory, 1500);
    } catch {
      toastError('Failed to initiate replay.');
    }
    setReplaying(false);
  };

  if (loading) return <AppLayout><SkeletonCard rows={4} /></AppLayout>;
  if (!event)  return <AppLayout><div className="empty-state">Event not found.</div></AppLayout>;

  const statusBadgeClass = !event.status_code ? 'badge-gray'
    : event.status_code === -1 ? 'badge-danger'
    : event.status_code >= 200 && event.status_code < 300 ? 'badge-success'
    : 'badge-danger';

  return (
    <AppLayout topbarProps={{
      breadcrumb: <>Event <span className="mono">{id.slice(0, 12)}</span></>,
      actions: (
        <button className="btn btn-sm btn-primary" onClick={handleReplay} disabled={replaying}>
          <IconPlayerPlay size={14} stroke={1.5} />
          {replaying ? 'Replaying…' : 'Replay'}
          {history.length > 0 && !replaying && (
            <span style={{ opacity: 0.7, fontSize: 10, marginLeft: 2 }}>({history.length})</span>
          )}
        </button>
      ),
    }}>
      {/* Meta cards */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Status',   value: <span className={`badge ${statusBadgeClass}`}>{event.status_code ?? 'Pending'}</span> },
          { label: 'Pipeline', value: <div style={{ fontSize: 13, fontWeight: 500 }} className="mono">{event.pipeline_id?.slice(0, 12)}</div> },
          { label: 'Latency',  value: <div style={{ fontSize: 13, fontWeight: 500, color: event.latency_ms > 2000 ? '#E24B4A' : 'inherit' }}>{event.latency_ms ? `${event.latency_ms}ms` : '—'}</div> },
          { label: 'Time',     value: <div style={{ fontSize: 13, fontWeight: 500 }}>{new Date(event.created_at).toLocaleString()}</div> },
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
              {`event_id:  ${event.id}\npipeline:  ${event.pipeline_id}\nstatus:    ${event.status_code ?? 'pending'}\nlatency:   ${event.latency_ms ? event.latency_ms + 'ms' : 'n/a'}\ncreated:   ${new Date(event.created_at).toISOString()}\nexpires:   ${new Date(event.expires_at).toISOString()}`}
            </div>
          </div>
        </div>
      )}

      {activeTab === 1 && (
        <div>
          {event.response_status !== null && event.response_status !== undefined ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <StatusBadge code={event.response_status} />
                <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Destination response</span>
              </div>
              <div className="payload-box" style={{ whiteSpace: 'pre-wrap' }}>
                {event.response_body || '(empty response body)'}
              </div>
            </>
          ) : (
            <div className="payload-box" style={{ color: 'var(--color-text-tertiary)' }}>
              No response captured yet. Response is recorded after the first forwarding attempt.
            </div>
          )}
        </div>
      )}

      {activeTab === 2 && (
        historyLoading ? (
          <div className="empty-state">Loading history…</div>
        ) : history.length === 0 ? (
          <div className="empty-state">No replay attempts yet for this event.</div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr><th>#</th><th>Time</th><th>Status</th><th>Latency</th><th>Error</th></tr>
              </thead>
              <tbody>
                {history.map((a, i) => (
                  <tr key={a.id}>
                    <td style={{ color: 'var(--color-text-tertiary)', fontSize: 11 }}>{history.length - i}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{new Date(a.attempted_at).toLocaleString()}</td>
                    <td><StatusBadge code={a.status_code} /></td>
                    <td>{a.latency_ms ? `${a.latency_ms}ms` : '—'}</td>
                    <td style={{ color: 'var(--color-red)', fontSize: 11, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.error_message || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </AppLayout>
  );
}
