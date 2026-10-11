import { useState, useEffect, useCallback } from 'react';
import { validateImage } from '../utils/validateImage';

// Manages ONE image slot (front or back): the chosen file, its preview URL and any validation error.
export function useImageUpload() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);

  // Free the temporary preview URL when it changes or the page closes (avoids memory leaks).
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const select = useCallback((newFile) => {
    const problem = validateImage(newFile);
    if (problem) { setError(problem); return false; }
    setError(null);
    setFile(newFile);
    setPreviewUrl(URL.createObjectURL(newFile));
    return true;
  }, []);

  const clear = useCallback(() => { setFile(null); setPreviewUrl(null); setError(null); }, []);
  return { file, previewUrl, error, select, clear };
}
