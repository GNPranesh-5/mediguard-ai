import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { registerUser, loginUser, logoutUser, getCurrentUser } from '../services/authService';
import { setToken } from '../services/session';

// AuthContext shares the signed-in user with the whole app (Navbar, ProtectedRoute, pages).
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // true until we have checked for an existing session
  const [sessionExpired, setSessionExpired] = useState(false);

  // On first load, restore the session (so a page refresh keeps you logged in).
  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((u) => { if (!cancelled) setUser(u); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Listen for 401 responses dispatched by api.js. Clear the user and flag the session as expired
  // so the login page can show "Your session has expired. Please log in again."
  useEffect(() => {
    const handleExpiry = () => {
      setUser(null);
      setSessionExpired(true);
    };
    window.addEventListener('mediguard:session-expired', handleExpiry);
    return () => window.removeEventListener('mediguard:session-expired', handleExpiry);
  }, []);

  const login = useCallback(async (email, password) => {
    const { user: u } = await loginUser(email, password);
    setUser(u);
    setSessionExpired(false);
    return u;
  }, []);

  const register = useCallback(async (details) => {
    const { user: u, token } = await registerUser(details);
    if (token) setToken(token); // store the token issued on registration
    setUser(u);
    setSessionExpired(false);
    return u;
  }, []);

  const logout = useCallback(async () => { await logoutUser(); setUser(null); setSessionExpired(false); }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, isLoading, sessionExpired, login, register, logout }),
    [user, isLoading, sessionExpired, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
