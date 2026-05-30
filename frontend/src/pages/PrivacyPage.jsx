import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background-primary)' }}>
      <SEO
        title="Privacy Policy"
        description="HookWatch privacy policy — how we collect, use, and protect your data."
        canonical="/privacy"
      />

      {/* Nav */}
      <header style={{
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        padding: '0 2rem',
        height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link to="/" className="logo" style={{ textDecoration: 'none' }}>
          <div className="logo-dot" />HookWatch
        </Link>
        <Link to="/login" className="btn btn-sm">Sign in</Link>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 2rem' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
          Last updated: January 1, 2025
        </p>

        <ProseSection title="1. Introduction">
          HookWatch ("we", "our", "us") is committed to protecting your privacy. This policy explains
          what information we collect when you use HookWatch, how we use it, and your rights.
        </ProseSection>

        <ProseSection title="2. Information We Collect">
          <ul>
            <li><strong>Account data:</strong> Name, email address, and password (hashed with bcrypt) when you sign up.</li>
            <li><strong>Webhook event data:</strong> Payloads received through your pipeline URLs, stored encrypted using AES-256-GCM.</li>
            <li><strong>Usage data:</strong> Event counts, latency metrics, and delivery status for your pipelines.</li>
            <li><strong>Billing data:</strong> Subscription status managed via Stripe. We never store raw card details.</li>
            <li><strong>OAuth data:</strong> If you sign in via GitHub or Google, we receive your name, email, and profile picture from that provider.</li>
          </ul>
        </ProseSection>

        <ProseSection title="3. How We Use Your Data">
          <ul>
            <li>To provide, operate, and improve the HookWatch service.</li>
            <li>To send transactional emails (password resets, team invitations, alert notifications).</li>
            <li>To process billing through Stripe.</li>
            <li>To detect and prevent fraud or abuse.</li>
          </ul>
          We do not sell your data to third parties. We do not use your webhook payloads for advertising.
        </ProseSection>

        <ProseSection title="4. Data Storage and Security">
          All webhook payloads are encrypted at rest using AES-256-GCM envelope encryption before storage.
          Data is stored in a PostgreSQL database with access controls. TLS is enforced for all data in transit.
          Encryption keys are derived from a master key stored as an environment variable, never in the database.
        </ProseSection>

        <ProseSection title="5. Data Retention">
          Webhook event data is retained for the duration configured on your pipeline (7, 30, or 90 days
          depending on your plan). After expiry, events are automatically deleted. You may also delete all
          events manually from the Settings page.
        </ProseSection>

        <ProseSection title="6. Third-Party Services">
          <ul>
            <li><strong>Stripe:</strong> Payment processing. Subject to <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">Stripe's Privacy Policy</a>.</li>
            <li><strong>Google / GitHub OAuth:</strong> Optional sign-in providers. Subject to their respective privacy policies.</li>
          </ul>
        </ProseSection>

        <ProseSection title="7. Your Rights">
          You may request deletion of your account and all associated data at any time by emailing
          <a href="mailto:privacy@hookwatch.io"> privacy@hookwatch.io</a> or from the Settings page.
          You may also export your pipeline configuration at any time.
        </ProseSection>

        <ProseSection title="8. Cookies">
          HookWatch uses no tracking cookies. We store an authentication token in <code>localStorage</code>
          for session management only.
        </ProseSection>

        <ProseSection title="9. Contact">
          Questions about this policy? Email <a href="mailto:privacy@hookwatch.io">privacy@hookwatch.io</a>.
        </ProseSection>
      </main>

      <LegalFooter />
    </div>
  );
}

function ProseSection({ title, children }) {
  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: '0.5rem' }}>{title}</h2>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  );
}

function LegalFooter() {
  return (
    <footer style={{
      borderTop: '1px solid var(--color-border)',
      padding: '1.25rem 2rem',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
      fontSize: 11, color: 'var(--color-text-tertiary)',
    }}>
      <span>© {new Date().getFullYear()} HookWatch</span>
      <Link to="/privacy" style={{ color: 'inherit' }}>Privacy</Link>
      <Link to="/terms"   style={{ color: 'inherit' }}>Terms</Link>
      <a href="mailto:support@hookwatch.io" style={{ color: 'inherit' }}>Contact</a>
    </footer>
  );
}
