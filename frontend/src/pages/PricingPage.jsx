import { useNavigate } from 'react-router-dom';

const PLANS = [
  {
    name: 'Hobby', price: '$0', featured: false,
    features: ['3 pipelines', '7-day log retention', 'Email alerts only', '10K events/mo'],
    cta: 'Get started', ctaClass: 'btn btn-sm btn-full',
  },
  {
    name: 'Pro', price: '$49', featured: true,
    features: ['Unlimited pipelines', '30-day log retention', 'Slack + Discord + email', '500K events/mo'],
    cta: 'Start trial', ctaClass: 'btn btn-sm btn-primary btn-full',
  },
  {
    name: 'Agency', price: '$99', featured: false,
    features: ['Multi-workspace', '90-day log retention', 'White-label status page', '5M events/mo'],
    cta: 'Start trial', ctaClass: 'btn btn-sm btn-full',
  },
];

export default function PricingPage() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background-tertiary)' }}>
      <header className="topbar" style={{ background: 'var(--color-background-primary)' }}>
        <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <div className="logo-dot" />HookWatch
        </div>
        <nav className="topbar-nav">
          <a href="/">Product</a>
          <a href="/pricing" className="active">Pricing</a>
          <a href="#">Docs</a>
        </nav>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" onClick={() => navigate('/login')}>Log in</button>
          <button className="btn btn-sm btn-primary" onClick={() => navigate('/signup')}>Start free</button>
        </div>
      </header>

      <div style={{ padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 6 }}>Simple, transparent pricing</h1>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>14-day free trial. No credit card required.</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', maxWidth: 640, margin: '0 auto' }}>
          {PLANS.map((plan) => (
            <div key={plan.name} className={`plan-card${plan.featured ? ' featured' : ''}`}>
              {plan.featured && <div className="badge badge-info" style={{ marginBottom: 6 }}>Most popular</div>}
              <div className="plan-name">{plan.name}</div>
              <div className="plan-price">{plan.price}<span>/mo</span></div>
              {plan.features.map(f => <div key={f} className="plan-feature">{f}</div>)}
              <button className={plan.ctaClass} style={{ marginTop: 12 }}>{plan.cta}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
