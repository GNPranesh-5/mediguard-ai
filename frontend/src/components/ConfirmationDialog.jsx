import { useEffect, useRef } from 'react';
import Button from './Button';

// Accessible confirm dialog: focus moves in, Escape cancels, focus returns to the opener on close.
export default function ConfirmationDialog({ open, title, message, confirmLabel = 'Confirm', onConfirm, onCancel }) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    cancelRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previouslyFocused?.focus?.(); };
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-msg" onClick={(e) => e.stopPropagation()}>
        <h2 id="dlg-title" style={{ fontSize: 'var(--fs-lg)' }}>{title}</h2>
        <p id="dlg-msg" className="muted" style={{ marginBottom: 0 }}>{message}</p>
        <div className="dialog__actions">
          <button type="button" ref={cancelRef} className="btn btn--secondary" onClick={onCancel}>Cancel</button>
          <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
