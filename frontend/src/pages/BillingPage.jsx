import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IconCheck, IconLoader2 } from '@tabler/icons-react';
import AppLayout from '../components/Layout/AppLayout';
import client from '../api/client';
import { toastSuccess, toastError } from '../store/toastStore';
import { SkeletonCard } from '../components/Skeleton';

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: ['3 pipelines', '7-day event retention', '10k events/month', 'Community support'],
  },
  {
    key: 'starter',
    name: 'Starter',
    price: '$19',
    period: '/month',
    features: ['10 pipelines', '30-day retention', '100k events/month', 'Slack alerts', 'Email support'],
  },
  {
    key: 'team',
    name: 'Team',
    price: '$79',
    period: '/month',
    features: ['Unlimited pipelines', '90-day retention', '1M events/month', 'Multi-user', 'API keys', 'Priority support'],
  },
];

export default function BillingPage() {
  const [searchParams] = useSearchParams();
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(null); // plan key currently being upgraded
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    client.get('/api/billing/status')
      .then(r => setBilling(r.data.billing))
      .catch(() => setBilling({ plan: 'free' }))
      .finally(() => setLoading(false));

    if (searchParams.get('success') === '1') {
      toastSuccess('Upgrade successful! Your plan has been updated.');
    }
    if (searchParams.get('cancelled') === '1') {
      toastError('Checkout was cancelled.');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpgrade = async (planKey) => {
    setUpgrading(planKey);
    try {
      const { data } = await client.post('/api/billing/checkout', { plan: planKey });
      window.location.href = data.url;
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to start checkout.';
      if (err.response?.data?.code === 'STRIPE_NOT_CONFIGURED') {
        toastError('Stripe is not configured yet. Add your STRIPE_SECRET_KEY to go live.');
      } else {
        toastError(msg);
      }
      setUpgrading(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const { data } = await client.post('/api/billing/portal');
      window.location.href = data.url;
    } catch (err) {
      toastError(err.response?.data?.error || 'Failed to open billing portal.');
      setPortalLoading(false);
    }
  };

  const currentPlan = billing?.plan || 'free';

  return (
    <AppLayout topbarProps={{
      breadcrumb: 'Billing',
      actions: billing?.stripe_customer_id ? (
        <button className="btn btn-sm" onClick={handlePortal} disabled={portalLoading}>
          {portalLoading ? <IconLoader2 size={13} className="spinner" /> : null}
          Manage billing
        </button>
      ) : null,
    }}>
      <div className="page-title">Billing</div>

      {/* Current plan banner */}
      {loading ? <SkeletonCard rows={2} /> : (
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
              {PLANS.find(p => p.key === currentPlan)?.name || 'Free'} plan
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              {currentPlan === 'free'
                ? 'Upgrade to unlock more pipelines, longer retention, and team features.'
                : 'Your subscription is active.'}
            </div>
          </div>
          <span className={`badge ${currentPlan === 'free' ? 'badge-gray' : 'badge-success'}`}>
            {currentPlan === 'free' ? 'Free' : 'Active'}
          </span>
        </div>
      )}

      {/* Plan cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {PLANS.map(plan => {
          const isCurrent = plan.key === currentPlan;
          const isDowngrade = PLANS.findIndex(p => p.key === plan.key) < PLANS.findIndex(p => p.key === currentPlan);
          return (
            <div
              key={plan.key}
              className="card"
              style={{
                marginBottom: 0,
                borderColor: isCurrent ? 'var(--color-blue)' : undefined,
                borderWidth: isCurrent ? 2 : undefined,
                position: 'relative',
              }}
            >
              {isCurrent && (
                <div style={{
                  position: 'absolute', top: -1, right: 12,
                  background: 'var(--color-blue)', color: '#fff',
                  fontSize: 10, fontWeight: 700, padding: '2px 8px',
                  borderRadius: '0 0 6px 6px', letterSpacing: '0.05em',
                }}>
                  CURRENT
                </div>
              )}

              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{plan.name}</div>
              <div style={{ marginBottom: '0.75rem' }}>
                <span style={{ fontSize: 24, fontWeight: 700 }}>{plan.price}</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{plan.period}</span>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 5 }}>
                    <IconCheck size={12} stroke={2.5} style={{ color: 'var(--color-blue)', flexShrink: 0 }} />
                    {f}
                  </div>
                ))}
              </div>

              <button
                className={`btn btn-sm btn-full ${!isCurrent && !isDowngrade ? 'btn-primary' : ''}`}
                disabled={isCurrent || isDowngrade || upgrading === plan.key}
                onClick={() => plan.key !== 'free' && handleUpgrade(plan.key)}
              >
                {upgrading === plan.key
                  ? <><IconLoader2 size={12} className="spinner" /> Redirecting…</>
                  : isCurrent ? 'Current plan'
                  : isDowngrade ? 'Downgrade via portal'
                  : `Upgrade to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Payment method / invoice note */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>Payment & invoices</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              {billing?.stripe_customer_id
                ? 'Manage your payment method, download invoices, and cancel your subscription in the billing portal.'
                : 'No payment method on file. Add one when you upgrade.'}
            </div>
          </div>
          {billing?.stripe_customer_id && (
            <button className="btn btn-sm" onClick={handlePortal} disabled={portalLoading}>
              {portalLoading ? <IconLoader2 size={12} className="spinner" /> : null}
              Open portal
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
