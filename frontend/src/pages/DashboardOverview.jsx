import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconPlus, IconChevronRight, IconRefresh } from '@tabler/icons-react';
import AppLayout from '../components/Layout/AppLayout';
import client from '../api/client';
import { SkeletonMetricGrid, SkeletonTableBody } from '../components/Skeleton';

const POLL_MS = 30_000;

function StatusDot({ failCount, eventCount }) {
  if (eventCount === 0)  return <><span className="status-dot dot-gray" />No data</>;
  if (failCount === 0)   return <><span className="status-dot dot-green" />Healthy</>;
  const rate = ((eventCount - failCount) / eventCount) * 100;
  if (rate >= 80) return <><span className="status-dot dot-amber" style={{ color: '#BA7517' }} />Degraded</>;
  return <><span className="status-dot dot-red" /><span style={{ color: '#A32D2D' }}>Failing</span></>;
}

/** Mini 7-bar sparkline using daily_counts from /api/dashboard/stats */
function Sparkline({ dailyCounts }) {
  if (!dailyCounts?.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 24 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, background: 'var(--color-background-tertiary)', borderRadius: 2 }} />
        ))}
      </div>
    );
  }

  // Fill missing days so we always show 7 bars
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const countMap = Object.fromEntries(dailyCounts.map(r => [r.day.slice(0, 10), Number(r.count)]));
  const counts = days.map(d => countMap[d] || 0);
  const max = Math.max(...counts, 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 24 }}>
      {counts.map((c, i) => (
        <div
          key={i}
          title={`${days[i]}: ${c} events`}
          style={{
            flex: 1,
            height: `${Math.max(Math.round((c / max) * 100), c > 0 ? 12 : 4)}%`,
            background: c > 0 ? 'var(--color-blue)' : 'var(--color-background-tertiary)',
            borderRadius: 2,
            opacity: c > 0 ? 0.8 : 0.4,
            minHeight: 4,
          }}
        />
      ))}
    </div>
  );
}

export default function DashboardOverview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef(null);

  const fetchStats = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const { data } = await client.get('/api/dashboard/stats');
      setStats(data);
      setLastUpdated(new Date());
    } catch {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(false);
    timerRef.current = setInterval(() => fetchStats(true), POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [fetchStats]);

  const health = stats?.pipeline_health || [];
  const daily  = stats?.daily_counts   || [];

  return (
    <AppLayout topbarProps={{
      actions: (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {lastUpdated && (
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button className="btn btn-sm" onClick={() => fetchStats(false)} disabled={refreshing}>
            <IconRefresh size={13} className={refreshing ? 'spinner' : ''} />
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => navigate('/pipelines')}>
            <IconPlus size={14} /> New pipeline
          </button>
        </div>
      ),
    }}>
      <div className="page-title">Overview</div>

      {/* Metrics */}
      {loading ? <SkeletonMetricGrid count={4} /> : (
        <div className="metric-grid">
          <div className="metric">
            <div className="metric-label">Events today</div>
            <div className="metric-val">{stats.total_events_today.toLocaleString()}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Failures today</div>
            <div className={`metric-val ${stats.failed_today > 0 ? 'red' : ''}`}>
              {stats.failed_today}
            </div>
          </div>
          <div className="metric">
            <div className="metric-label">Success rate (7d)</div>
            <div className={`metric-val ${
              stats.success_rate_7d >= 95 ? 'green' :
              stats.success_rate_7d >= 80 ? 'amber' : 'red'
            }`}>
              {stats.success_rate_7d}%
            </div>
          </div>
          <div className="metric">
            <div className="metric-label">Avg latency (7d)</div>
            <div className={`metric-val ${
              stats.avg_latency_7d > 2000 ? 'red' :
              stats.avg_latency_7d > 500  ? 'amber' : ''
            }`}>
              {stats.avg_latency_7d ? `${stats.avg_latency_7d}ms` : '—'}
            </div>
          </div>
        </div>
      )}

      {/* Pipeline health */}
      <div className="card">
        <div className="section-head">
          <div className="section-title">Pipeline health</div>
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
            {health.length} pipeline{health.length !== 1 ? 's' : ''}
          </span>
        </div>
        {loading ? (
          <table>
            <thead><tr><th>Pipeline</th><th>Status</th><th>Events (24h)</th><th>Failures</th><th>Last status</th><th>7-day trend</th><th /></tr></thead>
            <SkeletonTableBody rows={3} cols={7} />
          </table>
        ) : health.length === 0 ? (
          <div className="empty-state">
            No pipelines yet.{' '}
            <span style={{ color: 'var(--color-blue)', cursor: 'pointer' }} onClick={() => navigate('/pipelines')}>
              Create your first pipeline →
            </span>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Pipeline</th>
                <th>Status</th>
                <th>Events (24h)</th>
                <th>Failures</th>
                <th>Last status</th>
                <th>7d trend</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {health.map(p => (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/pipelines/${p.id}`)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="mono" style={{ fontWeight: 500 }}>{p.name}</span>
                      {p.paused && <span className="badge badge-warn" style={{ fontSize: 10 }}>Paused</span>}
                    </div>
                  </td>
                  <td>
                    <StatusDot failCount={Number(p.failure_count_24h)} eventCount={Number(p.event_count_24h)} />
                  </td>
                  <td>{Number(p.event_count_24h).toLocaleString()}</td>
                  <td style={{ color: Number(p.failure_count_24h) > 0 ? 'var(--color-red)' : 'inherit' }}>
                    {Number(p.failure_count_24h)}
                  </td>
                  <td>
                    {p.last_status_code ? (
                      <span className={`badge ${
                        p.last_status_code >= 200 && p.last_status_code < 300 ? 'badge-success' :
                        p.last_status_code === -1 ? 'badge-danger' : 'badge-danger'
                      }`}>{p.last_status_code === -1 ? 'Failed' : p.last_status_code}</span>
                    ) : <span className="badge badge-gray">—</span>}
                  </td>
                  <td style={{ minWidth: 60 }}>
                    <Sparkline dailyCounts={daily} />
                  </td>
                  <td>
                    <IconChevronRight size={14} stroke={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Bottom row */}
      <div className="two-col">
        {/* 7-day event volume chart */}
        <div className="card">
          <div className="section-head">
            <div className="section-title">Event volume (7 days)</div>
          </div>
          {loading ? (
            <div className="empty-state">Loading…</div>
          ) : daily.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              No events yet. Send a webhook to a pipeline to see activity here.
            </div>
          ) : (
            <>
              {/* Bar chart */}
              {(() => {
                const today = new Date();
                const days = Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(today);
                  d.setDate(today.getDate() - (6 - i));
                  return d.toISOString().slice(0, 10);
                });
                const countMap = Object.fromEntries(daily.map(r => [r.day.slice(0, 10), Number(r.count)]));
                const counts = days.map(d => countMap[d] || 0);
                const max = Math.max(...counts, 1);
                return (
                  <div>
                    <div className="timeline" style={{ height: 64, marginBottom: 6 }}>
                      {counts.map((c, i) => (
                        <div
                          key={i}
                          className="timeline-bar bar-ok"
                          style={{ height: `${Math.max(Math.round((c / max) * 100), c > 0 ? 8 : 2)}%`, opacity: c > 0 ? 1 : 0.2 }}
                          title={`${days[i]}: ${c} events`}
                        />
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                      {days.map(d => (
                        <span key={d}>{new Date(d + 'T00:00:00').toLocaleDateString([], { weekday: 'short' })}</span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>

        {/* Quick actions */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: '0.75rem' }}>Quick actions</div>
          {[
            { label: 'View all events',       sub: 'Browse and inspect webhook events',   action: () => navigate('/events') },
            { label: 'Replay failed events',   sub: 'Retry failed webhook deliveries',     action: () => navigate('/replay') },
            { label: 'Configure alert rules',  sub: 'Get notified when something breaks',  action: () => navigate('/alerts') },
            { label: 'Manage pipelines',       sub: 'Add, edit or pause webhook pipelines', action: () => navigate('/pipelines') },
          ].map(({ label, sub, action }) => (
            <div
              key={label}
              onClick={action}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 0', borderBottom: '1px solid var(--color-border-tertiary)',
                cursor: 'pointer',
              }}
              className="hover-row"
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{sub}</div>
              </div>
              <IconChevronRight size={14} stroke={1.5} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
