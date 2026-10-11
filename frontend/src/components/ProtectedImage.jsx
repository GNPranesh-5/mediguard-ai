import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { getToken } from '../services/session';
import { ImageOff } from 'lucide-react';

export default function ProtectedImage({ src, alt, className, fallbackIconSize = 24 }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) {
      setBlobUrl(null);
      setError(false);
      return;
    }

    // Direct data or local blob URLs do not need backend fetching
    if (src.startsWith('blob:') || src.startsWith('data:')) {
      setBlobUrl(src);
      setError(false);
      return;
    }

    let isMounted = true;
    let createdUrl = null;

    const fullUrl = src.startsWith('http') ? src : `${API_BASE_URL}${src}`;
    const token = getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(fullUrl, { headers })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (isMounted) {
          createdUrl = URL.createObjectURL(blob);
          setBlobUrl(createdUrl);
          setError(false);
        }
      })
      .catch(() => {
        if (isMounted) setError(true);
      });

    return () => {
      isMounted = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [src]);

  // Clean up active blobUrl when component unmounts or blobUrl updates
  useEffect(() => {
    return () => {
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  if (error || (!blobUrl && src)) {
    return <ImageOff size={fallbackIconSize} aria-label="Image unreadable or access denied" />;
  }

  if (!blobUrl) return null;

  return <img className={className} src={blobUrl} alt={alt} />;
}
