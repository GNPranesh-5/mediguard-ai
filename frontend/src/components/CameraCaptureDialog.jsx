import { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCcw, SwitchCamera, X, Check, FolderOpen, AlertTriangle } from 'lucide-react';
import Button from './Button';
import { useCamera } from '../hooks/useCamera';

const ERROR_TEXT = {
  denied: { title: 'Camera permission is blocked', body: 'Allow camera access for this site: click the camera or lock icon in the address bar (or open your browser or phone Settings, then Site permissions), set Camera to Allow, and reload the page.' },
  notfound: { title: 'No camera found', body: 'This device has no usable camera. You can pick a photo from your files instead.' },
  inuse: { title: 'The camera is busy', body: 'Another app or browser tab may be using the camera. Close it and try again, or pick a photo from your files.' },
  insecure: { title: 'Camera needs a secure connection', body: 'Browsers only allow the camera on HTTPS or on localhost. Open this site over HTTPS, or pick a photo from your files.' },
  unsupported: { title: 'This browser cannot open the camera', body: 'Try an up-to-date Chrome, Edge, Firefox or Safari, or pick a photo from your files.' },
  unknown: { title: 'The camera could not start', body: 'Something went wrong while opening the camera. Try again, or pick a photo from your files.' },
};

// Modal with a live camera preview. Flow: live preview -> Capture -> review still -> "Use photo" (or Retake).
// Props: label ("Front of package"), onCapture(file) gets a JPEG File, onClose(), onFallback() opens the normal file picker,
//        returnFocusRef = element to focus on close if the original button no longer exists.
export default function CameraCaptureDialog({ label, onCapture, onClose, onFallback, returnFocusRef }) {
  const { videoRef, status, errorCode, canSwitch, start, stop, switchCamera } = useCamera();
  const dialogRef = useRef(null);
  const canvasRef = useRef(null);
  const [still, setStill] = useState(null);      // { file, url } while reviewing a captured frame
  const [captureError, setCaptureError] = useState('');

  // Focus handling: focus the dialog when it opens, give focus back when it closes.
  useEffect(() => {
    const opener = document.activeElement;
    dialogRef.current?.focus();
    return () => {
      const target = opener?.isConnected ? opener : returnFocusRef?.current?.querySelector('button');
      target?.focus?.();
    };
  }, [returnFocusRef]);

  // Free the review image URL when it changes or the dialog closes.
  useEffect(() => {
    return () => {
      if (still?.url) URL.revokeObjectURL(still.url);
    };
  }, [still]);

  const close = () => { stop(); onClose(); };

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) { setCaptureError('The camera is not ready yet. Wait a moment and try again.'); return; }
    setCaptureError('');
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) { setCaptureError('Could not capture the photo. Please try again.'); return; }
      const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      stop(); // switch the camera off while reviewing
      setStill({ file, url: URL.createObjectURL(blob) });
    }, 'image/jpeg', 0.9);
  };

  const retake = () => { setStill(null); start(); };
  const usePhoto = () => { onCapture(still.file); close(); };

  // Escape closes; Tab is kept inside the dialog (focus trap).
  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const items = [...dialogRef.current.querySelectorAll('button:not([disabled])')];
    if (!items.length) return;
    const first = items[0]; const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const message = ERROR_TEXT[errorCode];
  const statusText = still ? 'Photo captured. Review it, then use it or retake.'
    : status === 'requesting' ? 'Waiting for camera permission. Choose Allow in your browser prompt.'
    : status === 'live' ? 'Camera is live.' : '';

  return (
    <div className="dialog-backdrop" onClick={close}>
      <div className="dialog camera-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="cam-title" tabIndex={-1} onKeyDown={onKeyDown} onClick={(e) => e.stopPropagation()}>
        <h2 id="cam-title" style={{ fontSize: 'var(--fs-lg)' }}>Take a photo: {label}</h2>
        <p className="hint">Hold the label flat, in good light, and avoid glare.</p>
        <div className="sr-only" role="status" aria-live="polite">{statusText}</div>

        {status === 'error' && !still && (
          <div className="camera-error" role="alert">
            <AlertTriangle size={28} aria-hidden="true" />
            <h3>{message.title}</h3>
            <p>{message.body}</p>
            <div className="camera-controls">
              <Button icon={FolderOpen} onClick={onFallback}>Use file picker instead</Button>
              {errorCode !== 'insecure' && errorCode !== 'unsupported' && <Button variant="secondary" icon={RefreshCcw} onClick={() => start()}>Try again</Button>}
              <Button variant="ghost" onClick={close}>Cancel</Button>
            </div>
          </div>
        )}

        {status !== 'error' && (
          <>
            <div className="camera-stage">
              {/* playsInline + muted + autoPlay are required for the preview to play on iPhone Safari */}
              <video ref={videoRef} autoPlay playsInline muted aria-label="Live camera preview" className={status === 'live' && !still ? '' : 'camera-hidden'} />
              {still && <img src={still.url} alt="Captured photo preview" />}
              {status === 'requesting' && !still && <p className="camera-wait"><span className="spinner" aria-hidden="true" /> Waiting for camera permission…</p>}
            </div>
            {captureError && <p className="error-text" role="alert">{captureError}</p>}
            <div className="camera-controls">
              {still ? (
                <>
                  <Button icon={Check} onClick={usePhoto}>Use photo</Button>
                  <Button variant="secondary" icon={RefreshCcw} onClick={retake}>Retake</Button>
                </>
              ) : (
                <>
                  <Button icon={Camera} onClick={capture} disabled={status !== 'live'} aria-label="Capture photo">Capture</Button>
                  {canSwitch && <Button variant="secondary" icon={SwitchCamera} onClick={switchCamera} aria-label="Switch camera">Switch camera</Button>}
                </>
              )}
              <Button variant="ghost" icon={X} onClick={close} aria-label="Cancel and close camera">Cancel</Button>
            </div>
          </>
        )}
        <canvas ref={canvasRef} hidden />
      </div>
    </div>
  );
}
