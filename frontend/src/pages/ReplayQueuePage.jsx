import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconPlayerPlay, IconRefresh } from '@tabler/icons-react';
import AppLayout from '../components/Layout/AppLayout';
import client from '../api/client';

function StatusBadge({ code }) {
  if (code === null || code === undefined) return <span className="badge badge-gray">Pending</span>;
  if (code === -1) return <span className="badge badge-danger">Failed</span>;
  if (code >= 200 && code < 300) return <span className="badge badge-success">{code}</span>;
  if (code >= 400 && code < 500) return <span className="badge badge-warn">{code}</span>;
  return <span className="badge badge-danger">{code}</span>;
}

export default function ReplayQueuePage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replayingId, setReplayingId] = useState(null);
  const [replayingAll, setReplayingAll] = useState(false);

  const load = () => {
    setLoading(true);
    client.get('/api/events?limit=100')
      .then(r => setEvents((r.data.events || []).filter(e => e.status_code === -1 || e.status_code === null)))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleReplay = async (id) => {
    setReplayingId(id);
    try { await client.post(`/api/events/${id}/replay`); } catch {}
    setReplayingId(null);
    setTimeout(load, 800);
  };

  const handleReplayAll = async () => {
    setReplayingAll(true);
    for (const ev of events) {
      try { await client.post(`/api/events/${ev.id}/replay`); } catch {}
    }
    setReplayingAll(false);
    setTimeout(load, 800);
  };

  return (
    <AppLayout topbarProps={{
      breadcrumb: 'Replay queue',
      actions: (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" onClick={load}><IconRefresh size={13} /> Refresh</button>
          {events.length > 0 && (
            <button className="btn btn-sm btn-primary" onClick={handleReplayAll} disabled={replayingAll}>
              <IconPlayerPlay size={13} /> {replayingAll ? 'Replaying…' : `Replay all (${events.length})`}
            </button>
          )}
        </div>
      ),
    }}>
      <div className="page-title">Replay queue</div>

      <div className="card">
        <div className="section-head" style={{ marginBottom: '0.75rem' }}>
          <div className="section-title">Failed &amp; pending events</div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
            {events.length} event{events.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <div>No failed or pending events.</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
              Events that fail to forward will appear here for replay.
            </div>
          </div>
        ) : (
          <table>
            <thead>
              <tr><th>Event ID</th><th>Status</th><th>Latency</th><th>Time</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {events.map(ev => (
                <tr key={ev.id}>
                  <td
                    className="mono"
                    style={{ color: '#185FA5', cursor: 'pointer' }}
                    onClick={() => navigate(`/events/${ev.id}`)}
                  >
                    {ev.id.slice(0, 12)}
                  </td>
                  <td><StatusBadge code={ev.status_code} /></td>
                  <td style={{ color: ev.latency_ms > 2000 ? '#E24B4A' : 'inherit' }}>
                    {ev.latency_ms ? `${ev.latency_ms}ms` : '—'}
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>
                    {new Date(ev.created_at).toLocaleString()}
                  </td>
                  <td>
                    <button
                      className="btn btn-sm"
                      onClick={() => handleReplay(ev.id)}
                      disabled={replayingId === ev.id}
                    >
                      <IconPlayerPlay size={12} stroke={1.5} />
                      {replayingId === ev.id ? 'Replaying…' : 'Replay'}
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
