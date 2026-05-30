import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background-primary)' }}>
      <SEO
        title="Terms of Service"
        description="HookWatch terms of service — the rules for using our platform."
        canonical="/terms"
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
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
          Last updated: January 1, 2025
        </p>

        <ProseSection title="1. Acceptance">
          By accessing or using HookWatch ("Service"), you agree to be bound by these Terms.
          If you do not agree, do not use the Service.
        </ProseSection>

        <ProseSection title="2. Description of Service">
          HookWatch provides webhook monitoring, event storage, replay, and alerting capabilities.
          We offer Free, Starter, and Team subscription plans with different feature limits.
        </ProseSection>

        <ProseSection title="3. Accounts">
          You are responsible for maintaining the security of your account credentials.
          You must notify us immediately of any unauthorized access. We reserve the right to
          terminate accounts that violate these Terms.
        </ProseSection>

        <ProseSection title="4. Acceptable Use">
          You may not use HookWatch to:
          <ul>
            <li>Store or transmit unlawful, harmful, or offensive content.</li>
            <li>Attempt to gain unauthorized access to other users' data.</li>
            <li>Abuse the Service in ways that degrade performance for other users.</li>
            <li>Resell or sublicense the Service without prior written consent.</li>
          </ul>
        </ProseSection>

        <ProseSection title="5. Data and Privacy">
          Your use of the Service is governed by our <Link to="/privacy" style={{ color: 'var(--color-blue)' }}>Privacy Policy</Link>.
          Webhook payloads you send through HookWatch are yours. We process them only to deliver
          the Service. We encrypt all payload data at rest.
        </ProseSection>

        <ProseSection title="6. Payment and Subscriptions">
          Paid plans are billed monthly through Stripe. Subscriptions renew automatically unless cancelled.
          You may cancel at any time from the Billing page. No refunds are provided for partial billing periods.
        </ProseSection>

        <ProseSection title="7. Service Availability">
          We aim for high availability but provide no uptime guarantee under the Free plan.
          Paid plans include commercially reasonable effort to maintain availability.
          We are not liable for data loss caused by service interruptions.
        </ProseSection>

        <ProseSection title="8. Limitation of Liability">
          HookWatch is provided "as is" without warranty of any kind. Our liability is limited to
          the amount you paid for the Service in the 12 months preceding the claim.
        </ProseSection>

        <ProseSection title="9. Modifications">
          We may update these Terms at any time. We will notify registered users of material changes
          via email. Continued use after changes constitutes acceptance.
        </ProseSection>

        <ProseSection title="10. Contact">
          Questions? Email <a href="mailto:legal@hookwatch.io">legal@hookwatch.io</a>.
        </ProseSection>
      </main>

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
