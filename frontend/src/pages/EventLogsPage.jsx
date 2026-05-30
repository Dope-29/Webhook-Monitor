import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconSearch } from '@tabler/icons-react';
import AppLayout from '../components/Layout/AppLayout';
import client from '../api/client';
import { SkeletonTableBody } from '../components/Skeleton';

function StatusBadge({ code }) {
  if (!code) return <span className="badge badge-gray">Pending</span>;
  if (code === -1) return <span className="badge badge-danger">Failed</span>;
  if (code >= 200 && code < 300) return <span className="badge badge-success">{code}</span>;
  if (code >= 400) return <span className="badge badge-danger">{code}</span>;
  return <span className="badge badge-warn">{code}</span>;
}

export default function EventLogsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    client.get(`/api/events?page=${page}&limit=20`)
      .then(r => { setEvents(r.data.events || []); setPagination(r.data.pagination || {}); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <AppLayout>
      <div className="page-title">Event logs</div>

      <div className="card">
        <div className="section-head">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <IconSearch size={14} stroke={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              {pagination.total ?? 0} total events
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
            Page {pagination.page} of {pagination.totalPages}
          </div>
        </div>

        {loading ? (
          <table>
            <thead><tr><th>Event ID</th><th>Pipeline</th><th>Status</th><th>Latency</th><th>Created</th><th>Expires</th></tr></thead>
            <SkeletonTableBody rows={8} cols={6} />
          </table>
        ) : events.length === 0 ? (
          <div className="empty-state">No events yet. Send a webhook to any pipeline to get started.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Event ID</th><th>Pipeline</th><th>Status</th><th>Latency</th><th>Created</th><th>Expires</th></tr>
            </thead>
            <tbody>
              {events.map(ev => (
                <tr key={ev.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/events/${ev.id}`)}>
                  <td className="mono" style={{ color: '#185FA5' }}>{ev.id.slice(0, 12)}</td>
                  <td className="mono">{ev.pipeline_id?.slice(0, 8)}</td>
                  <td><StatusBadge code={ev.status_code} /></td>
                  <td style={{ color: ev.latency_ms > 2000 ? '#E24B4A' : 'inherit' }}>
                    {ev.latency_ms ? `${ev.latency_ms}ms` : '—'}
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>
                    {new Date(ev.created_at).toLocaleString()}
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>
                    {new Date(ev.expires_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: '1rem' }}>
            <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', color: 'var(--color-text-secondary)' }}>
              {page} / {pagination.totalPages}
            </span>
            <button className="btn btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
