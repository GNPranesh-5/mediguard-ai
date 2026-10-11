import { Link } from 'react-router-dom';
import { ImageOff, Trash2 } from 'lucide-react';
import VerificationBadge from './VerificationBadge';
import Button from './Button';
import ProtectedImage from './ProtectedImage';
import { formatDate } from '../utils/format';

export default function HistoryCard({ scan, onDelete }) {
  const medicineName = scan.medicineName ?? scan.medicine_name ?? 'Unidentified medicine';
  const scannedAt = scan.scannedAt ?? scan.scanned_at;
  const imageUrl = scan.imageUrl ?? scan.image_url;

  return (
    <article className="card history-card">
      <div className="history-card__thumb">
        {imageUrl ? <ProtectedImage src={imageUrl} alt={`Scanned package for ${medicineName}`} /> : <ImageOff size={24} aria-label="No image available" />}
      </div>
      <div className="history-card__body">
        <h3 className="med-card__title">{medicineName}</h3>
        <p className="muted med-card__meta">{formatDate(scannedAt)}</p>
        <VerificationBadge status={scan.status} />
        {scan.demo && <span className="badge badge--demo" style={{ marginLeft: 6 }}>Demo</span>}
      </div>
      <div className="med-card__actions">
        <Button variant="ghost" size="sm" icon={Trash2} onClick={() => onDelete(scan)} aria-label={`Delete scan of ${medicineName}`}>Delete</Button>
        <Link className="btn btn--secondary btn--sm" to={`/scan/${scan.id}`}>View result</Link>
      </div>
    </article>
  );
}
