import { AlertTriangle, PlugZap } from 'lucide-react';
import Button from './Button';

// `error` may be an ApiError. If error.pending is true we show the "backend not connected" message.
export default function ErrorState({ error, onRetry, title }) {
  const pending = error?.pending;
  const Icon = pending ? PlugZap : AlertTriangle;
  return (
    <div className="state state--error" role="alert">
      <Icon size={36} aria-hidden="true" />
      <h3>{title || (pending ? 'Backend integration pending' : 'Something went wrong')}</h3>
      <p className="muted">
        {pending
          ? 'This action needs the MediGuard backend, which is not connected yet. Turn on demo mode (VITE_DEMO_MODE=true) to preview the interface with sample data.'
          : error?.message || 'Please try again.'}
      </p>
      {onRetry && <div className="state__actions"><Button variant="secondary" onClick={onRetry}>Try again</Button></div>}
    </div>
  );
}
