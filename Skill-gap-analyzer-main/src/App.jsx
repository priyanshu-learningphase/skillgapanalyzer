/**
 * Main App Component
 *
 * Sets up routing for the entire application.
 * Handles role-based navigation (student vs admin).
 */

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import Landing from './pages/Landing';
import { FullPageSpinner, Spinner } from './components/ui/Spinner';

const Login = lazy(() => import('./components/auth/Login'));
const Signup = lazy(() => import('./components/auth/Signup'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analysis = lazy(() => import('./pages/Analysis'));
const Careers = lazy(() => import('./pages/Careers'));
const Roadmap = lazy(() => import('./pages/Roadmap'));
const Progress = lazy(() => import('./pages/Progress'));
const Resources = lazy(() => import('./pages/Resources'));
const Settings = lazy(() => import('./pages/Settings'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));

const PageFallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <Spinner />
  </div>
);

/**
 * Dashboard Router Component
 *
 * Automatically redirects users to the appropriate dashboard based on their role.
 */
const DashboardRouter = () => {
  const { userProfile } = useAuth();

  if (userProfile?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <Dashboard />;
};

const page = (element) => <Suspense fallback={<PageFallback />}>{element}</Suspense>;

const App = () => (
  <Suspense fallback={<FullPageSpinner />}>
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Onboarding runs full-screen, outside the app shell */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />

      {/* App */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={page(<DashboardRouter />)} />
        <Route path="/analysis" element={page(<Analysis />)} />
        <Route path="/careers" element={page(<Careers />)} />
        <Route path="/careers/:roleId" element={page(<Careers />)} />
        <Route path="/roadmap" element={page(<Roadmap />)} />
        <Route path="/roadmap/:phaseId" element={page(<Roadmap />)} />
        <Route path="/progress" element={page(<Progress />)} />
        <Route path="/resources" element={page(<Resources />)} />
        <Route path="/settings" element={page(<Settings />)} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              {page(<AdminDashboard />)}
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Legacy route from the original app */}
      <Route path="/results" element={<Navigate to="/analysis" replace />} />

      <Route path="*" element={page(<NotFound />)} />
    </Routes>
  </Suspense>
);

export default App;
