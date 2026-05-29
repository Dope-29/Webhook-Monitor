import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconPlus, IconChevronRight } from '@tabler/icons-react';
import AppLayout from '../components/Layout/AppLayout';
import client from '../api/client';

const BARS = [60,75,55,90,40,35,80,70,95,60,85,75];
const BAR_TYPES = ['ok','ok','ok','ok','fail','fail','ok','ok','ok','warn','ok','ok'];

function StatusBadge({ rate }) {
  if (rate >= 95) return <><span className="status-dot dot-green" />Healthy</>;
  if (rate >= 80) return <><span className="status-dot dot-amber" style={{ color: '#BA7517' }} />Degraded</>;
  return <><span className="status-dot dot-red" /><span style={{ color: '#A32D2D' }}>Failing</span></>;
}

function RateCell({ rate }) {
  const cls = rate >= 95 ? 'green' : rate >= 80 ? 'amber' : 'red';
  return <td style={{ color: `var(--color-${cls})` }}>{rate}%</td>;
}

export default function DashboardOverview() {
  const navigate = useNavigate();
  const [pipelines, setPipelines] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([client.get('/api/pipelines'), client.get('/api/events?limit=5')])
      .then(([p, e]) => { setPipelines(p.data.pipelines || []); setEvents(e.data.events || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalEvents = events.length;
  const failures = events.filter(e => e.status_code && e.status_code >= 400).length;
  const successRate = totalEvents > 0 ? (((totalEvents - failures) / totalEvents) * 100).toFixed(1) : '—';
  const avgLatency = events.length > 0
    ? Math.round(events.filter(e => e.latency_ms).reduce((s, e) => s + e.latency_ms, 0) / events.filter(e => e.latency_ms).length) || '—'
    : '—';

  return (
    <AppLayout topbarProps={{
      actions: (
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="form-input" style={{ width: 'auto', padding: '5px 10px', fontSize: 12, color: 'var(--color-text-secondary)' }}>
            <option>Last 24 hours</option>
            <option>Last 7 days</option>
          </select>
          <button className="btn btn-sm btn-primary" onClick={() => navigate('/pipelines')}>
            <IconPlus size={14} /> New pipeline
          </button>
        </div>
      ),
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div className="page-title" style={{ margin: 0 }}>Overview</div>
      </div>

      {/* Metrics */}
      <div className="metric-grid">
        <div className="metric"><div className="metric-label">Total events</div><div className="metric-val">{loading ? '…' : '14,203'}</div></div>
        <div className="metric"><div className="metric-label">Success rate</div><div className="metric-val green">{loading ? '…' : '98.7%'}</div></div>
        <div className="metric"><div className="metric-label">Failures</div><div className="metric-val red">{loading ? '…' : '183'}</div></div>
        <div className="metric"><div className="metric-label">Avg latency</div><div className="metric-val amber">{loading ? '…' : '142ms'}</div></div>
      </div>

      {/* Pipeline health table */}
      <div className="card">
        <div className="section-head">
          <div className="section-title">Pipeline health</div>
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{pipelines.length} pipelines</span>
        </div>
        {loading ? (
          <div className="empty-state">Loading pipelines…</div>
        ) : pipelines.length === 0 ? (
          <div className="empty-state">
            No pipelines yet.{' '}
            <span style={{ color: '#185FA5', cursor: 'pointer' }} onClick={() => navigate('/onboarding')}>Create your first pipeline →</span>
          </div>
        ) : (
          <table>
            <thead>
              <tr><th>Pipeline</th><th>Provider</th><th>Status</th><th>Success</th><th>Latency</th><th /></tr>
            </thead>
            <tbody>
              {pipelines.map(p => (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/pipelines/${p.id}`)}>
                  <td className="mono">{p.name}</td>
                  <td>{p.provider ? <span className="badge badge-gray">{p.provider}</span> : <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>}</td>
                  <td><StatusBadge rate={95} /></td>
                  <td style={{ color: '#1D9E75' }}>99%</td>
                  <td>—</td>
                  <td><IconChevronRight size={14} stroke={1.5} style={{ color: 'var(--color-text-tertiary)' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Bottom row */}
      <div className="two-col">
        <div className="card">
          <div className="section-head">
            <div className="section-title">Recent failures</div>
            <span style={{ fontSize: 11, color: '#185FA5', cursor: 'pointer' }} onClick={() => navigate('/events')}>View all</span>
          </div>
          {events.filter(e => e.status_code >= 400).length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', padding: '0.5rem 0' }}>No failures detected ✓</div>
          ) : (
            events.filter(e => e.status_code >= 400).slice(0, 3).map(e => (
              <div key={e.id} style={{ padding: '6px 0', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', justifyContent: 'space-between' }}>
                <span className="mono">{e.pipeline_id?.slice(0, 12)}</span>
                <span className="badge badge-danger">{e.status_code}</span>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="section-head"><div className="section-title">Event volume (24h)</div></div>
          <div className="timeline">
            {BARS.map((h, i) => (
              <div key={i} className={`timeline-bar bar-${BAR_TYPES[i]}`} style={{ height: `${h}%` }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--color-text-tertiary)' }}>
            <span><span className="status-dot dot-green" />Success</span>
            <span><span className="status-dot dot-red" />Failure</span>
            <span><span className="status-dot dot-amber" />Timeout</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
