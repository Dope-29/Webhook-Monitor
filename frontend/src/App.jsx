import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';

// ── Code-split all page-level components ────────────────────────────────────
const LandingPage        = lazy(() => import('./pages/LandingPage'));
const PricingPage        = lazy(() => import('./pages/PricingPage'));
const AuthPage           = lazy(() => import('./pages/AuthPage'));
const OAuthCallbackPage  = lazy(() => import('./pages/OAuthCallbackPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage  = lazy(() => import('./pages/ResetPasswordPage'));
const OnboardingPage     = lazy(() => import('./pages/OnboardingPage'));
const DashboardOverview  = lazy(() => import('./pages/DashboardOverview'));
const PipelinesPage      = lazy(() => import('./pages/PipelinesPage'));
const PipelineDetail     = lazy(() => import('./pages/PipelineDetail'));
const EventLogsPage      = lazy(() => import('./pages/EventLogsPage'));
const EventInspector     = lazy(() => import('./pages/EventInspector'));
const AlertRulesPage     = lazy(() => import('./pages/AlertRulesPage'));
const AlertHistoryPage   = lazy(() => import('./pages/AlertHistoryPage'));
const SettingsPage       = lazy(() => import('./pages/SettingsPage'));
const ReplayQueuePage    = lazy(() => import('./pages/ReplayQueuePage'));
const TeamPage           = lazy(() => import('./pages/TeamPage'));
const ApiKeysPage        = lazy(() => import('./pages/ApiKeysPage'));
const BillingPage        = lazy(() => import('./pages/BillingPage'));
const TeamAcceptPage     = lazy(() => import('./pages/TeamAcceptPage'));
const PrivacyPage        = lazy(() => import('./pages/PrivacyPage'));
const TermsPage          = lazy(() => import('./pages/TermsPage'));
const NotFoundPage       = lazy(() => import('./pages/NotFoundPage'));

// ── Minimal full-page loader shown during chunk fetch ────────────────────────
function PageLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-background-primary)' }}>
      <div className="logo"><div className="logo-dot" />HookWatch</div>
    </div>
  );
}

/** Wraps routes that require authentication */
function Protected({ children }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

/** Redirect already-authed users away from login/signup */
function GuestOnly({ children }) {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/"        element={<LandingPage />} />
          <Route path="/pricing" element={<PricingPage />} />

          {/* Auth routes (guest only) */}
          <Route path="/login"  element={<GuestOnly><AuthPage mode="login" /></GuestOnly>} />
          <Route path="/signup" element={<GuestOnly><AuthPage mode="signup" /></GuestOnly>} />

          {/* Team invite accept (public) */}
          <Route path="/team/accept" element={<TeamAcceptPage />} />

          {/* OAuth + password reset (public) */}
          <Route path="/oauth-callback"   element={<OAuthCallbackPage />} />
          <Route path="/forgot-password"  element={<GuestOnly><ForgotPasswordPage /></GuestOnly>} />
          <Route path="/reset-password"   element={<ResetPasswordPage />} />

          {/* Onboarding */}
          <Route path="/onboarding" element={<Protected><OnboardingPage /></Protected>} />

          {/* App routes */}
          <Route path="/dashboard"       element={<Protected><DashboardOverview /></Protected>} />
          <Route path="/pipelines"       element={<Protected><PipelinesPage /></Protected>} />
          <Route path="/pipelines/:id"   element={<Protected><PipelineDetail /></Protected>} />
          <Route path="/events"          element={<Protected><EventLogsPage /></Protected>} />
          <Route path="/events/:id"      element={<Protected><EventInspector /></Protected>} />
          <Route path="/alerts"          element={<Protected><AlertRulesPage /></Protected>} />
          <Route path="/alerts/history"  element={<Protected><AlertHistoryPage /></Protected>} />
          <Route path="/settings"        element={<Protected><SettingsPage /></Protected>} />
          <Route path="/replay"          element={<Protected><ReplayQueuePage /></Protected>} />
          <Route path="/team"            element={<Protected><TeamPage /></Protected>} />
          <Route path="/api-keys"        element={<Protected><ApiKeysPage /></Protected>} />
          <Route path="/billing"         element={<Protected><BillingPage /></Protected>} />

          {/* Legal pages */}
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms"   element={<TermsPage />} />

          {/* Catch-all */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
