import { Beaker } from 'lucide-react';
import { DEMO_MODE } from '../config';

// Visible only in demo mode to inform the user that sample data is in use.
// In normal backend mode, no banner is displayed.
export default function DemoBanner() {
  if (!DEMO_MODE) return null;

  return (
    <div className="demo-banner" role="status">
      <div className="container">
        <Beaker size={16} aria-hidden="true" />
        <p>
          <strong>Demo mode.</strong> Backend integration pending. Results are sample records, not real AI analysis.
        </p>
      </div>
    </div>
  );
}
