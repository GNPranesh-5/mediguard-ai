import { Beaker, ScanSearch } from 'lucide-react';
import { DEMO_MODE } from '../config';

// Shown while the analyze request is running. The bar is indeterminate because we do not know real progress.
export default function AnalysisStatus() {
  return (
    <div className="analysis" role="status" aria-live="polite">
      <ScanSearch size={28} aria-hidden="true" />
      <div>
        <p className="analysis__title">{DEMO_MODE ? 'Preparing a sample result…' : 'Analyzing your medicine…'}</p>
        <p className="hint">
          {DEMO_MODE
            ? 'Demo mode: your image is not being analyzed. A fixed sample record will be shown.'
            : 'Reading the package text and checking reference data. This can take a little while.'}
        </p>
        <div className="progress" aria-hidden="true"><span /></div>
        {DEMO_MODE && <span className="badge badge--demo" style={{ marginTop: 10 }}><Beaker size={14} aria-hidden="true" />Demo</span>}
      </div>
    </div>
  );
}
