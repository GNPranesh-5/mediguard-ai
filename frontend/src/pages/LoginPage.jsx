import { useState, useRef } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import PageContainer from '../components/PageContainer';
import PasswordInput from '../components/PasswordInput';
import DemoAuthNote from '../components/DemoAuthNote';
import ErrorState from '../components/ErrorState';
import Button from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../components/ToastNotification';
import { validateEmail } from '../utils/validateAuth';

// Where to go after login: the page the user originally wanted (set by ProtectedRoute), else /scan.
export function useRedirectTarget() {
  const { state } = useLocation();
  const from = state?.from;
  const computed = from?.pathname ? `${from.pathname}${from.search || ''}` : '/scan';
  // Remember the FIRST value: after login the location changes, and we must still go where the user originally wanted.
  const remembered = useRef(null);
  if (remembered.current === null) remembered.current = computed;
  return remembered.current;
}

export default function LoginPage() {
  useDocumentTitle('Log in');
  const { login, isAuthenticated, sessionExpired } = useAuth();
  const toast = useToast();
  const target = useRedirectTarget();
  const location = useLocation();
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [serviceError, setServiceError] = useState(null); // set when the backend is unreachable
  const [submitting, setSubmitting] = useState(false);

  // Already logged in (or just logged in): leave this page.
  if (isAuthenticated) return <Navigate to={target} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = { email: validateEmail(email), password: password ? '' : 'Enter your password.' };
    setErrors(next); setFormError(''); setServiceError(null);
    if (next.email) { emailRef.current?.focus(); return; }
    if (next.password) { passwordRef.current?.focus(); return; }
    setSubmitting(true);
    try {
      const user = await login(email, password);
      toast(`Welcome back, ${user.name.split(' ')[0]}.`);
    } catch (err) {
      if (err.pending) setServiceError(err);
      else setFormError(err.status === 401 || err.status === 400 || err.status === 422 ? 'Email or password is incorrect.' : err.message);
      setSubmitting(false);
    }
  };

  return (
    <PageContainer>
      <div className="auth">
        <h1 className="auth__title">Log in</h1>
        <p className="muted">Log in to scan medicines and keep your history and saved items.</p>
        {serviceError ? <ErrorState error={serviceError} title="Login service unavailable" onRetry={() => setServiceError(null)} /> : (
          <form className="card auth__form" onSubmit={handleSubmit} noValidate>
            <DemoAuthNote />
            {sessionExpired && (
              <div className="notice notice--warn" role="alert" style={{ marginBottom: 12 }}>
                <p><strong>Your session has expired.</strong> Please log in again to continue. Your data has been saved.</p>
              </div>
            )}
            {formError && <div className="notice notice--danger" role="alert"><p>{formError}</p></div>}
            <div className="field">
              <label htmlFor="login-email">Email</label>
              <input id="login-email" ref={emailRef} className="input" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'login-email-err' : undefined} />
              {errors.email && <p id="login-email-err" className="error-text" role="alert">{errors.email}</p>}
            </div>
            <PasswordInput id="login-password" inputRef={passwordRef} label="Password" value={password} onChange={setPassword} error={errors.password} autoComplete="current-password" />
            <Link to="/forgot-password" className="auth__forgot">Forgot password?</Link>
            <Button type="submit" icon={LogIn} loading={submitting} block>Log in</Button>
          </form>
        )}
        <p className="auth__switch">Don&rsquo;t have an account? <Link to="/register" state={location.state}>Register</Link></p>
      </div>
    </PageContainer>
  );
}
