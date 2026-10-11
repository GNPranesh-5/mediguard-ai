import { useState, useRef } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { CheckCircle2, UserPlus } from 'lucide-react';
import PageContainer from '../components/PageContainer';
import PasswordInput from '../components/PasswordInput';
import DemoAuthNote from '../components/DemoAuthNote';
import ErrorState from '../components/ErrorState';
import Button from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../components/ToastNotification';
import { useRedirectTarget } from './LoginPage';
import { validateName, validateEmail, validateNewPassword, validateConfirm } from '../utils/validateAuth';

export default function RegisterPage() {
  useDocumentTitle('Register');
  const { register, isAuthenticated } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const target = useRedirectTarget();
  const refs = { name: useRef(null), email: useRef(null), password: useRef(null), confirm: useRef(null), agree: useRef(null) };
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', agree: false });
  const [errors, setErrors] = useState({});
  const [serviceError, setServiceError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  if (isAuthenticated) return <Navigate to={target} replace />;

  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = {
      name: validateName(form.name),
      email: validateEmail(form.email),
      password: validateNewPassword(form.password),
      confirm: validateConfirm(form.password, form.confirm),
      agree: form.agree ? '' : 'Please confirm that you understand this before registering.',
    };
    setErrors(next); setServiceError(null);
    const firstBad = ['name', 'email', 'password', 'confirm', 'agree'].find((k) => next[k]);
    if (firstBad) { refs[firstBad].current?.focus(); return; }
    setSubmitting(true);
    try {
      await register({ name: form.name, email: form.email, password: form.password });
      setRegistrationSuccess(true);
      toast('Account created. Please log in.');
    } catch (err) {
      if (err.pending) setServiceError(err);
      else if (err.status === 409) { setErrors({ email: err.message }); refs.email.current?.focus(); }
      else setErrors({ form: err.message });
      setSubmitting(false);
    }
  };

  return (
    <PageContainer>
      <div className="auth">
        <h1 className="auth__title">Create an account</h1>
        <p className="muted">An account keeps your scan history and saved medicines together.</p>
        {serviceError ? <ErrorState error={serviceError} title="Registration service unavailable" onRetry={() => setServiceError(null)} /> : registrationSuccess ? (
          <div className="card auth__form">
            <div className="notice notice--success" role="status">
              <CheckCircle2 size={24} aria-hidden="true" />
              <div>
                <h3 style={{ margin: 0, fontWeight: 600 }}>Registration successful</h3>
                <p style={{ margin: '4px 0 0 0' }}>Your account for <strong>{form.email}</strong> has been created. You can now proceed to log in.</p>
              </div>
            </div>
            <Button to="/login" state={location.state} block>Proceed to Log in</Button>
          </div>
        ) : (
          <form className="card auth__form" onSubmit={handleSubmit} noValidate>
            <DemoAuthNote />
            {errors.form && <div className="notice notice--danger" role="alert"><p>{errors.form}</p></div>}
            <div className="field">
              <label htmlFor="reg-name">Full name</label>
              <input id="reg-name" ref={refs.name} className="input" autoComplete="name" value={form.name} onChange={(e) => set('name')(e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'reg-name-err' : undefined} />
              {errors.name && <p id="reg-name-err" className="error-text" role="alert">{errors.name}</p>}
            </div>
            <div className="field">
              <label htmlFor="reg-email">Email</label>
              <input id="reg-email" ref={refs.email} className="input" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => set('email')(e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'reg-email-err' : undefined} />
              {errors.email && <p id="reg-email-err" className="error-text" role="alert">{errors.email}</p>}
            </div>
            <PasswordInput id="reg-password" inputRef={refs.password} label="Password" value={form.password} onChange={set('password')} error={errors.password} hint="At least 8 characters, with a letter and a number." autoComplete="new-password" />
            <PasswordInput id="reg-confirm" inputRef={refs.confirm} label="Confirm password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} autoComplete="new-password" />
            <div className="field">
              <label className="check" htmlFor="reg-agree">
                <input id="reg-agree" ref={refs.agree} type="checkbox" checked={form.agree} onChange={(e) => set('agree')(e.target.checked)} aria-invalid={!!errors.agree} aria-describedby={errors.agree ? 'reg-agree-err' : undefined} />
                <span>I understand MediGuard AI provides information only, not medical advice.</span>
              </label>
              {errors.agree && <p id="reg-agree-err" className="error-text" role="alert">{errors.agree}</p>}
            </div>
            <Button type="submit" icon={UserPlus} loading={submitting} block>Create account</Button>
          </form>
        )}
        <p className="auth__switch">Already have an account? <Link to="/login" state={location.state}>Log in</Link></p>
      </div>
    </PageContainer>
  );
}
