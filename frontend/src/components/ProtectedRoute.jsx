import { useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PageContainer from './PageContainer';
import LoadingSkeleton from './LoadingSkeleton';

// Wraps private pages. Logged out -> go to /login and remember where the user was heading
// (stored in router "state" as `from`) so the login page can send them back afterwards.
export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  // The page this instance was created for. While the page fades out after navigating away (e.g. Logout -> Home),
  // it must NOT redirect to /login; only redirect while this page is still the one being shown.
  const ownPath = useRef(location.pathname);

  if (isLoading) return <PageContainer><LoadingSkeleton variant="result" /></PageContainer>;
  if (!isAuthenticated && location.pathname !== ownPath.current) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />; // render the protected child page
}
