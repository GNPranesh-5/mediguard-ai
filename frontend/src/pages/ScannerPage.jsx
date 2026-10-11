import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine, Search, Info } from 'lucide-react';
import PageContainer from '../components/PageContainer';
import UploadDropzone from '../components/UploadDropzone';
import AnalysisStatus from '../components/AnalysisStatus';
import ErrorState from '../components/ErrorState';
import Button from '../components/Button';
import MedicalDisclaimer from '../components/MedicalDisclaimer';
import { useImageUpload } from '../hooks/useImageUpload';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../components/ToastNotification';
import { analyzeMedicine } from '../services/api';
import { fileToThumbnail } from '../utils/imageTools';

export default function ScannerPage() {
  useDocumentTitle('Scan a medicine');
  const navigate = useNavigate();
  const toast = useToast();
  const front = useImageUpload();
  const back = useImageUpload();
  // phase: 'idle' | 'analyzing' | 'error'  (drives which UI is shown)
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);

  const handleAnalyze = async () => {
    if (!front.file) {
      setFormError('Add a photo of the front of the package first.');
      return;
    }

    setFormError(null);
    setError(null);
    setPhase('analyzing');

    try {
      const frontThumb = await fileToThumbnail(front.file);

      const response = await analyzeMedicine({
        frontFile: front.file,
        backFile: back.file,
        frontThumb,
      });

      if (!response?.scan?.id) {
        throw new Error('The backend response did not contain a scan ID.');
      }

      toast('Result ready.');

      navigate(`/scan/${response.scan.id}`, {
        state: { analysis: response },
      });
    } catch (err) {
      setError(err);
      setPhase('error');
    }
  };

  const busy = phase === 'analyzing';
  return (
    <PageContainer title="Scan a medicine" intro="Add a clear, well-lit photo of the package. The front is required; the back helps if it shows ingredients or batch details.">
      {phase === 'analyzing' && <AnalysisStatus />}
      {phase === 'error' && <ErrorState error={error} onRetry={handleAnalyze} />}

      {!busy && (
        <>
          <div className="upload-grid">
            <UploadDropzone label="Front of package" {...front} onSelect={front.select} onRemove={front.clear} />
            <UploadDropzone label="Back of package" optional {...back} onSelect={back.select} onRemove={back.clear} />
          </div>
          {formError && <p className="error-text" role="alert" style={{ marginTop: 16 }}>{formError}</p>}
          <div className="scan-actions">
            <Button icon={ScanLine} onClick={handleAnalyze} disabled={!front.file}>Analyze Medicine</Button>
            <Button to="/search" variant="secondary" icon={Search}>Search by name instead</Button>
          </div>
          <p className="hint" style={{ marginTop: 12 }}><Info size={14} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> Images are checked here for type and size. The server will check them again once connected.</p>
        </>
      )}
      <div style={{ marginTop: 32 }}><MedicalDisclaimer /></div>
    </PageContainer>
  );
}
