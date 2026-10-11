import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../components/ToastNotification';

// Read auth state/actions: const { user, isAuthenticated, login, register, logout, isLoading } = useAuth();
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// Shared "Log out" behaviour for the navbar and Settings: go home first, then clear the session, then toast.
// (Going home first stops ProtectedRoute from bouncing the user to /login with a "return here" address.)
export function useLogoutAction() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  return async () => { navigate('/'); await logout(); toast('You have been logged out.'); };
}
