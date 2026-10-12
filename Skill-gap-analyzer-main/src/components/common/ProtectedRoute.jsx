/**
 * Protected Route Component
 *
 * Wraps routes that require authentication.
 * Redirects to login if user is not authenticated. In local mode there is
 * always a local user, so routes are open.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FullPageSpinner } from '../ui/Spinner';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();

  // Show loading state
  if (loading) {
    return <FullPageSpinner />;
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role if required
  if (requiredRole && userProfile?.role !== requiredRole) {
    // Redirect students trying to access admin routes
    if (requiredRole === 'admin') {
      return <Navigate to="/dashboard" replace />;
    }
    // Redirect admins trying to access student routes
    if (requiredRole === 'student' && userProfile?.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
