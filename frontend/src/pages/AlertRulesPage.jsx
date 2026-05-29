import AppLayout from '../components/Layout/AppLayout';
import { IconPlus, IconBell } from '@tabler/icons-react';

export default function AlertRulesPage() {
  return (
    <AppLayout topbarProps={{
      breadcrumb: 'Alert rules',
      actions: <button className="btn btn-sm btn-primary" disabled><IconPlus size={14} /> New rule</button>,
    }}>
      <div className="page-title">Alert rules</div>

      {/* Notification channels */}
      <div className="card">
        <div className="section-head" style={{ marginBottom: '0.5rem' }}>
          <div className="section-title">Notification channels</div>
          <button className="btn btn-sm" disabled><IconPlus size={12} /> Add channel</button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
          Where should alerts be delivered?
        </div>
        <div className="empty-state" style={{ padding: '1.5rem 0' }}>
          No notification channels configured yet.
        </div>
      </div>

      {/* Active rules */}
      <div className="card">
        <div className="section-head" style={{ marginBottom: 0 }}>
          <div className="section-title">Active rules</div>
        </div>
        <div className="empty-state" style={{ padding: '1.5rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <IconBell size={20} stroke={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
          <div>No alert rules configured yet.</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
            Alert rules will trigger notifications when pipelines fail, slow down, or go silent.
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
