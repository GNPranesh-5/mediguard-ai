import { useState, useMemo } from 'react';
import { History, ScanLine } from 'lucide-react';
import PageContainer from '../components/PageContainer';
import HistoryCard from '../components/HistoryCard';
import SearchInput from '../components/SearchInput';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import ConfirmationDialog from '../components/ConfirmationDialog';
import Button from '../components/Button';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../components/ToastNotification';
import { DEMO_MODE } from '../config';
import { getScanHistory, deleteScan } from '../services/api';

export default function HistoryPage() {
  useDocumentTitle('Scan history');
  const toast = useToast();
  const { status, data, error, reload } = useAsync(getScanHistory, []);
  const [filter, setFilter] = useState('');
  const [toDelete, setToDelete] = useState(null); // the scan waiting for confirmation

  // useMemo: only re-filter when the data or the filter text changes.
  const scans = useMemo(() => {
    const all = data?.scans || [];
    const f = filter.trim().toLowerCase();
    return f ? all.filter((s) => (s.medicineName || s.medicine_name || 'unidentified medicine').toLowerCase().includes(f)) : all;
  }, [data, filter]);

  const confirmDelete = async () => {
    try { await deleteScan(toDelete.id); toast('Scan deleted.'); reload(); }
    catch (err) { toast(err.pending ? 'Deleting needs the backend, which is not connected yet.' : err.message, 'info'); }
    setToDelete(null);
  };

  return (
    <PageContainer
      title="Scan history"
      intro={DEMO_MODE ? "Your earlier scans. In demo mode they are stored only in this browser." : "Your earlier scans and identified medicines."}
    >
      {status === 'loading' && <LoadingSkeleton count={3} />}
      {status === 'error' && <ErrorState error={error} onRetry={reload} />}
      {status === 'success' && data.scans.length === 0 && (
        <EmptyState icon={History} title="No scans yet" message="Scan a medicine and it will appear here.">
          <Button to="/scan" icon={ScanLine}>Scan a Medicine</Button>
        </EmptyState>
      )}
      {status === 'success' && data.scans.length > 0 && (
        <>
          <div className="filter-bar"><SearchInput id="hist-filter" label="Filter history" value={filter} onChange={setFilter} onClear={() => setFilter('')} placeholder="Medicine name" /></div>
          {scans.length === 0
            ? <EmptyState title="No matching scans" message={`Nothing in your history matches “${filter}”.`}><Button variant="secondary" onClick={() => setFilter('')}>Clear filter</Button></EmptyState>
            : <div className="stack">{scans.map((s) => <HistoryCard key={s.id} scan={s} onDelete={setToDelete} />)}</div>}
        </>
      )}
      <ConfirmationDialog
        open={!!toDelete} title="Delete this scan?" confirmLabel="Delete scan"
        message="It will be removed from your history. This cannot be undone."
        onConfirm={confirmDelete} onCancel={() => setToDelete(null)}
      />
    </PageContainer>
  );
}
