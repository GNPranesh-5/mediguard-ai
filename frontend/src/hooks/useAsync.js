import { useState, useEffect, useCallback } from 'react';

// Runs an async loader (an API call) and tracks loading / error / data in one place.
// status is one of: 'loading' | 'success' | 'error'. Call reload() to run it again.
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  const run = useCallback(() => {
    let cancelled = false;
    setState((s) => ({ ...s, status: 'loading', error: null }));
    loader()
      .then((data) => { if (!cancelled) setState({ status: 'success', data, error: null }); })
      .catch((error) => { if (!cancelled) setState({ status: 'error', data: null, error }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    return run();
  }, [run]);
  return { ...state, reload: run };
}
