import AppLayout from '../components/Layout/AppLayout';
import { IconPlus, IconEdit, IconBrandSlack, IconMail, IconBrandDiscord } from '@tabler/icons-react';

const CHANNELS = [
  { icon: IconBrandSlack, name: '#alerts-prod', sub: 'Connected', on: true, iconColor: '#185FA5' },
  { icon: IconMail, name: 'jon@company.com', sub: 'Email', on: true, iconColor: 'var(--color-text-secondary)' },
  { icon: IconBrandDiscord, name: 'Discord', sub: 'Not connected', on: false, iconColor: 'var(--color-text-tertiary)' },
];

const RULES = [
  { title: 'Any 5xx response', sub: 'All pipelines → Slack + Email — immediate', on: true },
  { title: 'Latency > 3s', sub: 'shopify-orders → Slack — immediate', on: true },
  { title: 'Failure rate > 10% in 5 min', sub: 'All pipelines → Email — 5 min window', on: true },
  { title: 'No events for 1 hour', sub: 'stripe-prod → Slack + Email — inactivity', on: false },
];

export default function AlertRulesPage() {
  return (
    <AppLayout topbarProps={{
      breadcrumb: 'Alert rules',
      actions: <button className="btn btn-sm btn-primary"><IconPlus size={14} /> New rule</button>,
    }}>
      <div className="page-title">Alert rules</div>

      {/* Channels */}
      <div className="card">
        <div className="section-head" style={{ marginBottom: '0.5rem' }}>
          <div className="section-title">Notification channels</div>
          <button className="btn btn-sm"><IconPlus size={12} /> Add channel</button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>Where should alerts be delivered?</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {CHANNELS.map(ch => (
            <div key={ch.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ch.icon size={16} stroke={1.5} style={{ color: ch.iconColor }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{ch.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{ch.sub}</div>
                </div>
              </div>
              {ch.on
                ? <div className="toggle on"><div className="toggle-knob" /></div>
                : <button className="btn btn-sm">Connect</button>}
            </div>
          ))}
        </div>
      </div>

      {/* Active rules */}
      <div className="card">
        <div className="section-head" style={{ marginBottom: 0 }}>
          <div className="section-title">Active rules</div>
        </div>
        {RULES.map(rule => (
          <div key={rule.title} className="alert-rule">
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{rule.title}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{rule.sub}</div>
            </div>
            <div className={`toggle${rule.on ? ' on' : ''}`} style={{ marginRight: 10 }}><div className="toggle-knob" /></div>
            <button className="btn btn-sm"><IconEdit size={12} /></button>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
