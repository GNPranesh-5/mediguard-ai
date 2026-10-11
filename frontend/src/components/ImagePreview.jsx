import { X, RefreshCw } from 'lucide-react';
import Button from './Button';

// Shows the chosen image with Replace / Remove buttons. `onReplace` re-opens the file picker.
export default function ImagePreview({ src, label, fileName, onRemove, onReplace }) {
  return (
    <div className="preview">
      <div className="preview__frame">
        <img src={src} alt={`${label} preview: ${fileName || 'selected image'}`} />
      </div>
      <div className="preview__bar">
        <span className="preview__name" title={fileName}>{fileName}</span>
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onReplace}>Replace</Button>
        <Button variant="ghost" size="sm" icon={X} onClick={onRemove} aria-label={`Remove ${label}`}>Remove</Button>
      </div>
    </div>
  );
}
