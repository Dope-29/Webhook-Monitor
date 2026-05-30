import { Link, useNavigate } from 'react-router-dom';
import {
  IconAntenna, IconBellRinging, IconPlayerPlay, IconShieldCheck,
  IconArrowRight, IconCheck, IconCode, IconChartBar, IconUsers,
} from '@tabler/icons-react';
import SEO from '../components/SEO';

const INTEGRATIONS = ['Stripe', 'GitHub', 'Shopify', 'Clerk', 'Twilio', 'HubSpot', 'SendGrid', 'Linear'];

const FEATURES = [
  {
    icon: IconAntenna,
    title: 'Intercept & inspect every event',
    desc: 'Every payload that hits your pipeline URL is captured, encrypted, and stored. Full headers and body visible in one click — no more digging through logs.',
  },
  {
    icon: IconBellRinging,
    title: 'Get alerted before customers notice',
    desc: 'Set rules on failure rate, consecutive errors, latency spikes, or silence windows. Alerts fire via Slack or email the moment a condition is met.',
  },
  {
    icon: IconPlayerPlay,
    title: 'Replay any event, any time',
    desc: 'Re-deliver any historical payload to your endpoint in one click. Full attempt history with response codes and latency for each replay.',
  },
  {
    icon: IconShieldCheck,
    title: 'AES-256-GCM encryption at rest',
    desc: 'Every payload stored under envelope encryption — DEK per customer, MEK never in the database. Your data is yours.',
  },
  {
    icon: IconChartBar,
    title: 'Pipeline health at a glance',
    desc: 'Dashboard shows success rate, average latency, and daily event volume for every pipeline. 7-day sparklines with zero configuration.',
  },
  {
    icon: IconUsers,
    title: 'Team collaboration',
    desc: 'Invite teammates to your workspace. Members and Viewers get appropriate access without sharing credentials.',
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Create a pipeline',
    desc: 'Name your pipeline and set a destination URL. HookWatch generates a unique ingestion URL.',
  },
  {
    step: '02',
    title: 'Point your webhook here',
    desc: 'Update your Stripe / GitHub / any provider to send events to your HookWatch pipeline URL.',
  },
  {
    step: '03',
    title: 'HookWatch forwards & records',
    desc: 'Events are logged, forwarded to your destination, and encrypted at rest. Failures trigger retries automatically.',
  },
  {
    step: '04',
    title: 'Set alerts, replay failures',
    desc: 'Configure alert rules for any failure condition. One click to replay any event — your endpoint never misses a beat.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }}>
      <SEO
        title={null}
        description="Monitor, replay, and get instant alerts for all your webhooks. Zero-config webhook observability with real-time event inspection."
        canonical="/"
      />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '1px solid var(--color-border)',
        background: 'rgba(250,249,247,0.92)', backdropFilter: 'blur(8px)',
        padding: '0 2.5rem', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div className="logo"><div className="logo-dot" />HookWatch</div>
        <nav className="topbar-nav">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <Link to="/pricing">Pricing</Link>
        </nav>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" onClick={() => navigate('/login')}>Log in</button>
          <button className="btn btn-sm btn-primary" onClick={() => navigate('/signup')}>
            Get started free <IconArrowRight size={13} />
          </button>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section style={{ padding: '5rem 2rem 4rem', textAlign: 'center', maxWidth: 900, margin: '0 auto' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#EBF2FB', color: '#185FA5',
          fontSize: 11, fontWeight: 600, padding: '4px 12px',
          borderRadius: 99, marginBottom: '1.5rem',
          border: '1px solid rgba(24,95,165,0.15)',
          letterSpacing: '0.04em',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#185FA5' }} />
          WEBHOOK OBSERVABILITY PLATFORM
        </div>

        <h1 style={{
          fontSize: 'clamp(28px, 5vw, 48px)',
          fontWeight: 700,
          lineHeight: 1.18,
          marginBottom: '1.25rem',
          letterSpacing: '-0.025em',
          maxWidth: 680,
          margin: '0 auto 1.25rem',
        }}>
          Stop losing transactions to<br />
          <span style={{ color: '#185FA5' }}>silent webhook failures</span>
        </h1>

        <p style={{
          fontSize: 15, color: 'var(--color-text-secondary)',
          maxWidth: 520, margin: '0 auto 2rem', lineHeight: 1.7,
        }}>
          Route your Stripe, GitHub, or any webhook through HookWatch. See payloads,
          get alerted on failures, and replay with one click — all encrypted at rest.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3rem' }}>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/signup')}
            style={{ padding: '10px 20px', fontSize: 14 }}
          >
            Start free — no credit card
          </button>
          <Link
            to="/pricing"
            className="btn"
            style={{ padding: '10px 20px', fontSize: 14 }}
          >
            See pricing
          </Link>
        </div>

        {/* Terminal mock */}
        <div style={{
          maxWidth: 600, margin: '0 auto',
          background: '#1A1916', borderRadius: 12,
          border: '1px solid #2D2C29',
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          overflow: 'hidden',
          textAlign: 'left',
        }}>
          <div style={{ background: '#242321', padding: '10px 14px', display: 'flex', gap: 6, alignItems: 'center' }}>
            {['#FF5F57','#FFBD2E','#28C840'].map(c => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
            ))}
            <span style={{ fontSize: 11, color: '#6B6A66', marginLeft: 8 }}>Pipeline: stripe-payments</span>
          </div>
          <div style={{ padding: '16px 20px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, lineHeight: 1.8 }}>
            <div><span style={{ color: '#5C9E6B' }}>✓</span> <span style={{ color: '#888' }}>2026-05-30 09:14:02</span> <span style={{ color: '#A8E6CF' }}>POST</span> <span style={{ color: '#CCC' }}>/webhook/abc123</span> <span style={{ color: '#5C9E6B' }}>200</span> <span style={{ color: '#888' }}>142ms</span></div>
            <div><span style={{ color: '#5C9E6B' }}>✓</span> <span style={{ color: '#888' }}>2026-05-30 09:14:18</span> <span style={{ color: '#A8E6CF' }}>POST</span> <span style={{ color: '#CCC' }}>/webhook/abc123</span> <span style={{ color: '#5C9E6B' }}>200</span> <span style={{ color: '#888' }}>98ms</span></div>
            <div><span style={{ color: '#E07070' }}>✗</span> <span style={{ color: '#888' }}>2026-05-30 09:15:01</span> <span style={{ color: '#A8E6CF' }}>POST</span> <span style={{ color: '#CCC' }}>/webhook/abc123</span> <span style={{ color: '#E07070' }}>503</span> <span style={{ color: '#888' }}>8201ms</span></div>
            <div style={{ color: '#C09A40', marginTop: 4 }}>⚠ Alert fired → #slack-alerts: failure rate 100% over 5 min</div>
            <div style={{ color: '#888', marginTop: 4 }}>▶ Replaying event 3c2a1b... → 200 OK (restored)</div>
          </div>
        </div>
      </section>

      {/* ── Integrations strip ─────────────────────────────────────────────── */}
      <div style={{
        padding: '1.25rem 2rem',
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-background-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '1.75rem', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 600, letterSpacing: '0.05em' }}>
          WORKS WITH
        </span>
        {INTEGRATIONS.map(name => (
          <span key={name} style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            {name}
          </span>
        ))}
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>+ any HTTP webhook</span>
      </div>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: '5rem 2rem', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Everything you need for webhook reliability</h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Built for engineers who need deep visibility into webhook delivery without added infrastructure.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{
              padding: '1.25rem',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--border-radius-lg)',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: '#EBF2FB', display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '0.75rem',
              }}>
                <Icon size={18} style={{ color: '#185FA5' }} stroke={1.5} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.65 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{
        padding: '5rem 2rem',
        background: 'var(--color-background-secondary)',
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Up and running in 5 minutes</h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              No SDK, no infrastructure changes. Just update one URL.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.5rem' }}>
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: '#185FA5', color: '#fff',
                  fontSize: 13, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 0.75rem',
                }}>
                  {step}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing teaser ─────────────────────────────────────────────────── */}
      <section style={{ padding: '5rem 2rem', textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Start free, scale when you need to</h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
          Free plan includes 3 pipelines and 10k events per month — more than enough to get started.
          Upgrade for higher limits, longer retention, and team features.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
          {[
            { label: '3 pipelines free', ok: true },
            { label: '10k events/month', ok: true },
            { label: '7-day retention', ok: true },
            { label: 'No credit card', ok: true },
          ].map(({ label }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 12, color: 'var(--color-text-secondary)',
              background: 'var(--color-background-secondary)',
              padding: '5px 12px', borderRadius: 99, border: '1px solid var(--color-border)',
            }}>
              <IconCheck size={12} style={{ color: '#2D7D46' }} />
              {label}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={() => navigate('/signup')} style={{ fontSize: 14, padding: '10px 22px' }}>
            Create free account
          </button>
          <Link to="/pricing" className="btn" style={{ fontSize: 14, padding: '10px 22px' }}>
            View all plans
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        padding: '2rem 2.5rem',
      }}>
        <div style={{
          maxWidth: 900, margin: '0 auto',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '1.5rem',
        }}>
          <div>
            <div className="logo" style={{ marginBottom: 8 }}><div className="logo-dot" />HookWatch</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', maxWidth: 220, lineHeight: 1.6 }}>
              Webhook observability for engineering teams. Monitor, replay, and alert.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', marginBottom: 10, letterSpacing: '0.05em' }}>
                PRODUCT
              </div>
              {[['Features', '#features'], ['Pricing', '/pricing'], ['Dashboard', '/dashboard']].map(([label, href]) => (
                <div key={label} style={{ marginBottom: 6 }}>
                  <a href={href} style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</a>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', marginBottom: 10, letterSpacing: '0.05em' }}>
                LEGAL
              </div>
              {[['Privacy', '/privacy'], ['Terms', '/terms']].map(([label, href]) => (
                <div key={label} style={{ marginBottom: 6 }}>
                  <Link to={href} style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</Link>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', marginBottom: 10, letterSpacing: '0.05em' }}>
                COMPANY
              </div>
              <div style={{ marginBottom: 6 }}>
                <a href="mailto:support@hookwatch.io" style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Support</a>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          maxWidth: 900, margin: '1.5rem auto 0',
          paddingTop: '1rem', borderTop: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
          fontSize: 11, color: 'var(--color-text-tertiary)',
        }}>
          <span>© {new Date().getFullYear()} HookWatch. All rights reserved.</span>
          <span>Made for developers who care about reliability.</span>
        </div>
      </footer>
    </div>
  );
}
