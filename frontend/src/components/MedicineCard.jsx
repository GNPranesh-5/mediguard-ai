import { Link } from 'react-router-dom';
import { Pill, ChevronRight } from 'lucide-react';
import VerificationBadge from './VerificationBadge';

// Search-result / saved-medicine card. `actions` lets the parent add extra buttons (e.g. Remove).
// `stateForDetail` is forwarded to the detail page via router state (used for AI-generated results).
export default function MedicineCard({ medicine, actions, stateForDetail }) {
  return (
    <article className="card med-card">
      <div className="med-card__icon"><Pill size={22} aria-hidden="true" /></div>
      <div className="med-card__body">
        <h3 className="med-card__title">{medicine.name}</h3>
        <p className="muted med-card__meta">{[medicine.genericName ?? medicine.generic_name, medicine.strength, medicine.dosageForm ?? medicine.dosage_form].filter(Boolean).join(' · ')}</p>
        <VerificationBadge status={medicine.status} />
      </div>
      <div className="med-card__actions">
        {actions}
        <Link className="btn btn--secondary btn--sm" to={`/medicine/${medicine.id}`} state={stateForDetail ?? undefined}>View details <ChevronRight size={16} aria-hidden="true" /></Link>
      </div>
    </article>
  );
}
