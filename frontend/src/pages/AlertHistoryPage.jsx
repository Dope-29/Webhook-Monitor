import AppLayout from '../components/Layout/AppLayout';
import { IconBell } from '@tabler/icons-react';

export default function AlertHistoryPage() {
  return (
    <AppLayout topbarProps={{
      breadcrumb: 'Alert history',
      actions: <button className="btn btn-sm" disabled>Mark all read</button>,
    }}>
      <div className="page-title">Alert history</div>

      <div className="card">
        <div className="empty-state" style={{ padding: '2rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <IconBell size={20} stroke={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
          <div>No alerts triggered yet.</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
            Alert notifications will appear here when rules fire.
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
