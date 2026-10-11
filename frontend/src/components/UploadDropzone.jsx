import { useRef, useState, useId } from 'react';
import { ImagePlus, Camera, UploadCloud } from 'lucide-react';
import Button from './Button';
import ImagePreview from './ImagePreview';
import CameraCaptureDialog from './CameraCaptureDialog';
import { IMAGE_RULES } from '../config';

// One upload slot. The parent owns the state (via useImageUpload) and passes it in as props:
//   file, previewUrl, error  -> what to show
//   onSelect(file), onRemove -> what to do when the user acts
export default function UploadDropzone({ label, optional = false, file, previewUrl, error, onSelect, onRemove }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const rootRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false); // live camera dialog
  const helpId = useId();
  const errorId = useId();
  // Camera button only makes sense on touch devices; desktop users just use "Choose image".
  // Also show it on laptops/desktops that can open a webcam (the camera dialog handles errors and offers the file picker).
  const hasTouch = typeof navigator !== 'undefined' && (navigator.maxTouchPoints > 0 || !!navigator.mediaDevices?.getUserMedia);

  const handleFiles = (list) => { if (list && list[0]) onSelect(list[0]); };
  const handleDrop = (e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); };
  const handleInputChange = (e) => { handleFiles(e.target.files); e.target.value = ''; }; // reset so the same file can be re-picked

  return (
    <div className="upload" ref={rootRef}>
      <p className="label">{label}{optional && <span className="muted"> (optional)</span>}</p>

      {/* hidden inputs: one normal, one that opens the camera on phones (capture="environment") */}
      <input ref={fileInputRef} type="file" accept={IMAGE_RULES.allowedTypes.join(',')} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={handleInputChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={handleInputChange} />

      {previewUrl ? (
        <ImagePreview src={previewUrl} label={label} fileName={file?.name} onRemove={onRemove} onReplace={() => fileInputRef.current.click()} />
      ) : (
        <div
          className={`dropzone${dragging ? ' dropzone--drag' : ''}${error ? ' dropzone--error' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <UploadCloud size={32} aria-hidden="true" />
          <p className="dropzone__title">{dragging ? 'Drop the image here' : 'Drag a photo here'}</p>
          <p className="hint" id={helpId}>{IMAGE_RULES.allowedLabel}, up to {IMAGE_RULES.maxLabel}</p>
          <div className="dropzone__buttons">
            <Button variant="secondary" icon={ImagePlus} onClick={() => fileInputRef.current.click()} aria-describedby={helpId}>Choose image</Button>
            {hasTouch && <Button variant="secondary" icon={Camera} onClick={() => setCameraOpen(true)}>Take photo</Button>}
          </div>
        </div>
      )}
      {error && <p className="error-text" id={errorId} role="alert">{error}</p>}

      {cameraOpen && (
        <CameraCaptureDialog
          label={label}
          returnFocusRef={rootRef}
          onCapture={onSelect /* same validation + preview path as an uploaded file */}
          onClose={() => setCameraOpen(false)}
          onFallback={() => { setCameraOpen(false); cameraInputRef.current.click(); /* existing capture="environment" input */ }}
        />
      )}
    </div>
  );
}
