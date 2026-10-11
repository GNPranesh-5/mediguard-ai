import { useState } from 'react';
import { Bookmark, Search, Trash2 } from 'lucide-react';
import PageContainer from '../components/PageContainer';
import MedicineCard from '../components/MedicineCard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import ConfirmationDialog from '../components/ConfirmationDialog';
import Button from '../components/Button';
import MedicalDisclaimer from '../components/MedicalDisclaimer';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../components/ToastNotification';
import { getSavedMedicines, removeSavedMedicine } from '../services/api';

export default function SavedPage() {
  useDocumentTitle('Saved medicines');
  const toast = useToast();
  const { status, data, error, reload } = useAsync(getSavedMedicines, []);
  const [toRemove, setToRemove] = useState(null);

  const confirmRemove = async () => {
    try { await removeSavedMedicine(toRemove.id); toast('Removed from saved medicines.'); reload(); }
    catch (err) { toast(err.pending ? 'This needs the backend, which is not connected yet.' : err.message, 'info'); }
    setToRemove(null);
  };

  return (
    <PageContainer title="Saved medicines" intro="Medicines you saved for later reference. Saving is a bookmark only, not a recommendation to take anything.">
      {status === 'loading' && <LoadingSkeleton count={2} />}
      {status === 'error' && <ErrorState error={error} onRetry={reload} />}
      {status === 'success' && data.medicines.length === 0 && (
        <EmptyState icon={Bookmark} title="Nothing saved yet" message="Open a medicine and choose Save medicine to keep it here.">
          <Button to="/search" icon={Search}>Search medicine</Button>
        </EmptyState>
      )}
      {status === 'success' && data.medicines.length > 0 && (
        <div className="stack">
          {data.medicines.map((m) => (
            <MedicineCard key={m.id} medicine={m} actions={<Button variant="ghost" size="sm" icon={Trash2} onClick={() => setToRemove(m)} aria-label={`Remove ${m.name} from saved`}>Remove</Button>} />
          ))}
        </div>
      )}
      <div style={{ marginTop: 32 }}><MedicalDisclaimer /></div>
      <ConfirmationDialog
        open={!!toRemove} title="Remove from saved?" confirmLabel="Remove"
        message={toRemove ? `“${toRemove.name}” will be removed from your saved medicines.` : ''}
        onConfirm={confirmRemove} onCancel={() => setToRemove(null)}
      />
    </PageContainer>
  );
}
