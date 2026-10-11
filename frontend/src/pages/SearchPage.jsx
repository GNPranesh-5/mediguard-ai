import { useState } from 'react';
import { Search, SearchX, X, Sparkles } from 'lucide-react';
import PageContainer from '../components/PageContainer';
import SearchInput from '../components/SearchInput';
import MedicineCard from '../components/MedicineCard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Button from '../components/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { searchMedicines, searchAIMedicine } from '../services/api';

export default function SearchPage() {
  useDocumentTitle('Search medicines');
  const [query, setQuery] = useState('');
  const [strength, setStrength] = useState('');
  const [fieldError, setFieldError] = useState(null);
  // status: 'idle' | 'loading' | 'ai-loading' | 'success' | 'error'
  const [status, setStatus] = useState('idle');
  const [results, setResults] = useState([]);
  const [aiResult, setAiResult] = useState(null);
  const [error, setError] = useState(null);

  const runSearch = async (e) => {
    e?.preventDefault();
    if (query.trim().length < 2) { setFieldError('Type at least 2 characters of a brand or generic name.'); return; }
    setFieldError(null);
    setAiResult(null);
    setStatus('loading');
    try {
      const data = await searchMedicines(query.trim(), strength);
      setResults(data.results);
      if (data.results.length === 0) {
        // No DB record — ask MedGemma to synthesise information for this query
        setStatus('ai-loading');
        try {
          const aiData = await searchAIMedicine(query.trim(), strength);
          setAiResult(aiData.result ?? null);
        } catch {
          // AI search failing is non-fatal; show the empty state instead
          setAiResult(null);
        }
      }
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  };

  const clearAll = () => { setQuery(''); setStrength(''); setFieldError(null); setResults([]); setAiResult(null); setStatus('idle'); };


  return (
    <PageContainer title="Search medicines" intro="Look up a medicine by brand name, generic name or active ingredient. Use this if a photo could not be recognised.">
      <form className="card search-form" onSubmit={runSearch} noValidate>
        <SearchInput id="med-query" label="Medicine name or ingredient" value={query} onChange={setQuery} onClear={() => setQuery('')} placeholder="e.g. paracetamol" error={fieldError} />
        <div className="field">
          <label htmlFor="med-strength">Strength (optional)</label>
          <input id="med-strength" className="input" value={strength} onChange={(e) => setStrength(e.target.value)} placeholder="e.g. 500 mg" />
        </div>
        <div className="search-form__actions">
          <Button type="submit" icon={Search} loading={status === 'loading'}>Search</Button>
          <Button variant="ghost" icon={X} onClick={clearAll}>Clear search</Button>
        </div>
      </form>

      <div className="results" aria-live="polite">
        {(status === 'loading' || status === 'ai-loading') && <LoadingSkeleton count={3} />}
        {status === 'ai-loading' && (
          <p className="muted" style={{ marginTop: 8 }}>
            <Sparkles size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} aria-hidden="true" />
            No catalogue record found — asking MedGemma…
          </p>
        )}
        {status === 'error' && <ErrorState error={error} onRetry={runSearch} />}

        {status === 'success' && results.length === 0 && !aiResult && (
          <EmptyState icon={SearchX} title="No medicines found" message="Check the spelling, try the generic name, or remove the strength filter.">
            <Button variant="secondary" onClick={clearAll}>Clear search</Button>
          </EmptyState>
        )}

        {status === 'success' && results.length > 0 && (
          <>
            <p className="muted">{results.length} result{results.length === 1 ? '' : 's'}</p>
            <div className="stack">{results.map((m) => <MedicineCard key={m.id} medicine={m} />)}</div>
          </>
        )}

        {status === 'success' && results.length === 0 && aiResult && (
          <>
            <p className="muted">
              <Sparkles size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} aria-hidden="true" />
              No catalogue record found. AI-generated result — not independently verified.
            </p>
            <div className="stack">
              <MedicineCard
                key={aiResult.id}
                medicine={{ ...aiResult, status: 'needs_review' }}
                stateForDetail={{ medicine: aiResult, aiGenerated: true }}
              />
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}
