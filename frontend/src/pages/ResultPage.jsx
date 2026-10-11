import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Bookmark, BookmarkCheck, ScanLine, Search, Beaker, FileText, Pill, Lightbulb, BookOpen, ImageOff, HelpCircle, Sparkles } from 'lucide-react';
import PageContainer from '../components/PageContainer';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import Button from '../components/Button';
import VerificationBadge from '../components/VerificationBadge';
import SourceBadge from '../components/SourceBadge';
import MedicineSpecifications from '../components/MedicineSpecifications';
import UsesSection from '../components/UsesSection';
import SafetyInformation from '../components/SafetyInformation';
import ExtractedTextPanel from '../components/ExtractedTextPanel';
import ExpandableSection from '../components/ExpandableSection';
import MedicalDisclaimer from '../components/MedicalDisclaimer';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../components/ToastNotification';
import { getScan, getMedicineDetails, getSavedMedicines, saveMedicine, removeSavedMedicine, saveAIMedicine } from '../services/api';

import ProtectedImage from '../components/ProtectedImage';

function formatScanAnalysis(analysis) {
  if (!analysis) return { scan: null, medicine: null, analysis: null };
  if (analysis.scan && analysis.medicine && !analysis.medicine_match && !analysis.extracted_text) {
    return analysis;
  }
  const rawMedicine =
    analysis.matched_medicine ??
    analysis.medicine_match?.medicine ??
    analysis.medicine ??
    null;

  const rawScan = analysis.scan;

  const medicine = rawMedicine
    ? {
        ...rawMedicine,
        brandName: rawMedicine.brand_name ?? rawMedicine.brandName,
        genericName: rawMedicine.generic_name ?? rawMedicine.genericName,
        dosageForm: rawMedicine.dosage_form ?? rawMedicine.dosageForm,
        simpleExplanation:
          rawMedicine.simple_explanation ??
          rawMedicine.simpleExplanation,
        activeIngredients:
          rawMedicine.active_ingredients ??
          rawMedicine.activeIngredients,
        extractedText: analysis.extracted_text ?? rawMedicine.extractedText ?? '',
        sources: analysis.sources ?? rawMedicine.sources ?? [],
      }
    : null;

  return {
    scan: rawScan
      ? {
          ...rawScan,
          imageUrl: rawScan.image_url ?? rawScan.imageUrl,
        }
      : null,
    medicine,
    analysis,
  };
}

// One page for two routes: /scan/:scanId (result of a scan) and /medicine/:id (opened from search/saved).
export default function ResultPage({ source }) {
  const { scanId, id } = useParams();
  const toast = useToast();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const stateFromSearch = location.state;
  const analysis = stateFromSearch?.analysis;
  const stateAiMedicine = stateFromSearch?.medicine ?? null;   // passed from AI search result
  const isAiGenerated = stateFromSearch?.aiGenerated === true;

  // savedMedicineId tracks the real DB id after an AI medicine is first saved.
  const [saved, setSaved] = useState(false);
  const [savedMedicineId, setSavedMedicineId] = useState(null);

  const { status, data, error, reload } = useAsync(async () => {
    if (source === 'scan') {
      if (analysis) {
        return formatScanAnalysis(analysis);
      }

      // Fallback for direct visits or page refreshes.
      const fetched = await getScan(scanId);
      return formatScanAnalysis(fetched);
    }

    // Medicine detail route: use router state data when available (AI results)
    // to avoid a DB fetch that would 404 for synthetic UUIDs.
    if (stateAiMedicine) {
      return { scan: null, medicine: stateAiMedicine };
    }

    return {
      scan: null,
      medicine: await getMedicineDetails(id),
    };
  }, [source, scanId, id, analysis, stateAiMedicine]);

  const medicine = data?.medicine;
  const scan = data?.scan;

  const analysisData = data?.analysis;

  const extractedText =
    analysisData?.extracted_text ?? medicine?.extractedText ?? '';

  const ocrLines = analysisData?.ocr_lines ?? [];

  const aiExplanation = analysisData?.ai_explanation;

  const sources =
    analysisData?.sources ?? medicine?.sources ?? [];

  const matchStatus =
    analysisData?.medicine_match?.match_status;

  const identityVerified =
    analysisData?.medicine_match?.identity_verified === true;

  useDocumentTitle(medicine?.name || 'Medicine result');

  const isScanAiCandidate = matchStatus === 'candidate_identified' || medicine?.status === 'ai_suggestion';
  const isAiMedicineWithoutDb = (isAiGenerated || isScanAiCandidate) && !savedMedicineId;

  // After the medicine loads, check whether it is already in the saved list.
  useEffect(() => {
    if (!medicine) return;
    getSavedMedicines().then(({ medicines }) => {
      const match = medicines.find(
        (m) =>
          m.id === medicine.id ||
          (m.name && medicine.name && m.name.toLowerCase() === medicine.name.toLowerCase())
      );
      if (match) {
        setSaved(true);
        setSavedMedicineId(match.id);
      }
    }).catch(() => {});
  }, [medicine]);

  const toggleSave = async () => {
    if (!isAuthenticated) { toast('Log in to save medicines.', 'info'); navigate('/login', { state: { from: location } }); return; }
    try {
      const currentSavedId = savedMedicineId ?? medicine.id;
      if (saved) {
        await removeSavedMedicine(currentSavedId);
        setSaved(false);
        setSavedMedicineId(null);
        toast('Removed from saved medicines.');
      } else if (isAiMedicineWithoutDb) {
        // AI result without a pre-existing DB record: persist to DB first, then save.
        const payload = {
          name: medicine.name || medicine.brandName || medicine.genericName || 'Unverified Medicine',
          brand_name: medicine.brand_name ?? medicine.brandName,
          generic_name: medicine.generic_name ?? medicine.genericName,
          strength: medicine.strength,
          dosage_form: medicine.dosage_form ?? medicine.dosageForm,
          manufacturer: medicine.manufacturer,
          simple_explanation: medicine.simple_explanation ?? medicine.simpleExplanation,
          uses: medicine.uses || [],
          how_it_works: medicine.how_it_works ?? medicine.howItWorks,
          side_effects: (medicine.side_effects ?? medicine.sideEffects) || [],
          warnings: medicine.warnings || [],
          storage: medicine.storage,
          label_dosage: medicine.label_dosage ?? medicine.labelDosage,
          active_ingredients: (medicine.active_ingredients ?? medicine.activeIngredients) || [],
        };
        const saved_data = await saveAIMedicine(payload);
        const newId = saved_data?.id;
        if (newId) {
          setSavedMedicineId(newId);
          setSaved(true);
          toast('Saved. Find it under Saved medicines.');
        } else {
          throw new Error('Save failed to return valid database record ID.');
        }
      } else {
        await saveMedicine(currentSavedId);
        setSaved(true);
        toast('Saved. Find it under Saved medicines.');
      }
    } catch (err) {
      toast(err.message || 'Could not save medicine. Please try again.', 'info');
    }
  };

  if (status === 'loading') return <PageContainer><LoadingSkeleton variant="result" /></PageContainer>;
  if (status === 'error') return <PageContainer><ErrorState error={error} onRetry={reload} /></PageContainer>;

  // Scan finished but nothing was identified
  if (!medicine) {
    return (
      <PageContainer title="Medicine identification needs review">
        <EmptyState
          icon={HelpCircle}
          title="No reliable medicine match found"
          message="The system could not identify a suitable reference record. Review the extracted text below or try a clearer image."
        />

        {analysisData && (
          <>
            <section className="card" style={{ marginTop: 24 }}>
              <h2 className="section-title">Extracted package text</h2>
              <pre className="extracted-text">
                {extractedText || 'No text was extracted.'}
              </pre>

              {ocrLines.map((line, index) => (
                <p key={`${index}-${line.text}`}>
                  {line.text} —{' '}
                  {Number.isFinite(Number(line.confidence))
                    ? `${(Number(line.confidence) * 100).toFixed(1)}% confidence`
                    : 'Confidence unavailable'}
                </p>
              ))}
            </section>

            <section className="card" style={{ marginTop: 16 }}>
              <h2 className="section-title">AI-generated explanation</h2>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                {aiExplanation || 'No AI explanation is available.'}
              </div>
              <MedicalDisclaimer />
            </section>

            <section className="card" style={{ marginTop: 16 }}>
              <h2 className="section-title">Reference sources</h2>
              {sources.length ? (
                <div className="badge-row">
                  {sources.map((s, index) => (
                    <SourceBadge
                      key={s.id ?? s.url ?? `${s.name}-${index}`}
                      source={s}
                    />
                  ))}
                </div>
              ) : (
                <p className="unavailable">Information unavailable</p>
              )}
            </section>
          </>
        )}

        <div className="result__footer">
          <Button to="/scan" icon={ScanLine}>
            Scan another medicine
          </Button>
          <Button to="/search" variant="secondary" icon={Search}>
            Search by name
          </Button>
        </div>
      </PageContainer>
    );
  }

  const status_ = isScanAiCandidate || isAiGenerated ? 'ai_suggestion' : (scan?.status || medicine.status);
  const isDemoResult = scan?.demo;

  return (
    <PageContainer
      title={medicine.name}
      actions={
        <Button variant={saved ? 'secondary' : 'primary'} icon={saved ? BookmarkCheck : Bookmark} onClick={toggleSave} aria-pressed={saved}>
          {saved ? 'Saved' : 'Save medicine'}
        </Button>
      }
    >
      <div className="result__status">
        <VerificationBadge status={status_} />

        {matchStatus && matchStatus !== 'candidate_identified' && matchStatus !== 'not_detected' && (
          <span className="badge">
            Match status: {matchStatus.replaceAll('_', ' ')}
          </span>
        )}

        {analysisData && matchStatus === 'candidate_identified' && (
          <div className="notice notice--info">
            <Sparkles size={20} aria-hidden="true" />
            <p>
              <strong>AI-identified from package image.</strong>
              {' '}Identified by AI from packaging text evidence (unlisted in reference database). Physical identity and authenticity are not verified.
            </p>
          </div>
        )}

        {analysisData && !identityVerified && matchStatus && matchStatus !== 'candidate_identified' && matchStatus !== 'not_detected' && (
          <div className="notice notice--warn">
            <HelpCircle size={20} aria-hidden="true" />
            <p>
              <strong>Medicine identity not verified.</strong>
              {' '}This is a possible reference match, not confirmation
              that the uploaded package contains this medicine.
            </p>
          </div>
        )}

        {isDemoResult && (
          <span className="badge badge--demo">
            <Beaker size={14} aria-hidden="true" />
            Demo sample
          </span>
        )}
      </div>

      {isDemoResult && (
        <div className="notice notice--warn" style={{ marginBottom: 24 }}>
          <Beaker size={20} aria-hidden="true" />
          <p><strong>This is not an analysis of your image.</strong> Demo mode shows a fixed sample record so you can see the layout. A real model and reference database are not connected yet.</p>
        </div>
      )}

      <div className="result__grid">
        <div className="result__main">
          <section className="card" aria-labelledby="specs-h">
            <h2 id="specs-h" className="section-title"><Pill size={20} aria-hidden="true" />Specifications</h2>
            <MedicineSpecifications medicine={medicine} />
          </section>

          <section className="card" aria-labelledby="simple-h">
            <h2 id="simple-h" className="section-title"><Lightbulb size={20} aria-hidden="true" />In simple words</h2>
            {medicine.simpleExplanation ? <p>{medicine.simpleExplanation}</p> : <p className="unavailable">Information unavailable</p>}
          </section>

          {analysisData && (
            <section className="card" aria-labelledby="ai-explanation-h">
              <h2 id="ai-explanation-h" className="section-title">
                <Lightbulb size={20} aria-hidden="true" />
                AI-generated explanation
              </h2>

              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                {aiExplanation || 'No AI explanation is available for this scan.'}
              </div>

              <p className="unavailable">
                AI-generated information may be incomplete or incorrect.
                It has not been medically verified. Do not use it to decide
                a dose or treatment.
              </p>
            </section>
          )}

          <section className="card" aria-labelledby="uses-h">
            <h2 id="uses-h" className="section-title">Uses</h2>
            <UsesSection medicine={medicine} />
          </section>

          <section aria-labelledby="safety-h">
            <h2 id="safety-h" className="section-title">Safety information</h2>
            <SafetyInformation medicine={medicine} />
          </section>
        </div>

        <aside className="result__side">
          <div className="card">
            <h2 className="section-title">Your photo</h2>
            {scan?.imageUrl
              ? <ProtectedImage className="result__img" src={scan.imageUrl} alt={`Uploaded front of package for ${medicine.name}`} />
              : <p className="muted result__noimg"><ImageOff size={18} aria-hidden="true" />{scan ? 'The image is not available.' : 'Opened from search, so there is no uploaded photo.'}</p>}
          </div>

          <div className="card">
            <h2 className="section-title">
              <FileText size={20} aria-hidden="true" />
              OCR results
            </h2>

            <p className="muted">
              Text extracted from the uploaded package image.
            </p>

            {extractedText ? (
              <pre className="extracted-text">{extractedText}</pre>
            ) : (
              <p className="unavailable">No text was extracted.</p>
            )}

            {ocrLines.length > 0 && (
              <ul>
                {ocrLines.map((line, index) => (
                  <li key={`${index}-${line.text}`}>
                    <span>{line.text}</span>
                    {' — '}
                    {Number.isFinite(Number(line.confidence))
                      ? `${(Number(line.confidence) * 100).toFixed(1)}% confidence`
                      : 'Confidence unavailable'}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <ExpandableSection title="Extracted package text" icon={FileText} defaultOpen>
            <ExtractedTextPanel text={extractedText} demo={isDemoResult || !scan} />
          </ExpandableSection>

          <div className="card" style={{ marginTop: 12 }}>
            <h2 className="section-title"><BookOpen size={20} aria-hidden="true" />Sources</h2>
            {sources.length ? (
              <div className="badge-row">
                {sources.map((s, index) => (
                  <SourceBadge
                    key={s.id ?? s.url ?? `${s.name}-${index}`}
                    source={s}
                  />
                ))}
              </div>
            ) : (
              <p className="unavailable">Information unavailable</p>
            )}
          </div>
        </aside>
      </div>

      <div className="result__footer">
        <Button to="/search" variant="secondary" icon={Search}>Back to search</Button>
        <Button to="/scan" variant="secondary" icon={ScanLine}>Scan another medicine</Button>
      </div>
      <div style={{ marginTop: 24 }}><MedicalDisclaimer /></div>
    </PageContainer>
  );
}
