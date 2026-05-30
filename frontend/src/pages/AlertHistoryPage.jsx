import { useState, useEffect } from 'react';
import { IconBell, IconCheck, IconLoader2 } from '@tabler/icons-react';
import AppLayout from '../components/Layout/AppLayout';
import client from '../api/client';
import { toastSuccess, toastError } from '../store/toastStore';
import { SkeletonTableBody } from '../components/Skeleton';

const TYPE_LABELS = {
  failure_rate: 'Failure rate',
  consecutive_failures: 'Consecutive failures',
  no_events: 'Silence',
  latency: 'High latency',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AlertHistoryPage() {
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [acking,  setAcking]    = useState(null); // id being acked
  const [ackingAll, setAckingAll] = useState(false);

  const load = () =>
    client.get('/api/alerts/history?limit=100')
      .then(r => setHistory(r.data.history || []))
      .catch(() => toastError('Failed to load alert history.'))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleAcknowledge = async (id) => {
    setAcking(id);
    try {
      await client.post(`/api/alerts/history/${id}/acknowledge`);
      setHistory(prev => prev.map(h => h.id === id ? { ...h, acknowledged: true } : h));
    } catch {
      toastError('Failed to acknowledge alert.');
    } finally {
      setAcking(null);
    }
  };

  const handleAcknowledgeAll = async () => {
    setAckingAll(true);
    try {
      await client.post('/api/alerts/history/acknowledge-all');
      setHistory(prev => prev.map(h => ({ ...h, acknowledged: true })));
      toastSuccess('All alerts acknowledged.');
    } catch {
      toastError('Failed to acknowledge all alerts.');
    } finally {
      setAckingAll(false);
    }
  };

  const unread = history.filter(h => !h.acknowledged).length;

  return (
    <AppLayout topbarProps={{
      breadcrumb: 'Alert history',
      actions: unread > 0 ? (
        <button className="btn btn-sm" onClick={handleAcknowledgeAll} disabled={ackingAll}>
          {ackingAll ? <IconLoader2 size={12} className="spinner" /> : <IconCheck size={13} />}
          Mark all read
        </button>
      ) : null,
    }}>
      <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        Alert history
        {unread > 0 && (
          <span className="badge badge-error" style={{ fontSize: 10 }}>{unread} unread</span>
        )}
      </div>

      <div className="card">
        {loading ? (
          <table className="table">
            <thead><tr><th>Time</th><th>Pipeline</th><th>Type</th><th>Message</th><th></th></tr></thead>
            <SkeletonTableBody cols={5} rows={5} />
          </table>
        ) : history.length === 0 ? (
          <div className="empty-state" style={{ padding: '2.5rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <IconBell size={22} stroke={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
            <div>No alerts triggered yet.</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
              Alert notifications will appear here when rules fire.
            </div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Pipeline</th>
                <th>Type</th>
                <th>Message</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id} style={{ opacity: h.acknowledged ? 0.55 : 1 }}>
                  <td style={{ fontSize: 11, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                    {timeAgo(h.fired_at)}
                  </td>
                  <td style={{ fontSize: 12, fontWeight: 500 }}>
                    {h.pipeline_name || '—'}
                  </td>
                  <td>
                    <span className="badge badge-error" style={{ fontSize: 10 }}>
                      {TYPE_LABELS[h.rule_type] || h.rule_type}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--color-text-secondary)', maxWidth: 380 }}>
                    {h.message}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {!h.acknowledged && (
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => handleAcknowledge(h.id)}
                        disabled={acking === h.id}
                        title="Acknowledge"
                      >
                        {acking === h.id
                          ? <IconLoader2 size={11} className="spinner" />
                          : <IconCheck size={11} />}
                      </button>
                    )}
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
