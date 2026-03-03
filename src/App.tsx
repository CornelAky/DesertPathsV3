import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { PublicItineraryView } from './components/shared/PublicItineraryView';

const Auth = lazy(() => import('./components/Auth'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const GuideView = lazy(() => import('./components/guide/GuideView'));
const ClientDashboard = lazy(() => import('./components/client/ClientDashboard').then(module => ({ default: module.ClientDashboard })));

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-brand-beige flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-terracotta mx-auto mb-4"></div>
        <p className="text-brand-brown-warm">Loading...</p>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, userProfile, loading } = useAuth();
  const isPasswordReset = window.location.pathname === '/reset-password';

  // Check if this is a shared itinerary link
  const sharedMatch = window.location.pathname.match(/^\/shared\/(.+)$/);
  if (sharedMatch) {
    const token = sharedMatch[1];
    return (
      <ErrorBoundary>
        <PublicItineraryView token={token} />
      </ErrorBoundary>
    );
  }

  if (loading && !isPasswordReset) {
    return <LoadingFallback />;
  }

  if (!user || !userProfile || isPasswordReset) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <Auth />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (userProfile.role === 'admin' || userProfile.role === 'manager') {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <AdminDashboard />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (userProfile.role === 'client') {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <ClientDashboard />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <GuideView />
      </Suspense>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
