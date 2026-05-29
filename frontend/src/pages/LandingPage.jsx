import { useNavigate } from 'react-router-dom';
import { IconAntenna, IconBellRinging, IconPlayerPlay } from '@tabler/icons-react';

const LOGOS = ['Stripe', 'GitHub', 'Shopify', 'Clerk', 'Twilio', 'HubSpot'];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background-primary)' }}>
      {/* Topbar */}
      <header className="topbar">
        <div className="logo"><div className="logo-dot" />HookWatch</div>
        <nav className="topbar-nav">
          <a href="#" className="active">Product</a>
          <a href="/pricing">Pricing</a>
          <a href="#">Docs</a>
          <a href="#">Blog</a>
        </nav>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" onClick={() => navigate('/login')}>Log in</button>
          <button className="btn btn-sm btn-primary" onClick={() => navigate('/signup')}>Start free</button>
        </div>
      </header>

      {/* Hero */}
      <section style={{ padding: '3rem 2rem', textAlign: 'center', background: 'var(--color-background-primary)' }}>
        <div className="badge badge-info" style={{ marginBottom: '1rem' }}>
          Zero-config webhook observability
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 500, lineHeight: 1.3, maxWidth: 480, margin: '0 auto 1rem' }}>
          Stop losing transactions to silent webhook failures
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', maxWidth: 400, margin: '0 auto 1.5rem' }}>
          Route your Stripe, GitHub, or any webhook through HookWatch. See payloads, get Slack alerts on failures, and replay with one click.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: '2rem' }}>
          <button className="btn btn-primary" onClick={() => navigate('/signup')}>Get started free</button>
          <button className="btn">See how it works</button>
        </div>

        {/* Feature cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', maxWidth: 620, margin: '0 auto' }}>
          {[
            { icon: IconAntenna, title: 'Proxy & log', desc: 'All incoming events captured with full payload history' },
            { icon: IconBellRinging, title: 'Instant alerts', desc: 'Slack/Discord/email the second a non-200 is detected' },
            { icon: IconPlayerPlay, title: 'One-click replay', desc: 'Resend any historical payload to your endpoint instantly' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card" style={{ textAlign: 'left' }}>
              <Icon size={18} style={{ color: '#185FA5', marginBottom: 6 }} stroke={1.5} />
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof */}
      <div style={{ padding: '1.5rem 2rem', background: 'var(--color-background-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Trusted by teams using</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', gap: '1.5rem' }}>
          {LOGOS.map(l => <span key={l}>{l}</span>)}
        </div>
      </div>
    </div>
  );
}
