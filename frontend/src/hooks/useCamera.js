import { useRef, useState, useCallback, useEffect } from 'react';

// Manages a live camera stream. It starts when the component using it mounts and ALWAYS stops
// every track when that component unmounts (dialog closed, route changed, etc.), so the camera light turns off.
//
// status:    'requesting' (waiting for permission) | 'live' | 'error'
// errorCode: 'insecure' | 'unsupported' | 'denied' | 'notfound' | 'inuse' | 'unknown'
export function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const requestId = useRef(0); // lets us ignore a stream that arrives after the dialog was closed
  const [status, setStatus] = useState('requesting');
  const [errorCode, setErrorCode] = useState(null);
  const [canSwitch, setCanSwitch] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const start = useCallback(async (deviceId) => {
    const id = ++requestId.current;
    stop();
    setStatus('requesting');
    setErrorCode(null);

    const fail = (code) => { setErrorCode(code); setStatus('error'); };
    if (!window.isSecureContext) return fail('insecure');                       // needs HTTPS or localhost
    if (!navigator.mediaDevices?.getUserMedia) return fail('unsupported');

    try {
      const video = deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: 'environment' } };
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
      if (id !== requestId.current) { stream.getTracks().forEach((t) => t.stop()); return; } // closed meanwhile
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {}); // autoplay attribute normally handles this
      }
      // Device labels/ids are only available after permission was granted.
      const inputs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
      if (id === requestId.current) { setCanSwitch(inputs.length > 1); setStatus('live'); }
    } catch (err) {
      if (id !== requestId.current) return;
      const map = { NotAllowedError: 'denied', SecurityError: 'denied', PermissionDeniedError: 'denied', NotFoundError: 'notfound', DevicesNotFoundError: 'notfound', OverconstrainedError: 'notfound', NotReadableError: 'inuse', TrackStartError: 'inuse', AbortError: 'inuse' };
      fail(map[err.name] || 'unknown');
    }
  }, [stop]);

  // Move to the next camera in the list (front <-> back).
  const switchCamera = useCallback(async () => {
    const inputs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
    const currentId = streamRef.current?.getVideoTracks()[0]?.getSettings().deviceId;
    const index = inputs.findIndex((d) => d.deviceId === currentId);
    const next = inputs[(index + 1) % inputs.length];
    if (next) start(next.deviceId);
  }, [start]);

  useEffect(() => {
    start();
    return () => { requestId.current += 1; stop(); }; // cleanup = unmount
  }, [start, stop]);

  return { videoRef, status, errorCode, canSwitch, start, stop, switchCamera };
}
