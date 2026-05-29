import AppLayout from '../components/Layout/AppLayout';
import { IconAlertTriangle, IconCheck, IconInfoCircle } from '@tabler/icons-react';

const ALERTS = [
  {
    type: 'danger',
    icon: IconAlertTriangle,
    title: 'shopify-orders returned 500 — 812 failures in 1 hour',
    sub: 'Sent to #alerts-prod and jon@company.com · Today 14:32',
    action: { label: 'View event', onClick: () => {} },
  },
  {
    type: 'danger',
    icon: IconAlertTriangle,
    title: 'clerk-auth latency exceeded 3s threshold',
    sub: 'Sent to #alerts-prod · Today 11:14',
    action: { label: 'View event', onClick: () => {} },
  },
  {
    type: 'success',
    icon: IconCheck,
    title: 'shopify-orders recovered — success rate back to 98%',
    sub: 'Auto-resolved · Yesterday 22:07',
    badge: <span className="badge badge-success">Resolved</span>,
  },
  {
    type: 'info',
    icon: IconInfoCircle,
    title: 'stripe-prod: no events received for 65 minutes',
    sub: 'Inactivity alert · Yesterday 03:12',
    action: { label: 'View pipeline', onClick: () => {} },
  },
];

export default function AlertHistoryPage() {
  return (
    <AppLayout topbarProps={{
      breadcrumb: 'Alert history',
      actions: <button className="btn btn-sm">Mark all read</button>,
    }}>
      <div className="page-title">Alert history</div>

      <div className="card">
        {ALERTS.map((a, i) => (
          <div key={i} className="notif-item">
            <div className={`notif-icon notif-${a.type}`}>
              <a.icon size={14} stroke={1.5} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{a.title}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{a.sub}</div>
            </div>
            {a.badge}
            {a.action && (
              <button className="btn btn-sm" onClick={a.action.onClick}>{a.action.label}</button>
            )}
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
