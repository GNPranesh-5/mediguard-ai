import { Beaker } from 'lucide-react';
import { DEMO_MODE } from '../config';

// Shown on the login/register forms in demo mode only.
export default function DemoAuthNote() {
  if (!DEMO_MODE) return null;
  return (
    <div className="notice notice--warn">
      <Beaker size={18} aria-hidden="true" />
      <p>Demo accounts are stored only in this browser. Real authentication will be added with the backend.</p>
    </div>
  );
}
