import { Copy, FileText } from 'lucide-react';
import Button from './Button';
import { useToast } from './ToastNotification';

// Text read from the package (OCR output in the future). It is raw and may contain mistakes.
export default function ExtractedTextPanel({ text, demo }) {
  const toast = useToast();
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast('Package text copied.'); }
    catch { toast('Could not copy. Select the text and copy it manually.', 'info'); }
  };
  return (
    <div>
      <p className="hint" style={{ marginBottom: 12 }}>
        {demo ? 'Demo sample text, not read from your image. ' : ''}
        Text read from packaging can contain mistakes. Compare it with the physical box.
      </p>
      {text
        ? <pre className="extracted" tabIndex={0} aria-label="Extracted package text">{text}</pre>
        : <p className="unavailable"><FileText size={16} aria-hidden="true" /> No package text was extracted.</p>}
      {text && <Button variant="secondary" size="sm" icon={Copy} onClick={copy} style={{ marginTop: 12 }}>Copy text</Button>}
    </div>
  );
}
