import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';

import LandingPage       from './pages/LandingPage';
import PricingPage       from './pages/PricingPage';
import AuthPage          from './pages/AuthPage';
import OnboardingPage    from './pages/OnboardingPage';
import DashboardOverview from './pages/DashboardOverview';
import PipelinesPage     from './pages/PipelinesPage';
import PipelineDetail    from './pages/PipelineDetail';
import EventLogsPage     from './pages/EventLogsPage';
import EventInspector    from './pages/EventInspector';
import AlertRulesPage    from './pages/AlertRulesPage';
import AlertHistoryPage  from './pages/AlertHistoryPage';
import SettingsPage      from './pages/SettingsPage';

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
      <Routes>
        {/* Public routes */}
        <Route path="/"        element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />

        {/* Auth routes (guest only) */}
        <Route path="/login"  element={<GuestOnly><AuthPage mode="login" /></GuestOnly>} />
        <Route path="/signup" element={<GuestOnly><AuthPage mode="signup" /></GuestOnly>} />

        {/* Onboarding (auth required) */}
        <Route path="/onboarding" element={<Protected><OnboardingPage /></Protected>} />

        {/* App routes (auth required) */}
        <Route path="/dashboard"       element={<Protected><DashboardOverview /></Protected>} />
        <Route path="/pipelines"       element={<Protected><PipelinesPage /></Protected>} />
        <Route path="/pipelines/:id"   element={<Protected><PipelineDetail /></Protected>} />
        <Route path="/events"          element={<Protected><EventLogsPage /></Protected>} />
        <Route path="/events/:id"      element={<Protected><EventInspector /></Protected>} />
        <Route path="/alerts"          element={<Protected><AlertRulesPage /></Protected>} />
        <Route path="/alerts/history"  element={<Protected><AlertHistoryPage /></Protected>} />
        <Route path="/settings"        element={<Protected><SettingsPage /></Protected>} />

        {/* Stub pages for sidebar links not yet fully implemented */}
        <Route path="/replay"   element={<Protected><div style={{ padding: '2rem' }}>Replay queue — coming soon</div></Protected>} />
        <Route path="/team"     element={<Protected><div style={{ padding: '2rem' }}>Team management — coming soon</div></Protected>} />
        <Route path="/api-keys" element={<Protected><div style={{ padding: '2rem' }}>API keys — coming soon</div></Protected>} />
        <Route path="/billing"  element={<Protected><div style={{ padding: '2rem' }}>Billing — coming soon</div></Protected>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
