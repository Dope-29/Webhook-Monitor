import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconCheck, IconX, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import SEO from '../components/SEO';

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'For solo developers exploring webhook monitoring.',
    cta: 'Get started free',
    ctaRoute: '/signup',
    featured: false,
    features: [
      '3 pipelines',
      '7-day event retention',
      '10,000 events / month',
      'Event replay',
      'Community support',
    ],
    missing: ['Alert rules', 'Team members', 'API keys', 'Slack notifications', 'Priority support'],
  },
  {
    key: 'starter',
    name: 'Starter',
    price: '$19',
    period: '/month',
    description: 'For teams that need more pipelines and longer history.',
    cta: 'Start with Starter',
    ctaRoute: '/signup',
    featured: true,
    features: [
      '10 pipelines',
      '30-day event retention',
      '100,000 events / month',
      'Event replay',
      'Alert rules',
      'Slack & email notifications',
      'API keys',
      'Email support',
    ],
    missing: ['Team members (multi-user)', 'Priority support'],
  },
  {
    key: 'team',
    name: 'Team',
    price: '$79',
    period: '/month',
    description: 'For teams that need collaboration and maximum capacity.',
    cta: 'Start with Team',
    ctaRoute: '/signup',
    featured: false,
    features: [
      'Unlimited pipelines',
      '90-day event retention',
      '1,000,000 events / month',
      'Event replay',
      'Alert rules',
      'Slack & email notifications',
      'API keys',
      'Team members (multi-user)',
      'Priority support',
    ],
    missing: [],
  },
];

const COMPARISON = [
  { label: 'Pipelines',            free: '3',       starter: '10',     team: 'Unlimited' },
  { label: 'Event retention',      free: '7 days',  starter: '30 days', team: '90 days' },
  { label: 'Events / month',       free: '10k',     starter: '100k',   team: '1M' },
  { label: 'Event replay',         free: true,      starter: true,     team: true },
  { label: 'Alert rules',          free: false,     starter: true,     team: true },
  { label: 'Slack notifications',  free: false,     starter: true,     team: true },
  { label: 'API keys',             free: false,     starter: true,     team: true },
  { label: 'Team members',         free: false,     starter: false,    team: true },
  { label: 'Priority support',     free: false,     starter: false,    team: true },
];

const FAQ = [
  {
    q: 'What counts as an event?',
    a: 'Each HTTP POST request received by any of your pipeline URLs counts as one event. Replays are not counted as new events.',
  },
  {
    q: 'Can I change plans anytime?',
    a: 'Yes. You can upgrade or downgrade at any time from the Billing page inside your dashboard. Upgrades take effect immediately; downgrades at the end of your billing period.',
  },
  {
    q: 'What happens when I hit the event limit?',
    a: 'Events above the limit are still received and forwarded to your destination URL. However, they will not be stored or logged in HookWatch. You\'ll receive an in-app notification when you approach your limit.',
  },
  {
    q: 'Is my webhook data secure?',
    a: 'Yes. All payload data is encrypted at rest using AES-256-GCM envelope encryption before being written to the database. Encryption keys are managed separately from the data.',
  },
  {
    q: 'Do you offer annual billing?',
    a: 'Annual billing with a 2-month discount is on our roadmap. Email support@hookwatch.io to be notified when it\'s available.',
  },
  {
    q: 'Can I use HookWatch with any webhook provider?',
    a: 'Yes. HookWatch works with any service that sends HTTP webhooks — Stripe, GitHub, Shopify, Twilio, HubSpot, and any custom provider.',
  },
];

function Tick({ ok }) {
  if (ok === true)  return <IconCheck size={14} style={{ color: '#2D7D46' }} />;
  if (ok === false) return <IconX     size={14} style={{ color: 'var(--color-text-tertiary)', opacity: 0.4 }} />;
  return <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{ok}</span>;
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        borderBottom: '1px solid var(--color-border)',
        padding: '1rem 0',
        cursor: 'pointer',
      }}
      onClick={() => setOpen(v => !v)}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{q}</span>
        {open ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
      </div>
      {open && (
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 10, lineHeight: 1.65 }}>
          {a}
        </p>
      )}
    </div>
  );
}

export default function PricingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background-primary)' }}>
      <SEO
        title="Pricing"
        description="HookWatch pricing — Free, Starter at $19/mo, and Team at $79/mo. No credit card required to start."
        canonical="/pricing"
      />

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '1px solid var(--color-border)',
        background: 'rgba(250,249,247,0.92)', backdropFilter: 'blur(8px)',
        padding: '0 2.5rem', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link to="/" className="logo" style={{ textDecoration: 'none' }}>
          <div className="logo-dot" />HookWatch
        </Link>
        <nav className="topbar-nav">
          <Link to="/">Product</Link>
          <Link to="/pricing" className="active">Pricing</Link>
        </nav>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" onClick={() => navigate('/login')}>Log in</button>
          <button className="btn btn-sm btn-primary" onClick={() => navigate('/signup')}>Start free</button>
        </div>
      </header>

      <div style={{ padding: '4rem 2rem', maxWidth: 960, margin: '0 auto' }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 10 }}>Simple, transparent pricing</h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
            Start free. Upgrade when you need more. Cancel anytime.
          </p>
        </div>

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '3.5rem' }}>
          {PLANS.map(plan => (
            <div
              key={plan.key}
              style={{
                background: 'var(--color-surface)',
                border: plan.featured ? '2px solid #185FA5' : '1px solid var(--color-border)',
                borderRadius: 'var(--border-radius-lg)',
                padding: '1.5rem',
                position: 'relative',
                boxShadow: plan.featured ? '0 8px 32px rgba(24,95,165,0.12)' : 'var(--shadow-sm)',
              }}
            >
              {plan.featured && (
                <div style={{
                  position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)',
                  background: '#185FA5', color: '#fff',
                  fontSize: 10, fontWeight: 700, padding: '3px 12px',
                  borderRadius: '0 0 8px 8px', letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                }}>
                  MOST POPULAR
                </div>
              )}

              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{plan.name}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
                {plan.description}
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <span style={{ fontSize: 30, fontWeight: 700 }}>{plan.price}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{plan.period}</span>
              </div>

              <button
                className={`btn btn-sm btn-full${plan.featured ? ' btn-primary' : ''}`}
                onClick={() => navigate(plan.ctaRoute)}
                style={{ marginBottom: '1.25rem' }}
              >
                {plan.cta}
              </button>

              <div style={{ fontSize: 12 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                    <IconCheck size={12} style={{ color: '#2D7D46', flexShrink: 0 }} stroke={2.5} />
                    <span style={{ color: 'var(--color-text-secondary)' }}>{f}</span>
                  </div>
                ))}
                {plan.missing.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, opacity: 0.5 }}>
                    <IconX size={12} style={{ flexShrink: 0 }} />
                    <span style={{ color: 'var(--color-text-tertiary)' }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: '1rem', textAlign: 'center' }}>
            Full feature comparison
          </h2>
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--border-radius-lg)',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-background-secondary)' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: '0.05em' }}>FEATURE</th>
                  {PLANS.map(p => (
                    <th key={p.key} style={{ padding: '10px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: p.featured ? '#185FA5' : undefined, width: 120 }}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={row.label} style={{ borderTop: '1px solid var(--color-border)', background: i % 2 === 0 ? 'transparent' : 'var(--color-background-secondary)' }}>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--color-text-secondary)' }}>{row.label}</td>
                    {[row.free, row.starter, row.team].map((val, j) => (
                      <td key={j} style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <Tick ok={val} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div style={{ maxWidth: 640, margin: '0 auto', marginBottom: '4rem' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: '1.25rem', textAlign: 'center' }}>
            Frequently asked questions
          </h2>
          {FAQ.map(item => <FaqItem key={item.q} {...item} />)}
        </div>

        {/* Bottom CTA */}
        <div style={{
          textAlign: 'center',
          padding: '2.5rem',
          background: 'var(--color-background-secondary)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--border-radius-lg)',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Ready to stop losing webhooks?</h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
            Get started in 5 minutes. Free forever with no credit card required.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/signup')} style={{ fontSize: 14, padding: '10px 24px' }}>
            Create free account
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--color-border)',
        padding: '1.25rem 2.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
        fontSize: 11, color: 'var(--color-text-tertiary)',
      }}>
        <span>© {new Date().getFullYear()} HookWatch</span>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link to="/privacy" style={{ color: 'inherit' }}>Privacy</Link>
          <Link to="/terms"   style={{ color: 'inherit' }}>Terms</Link>
          <a href="mailto:support@hookwatch.io" style={{ color: 'inherit' }}>Support</a>
        </div>
      </footer>
    </div>
  );
}
