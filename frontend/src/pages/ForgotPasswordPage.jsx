import { PlugZap } from 'lucide-react';
import PageContainer from '../components/PageContainer';
import Button from '../components/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

// There is no password-reset service yet, so this page says so clearly instead of faking a reset email.
export default function ForgotPasswordPage() {
  useDocumentTitle('Forgot password');
  return (
    <PageContainer>
      <div className="auth">
        <div className="state">
          <PlugZap size={36} aria-hidden="true" />
          <h1 style={{ fontSize: 'var(--fs-lg)' }}>Password reset: integration pending</h1>
          <p className="muted">Resetting a password needs the MediGuard backend, which is not connected yet. In demo mode you can create a new account with a different email.</p>
          <div className="state__actions">
            <Button to="/login">Back to log in</Button>
            <Button to="/register" variant="secondary">Register</Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
