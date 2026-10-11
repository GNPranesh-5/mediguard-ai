import { useEffect } from 'react';

// Sets the browser tab title for each page (also helps screen-reader users know where they are).
export function useDocumentTitle(title) {
  useEffect(() => { document.title = title ? `${title} | MediGuard AI` : 'MediGuard AI'; }, [title]);
}
