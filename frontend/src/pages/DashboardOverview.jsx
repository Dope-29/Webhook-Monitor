import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconPlus, IconChevronRight } from '@tabler/icons-react';
import AppLayout from '../components/Layout/AppLayout';
import client from '../api/client';

function StatusBadge({ rate }) {
  if (rate === null) return <><span className="status-dot dot-amber" />No data</>;
  if (rate >= 95) return <><span className="status-dot dot-green" />Healthy</>;
  if (rate >= 80) return <><span className="status-dot dot-amber" style={{ color: '#BA7517' }} />Degraded</>;
  return <><span className="status-dot dot-red" /><span style={{ color: '#A32D2D' }}>Failing</span></>;
}

export default function DashboardOverview() {
  const navigate = useNavigate();
  const [pipelines, setPipelines] = useState([]);
  const [events, setEvents] = useState([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      client.get('/api/pipelines'),
      // Fetch the 50 most recent events for metrics — enough for a meaningful summary
      client.get('/api/events?limit=50'),
    ])
      .then(([p, e]) => {
        setPipelines(p.data.pipelines || []);
        setEvents(e.data.events || []);
        setTotalEvents(e.data.pagination?.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Derive metrics from real data
  const failures = events.filter(e => e.status_code && e.status_code >= 400).length;
  const withStatus = events.filter(e => e.status_code);
  const successRate = withStatus.length > 0
    ? (((withStatus.length - withStatus.filter(e => e.status_code >= 400).length) / withStatus.length) * 100).toFixed(1)
    : null;
  const withLatency = events.filter(e => e.latency_ms);
  const avgLatency = withLatency.length > 0
    ? Math.round(withLatency.reduce((s, e) => s + e.latency_ms, 0) / withLatency.length)
    : null;

  // Build a 12-bucket activity chart from real event timestamps (last 12 hours)
  const now = Date.now();
  const BUCKETS = 12;
  const BUCKET_MS = 60 * 60 * 1000; // 1 hour each
  const buckets = Array.from({ length: BUCKETS }, (_, i) => {
    const bucketStart = now - (BUCKETS - i) * BUCKET_MS;
    const bucketEnd   = now - (BUCKETS - i - 1) * BUCKET_MS;
    const inBucket = events.filter(e => {
      const t = new Date(e.created_at).getTime();
      return t >= bucketStart && t < bucketEnd;
    });
    const failCount = inBucket.filter(e => e.status_code >= 400).length;
    const okCount   = inBucket.length - failCount;
    return { total: inBucket.length, failCount, okCount };
  });
  const maxBucket = Math.max(...buckets.map(b => b.total), 1);

  // Per-pipeline success rate (from the loaded events sample)
  const pipelineStats = pipelines.reduce((acc, p) => {
    const pEvents = events.filter(e => e.pipeline_id === p.id);
    const pWithStatus = pEvents.filter(e => e.status_code);
    const pFailures = pWithStatus.filter(e => e.status_code >= 400).length;
    acc[p.id] = pWithStatus.length > 0
      ? ((pWithStatus.length - pFailures) / pWithStatus.length) * 100
      : null;
    return acc;
  }, {});

  const recentFailures = events.filter(e => e.status_code >= 400).slice(0, 5);

  return (
    <AppLayout topbarProps={{
      actions: (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm btn-primary" onClick={() => navigate('/pipelines')}>
            <IconPlus size={14} /> New pipeline
          </button>
        </div>
      ),
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div className="page-title" style={{ margin: 0 }}>Overview</div>
      </div>

      {/* Real metrics */}
      <div className="metric-grid">
        <div className="metric">
          <div className="metric-label">Total events (all time)</div>
          <div className="metric-val">{loading ? '…' : totalEvents.toLocaleString()}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Success rate (recent)</div>
          <div className={`metric-val ${successRate === null ? '' : successRate >= 95 ? 'green' : successRate >= 80 ? 'amber' : 'red'}`}>
            {loading ? '…' : successRate !== null ? `${successRate}%` : '—'}
          </div>
        </div>
        <div className="metric">
          <div className="metric-label">Failures (recent)</div>
          <div className={`metric-val ${failures > 0 ? 'red' : ''}`}>
            {loading ? '…' : failures > 0 ? failures : '0'}
          </div>
        </div>
        <div className="metric">
          <div className="metric-label">Avg latency (recent)</div>
          <div className={`metric-val ${avgLatency > 2000 ? 'red' : avgLatency > 500 ? 'amber' : ''}`}>
            {loading ? '…' : avgLatency !== null ? `${avgLatency}ms` : '—'}
          </div>
        </div>
      </div>

      {/* Pipeline health table */}
      <div className="card">
        <div className="section-head">
          <div className="section-title">Pipeline health</div>
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{pipelines.length} pipeline{pipelines.length !== 1 ? 's' : ''}</span>
        </div>
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : pipelines.length === 0 ? (
          <div className="empty-state">
            No pipelines yet.{' '}
            <span style={{ color: '#185FA5', cursor: 'pointer' }} onClick={() => navigate('/pipelines')}>
              Create your first pipeline →
            </span>
          </div>
        ) : (
          <table>
            <thead>
              <tr><th>Pipeline</th><th>Provider</th><th>Status</th><th>Success rate</th><th>Avg latency</th><th /></tr>
            </thead>
            <tbody>
              {pipelines.map(p => {
                const rate = pipelineStats[p.id];
                const pEvents = events.filter(e => e.pipeline_id === p.id);
                const pLatency = pEvents.filter(e => e.latency_ms);
                const pAvg = pLatency.length > 0
                  ? Math.round(pLatency.reduce((s, e) => s + e.latency_ms, 0) / pLatency.length)
                  : null;
                return (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/pipelines/${p.id}`)}>
                    <td className="mono">{p.name}</td>
                    <td>{p.provider ? <span className="badge badge-gray">{p.provider}</span> : <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>}</td>
                    <td><StatusBadge rate={rate} /></td>
                    <td style={{ color: rate === null ? 'var(--color-text-tertiary)' : rate >= 95 ? 'var(--color-green)' : rate >= 80 ? 'var(--color-amber)' : 'var(--color-red)' }}>
                      {rate !== null ? `${rate.toFixed(1)}%` : '—'}
                    </td>
                    <td>{pAvg !== null ? `${pAvg}ms` : '—'}</td>
                    <td><IconChevronRight size={14} stroke={1.5} style={{ color: 'var(--color-text-tertiary)' }} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Bottom row */}
      <div className="two-col">
        {/* Recent failures */}
        <div className="card">
          <div className="section-head">
            <div className="section-title">Recent failures</div>
            <span style={{ fontSize: 11, color: '#185FA5', cursor: 'pointer' }} onClick={() => navigate('/events')}>View all</span>
          </div>
          {loading ? (
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', padding: '0.5rem 0' }}>Loading…</div>
          ) : recentFailures.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', padding: '0.5rem 0' }}>No failures detected ✓</div>
          ) : (
            recentFailures.map(e => (
              <div
                key={e.id}
                style={{ padding: '6px 0', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={() => navigate(`/events/${e.id}`)}
              >
                <span className="mono" style={{ color: '#185FA5' }}>{e.id.slice(0, 12)}</span>
                <span className="badge badge-danger">{e.status_code}</span>
              </div>
            ))
          )}
        </div>

        {/* Real event volume chart — 12 hourly buckets */}
        <div className="card">
          <div className="section-head"><div className="section-title">Event volume (last 12h)</div></div>
          {loading ? (
            <div className="empty-state">Loading…</div>
          ) : totalEvents === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', padding: '0.5rem 0' }}>
              No events yet. Send a webhook to a pipeline to see activity here.
            </div>
          ) : (
            <>
              <div className="timeline">
                {buckets.map((b, i) => (
                  <div
                    key={i}
                    className={`timeline-bar ${b.failCount > 0 ? 'bar-fail' : b.total > 0 ? 'bar-ok' : 'bar-ok'}`}
                    style={{ height: `${Math.round((b.total / maxBucket) * 100)}%`, opacity: b.total === 0 ? 0.15 : 1 }}
                    title={`${b.total} events (${b.failCount} failures)`}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 6 }}>
                <span><span className="status-dot dot-green" />Success</span>
                <span><span className="status-dot dot-red" />Failure</span>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
