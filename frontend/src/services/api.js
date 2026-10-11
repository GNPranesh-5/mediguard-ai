// API SERVICE LAYER: the only file pages/components use to get data.
//
// Each function either
//   - calls demoApi.js (sample data, when DEMO_MODE is true), or
//   - calls the real FastAPI backend with fetch (when DEMO_MODE is false).
// Pages never need to know which one is running, so connecting the backend means
// setting VITE_DEMO_MODE=false and making sure the endpoints below exist.
import { API_BASE_URL, DEMO_MODE } from '../config';
import * as demo from './demoApi';
import { ApiError } from './ApiError';
import { getToken, clearToken } from './session';

export { ApiError };

// Shared fetch wrapper: builds the URL, sends JSON or FormData, parses JSON, normalises errors.
export async function request(path, options = {}) {
  // If the user logged in against the backend, send their token with every request.
  const token = getToken();
  const headers = { ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError('The MediGuard backend is not connected yet.', { pending: true });
  }
  if (response.status === 501) {
    throw new ApiError('This backend endpoint is not available yet.', { status: response.status, pending: true });
  }
  // 401: token expired or revoked — clear it and notify the app to redirect to /login.
  if (response.status === 401) {
    clearToken();
    window.dispatchEvent(new CustomEvent('mediguard:session-expired'));
    let detail = 'Your session has expired. Please log in again.';
    try { detail = (await response.json()).detail || detail; } catch { /* body was not JSON */ }
    throw new ApiError(detail, { status: 401, sessionExpired: true });
  }
  if (!response.ok) {
    let detail = 'Something went wrong on the server.';
    try { detail = (await response.json()).detail || detail; } catch { /* body was not JSON */ }
    throw new ApiError(detail, { status: response.status });
  }
  return response.status === 204 ? null : response.json();
}

/** POST /api/analyze
 * Multipart upload: file
 * Returns the medicine analysis response.
 */
export function analyzeMedicine({ frontFile, backFile, frontThumb }) {
  if (DEMO_MODE) {
    return demo.analyzeMedicine({ frontThumb });
  }

  const body = new FormData();

  // The backend expects the field name "file" for front image, and optional "back_file".
  body.append('file', frontFile);
  if (backFile) {
    body.append('back_file', backFile);
  }

  return request('/api/analyze', {
    method: 'POST',
    body,
  });
}


/** GET /api/medicines/search?q=&strength= -> { results: Medicine[] } */
export function searchMedicines(query, strength = '') {
  if (DEMO_MODE) return demo.searchMedicines(query, strength);
  const params = new URLSearchParams({ q: query });
  if (strength) params.set('strength', strength);
  return request(`/api/medicines/search?${params}`);
}

/** POST /api/medicines/search-ai -> { results: [AIMedicine] }
 * Called when the DB search returns nothing. Asks MedGemma to synthesise
 * information for the query. Returns at most one AI-generated result.
 */
export function searchAIMedicine(query, strength = '') {
  if (DEMO_MODE) return demo.searchMedicines(query, strength);
  return request('/api/medicines/search-ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, strength }),
  });
}

/** POST /api/saved/ai -> 204
 * Creates a Medicine row from an AI-generated result object and saves it.
 * Used when the medicine has no existing DB record.
 */
export function saveAIMedicine(medicineData) {
  if (DEMO_MODE) return demo.saveMedicine(medicineData.id);
  return request('/api/saved/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(medicineData),
  });
}

/** GET /api/medicines/{id} -> Medicine */
export function getMedicineDetails(id) {
  if (DEMO_MODE) return demo.getMedicineDetails(id);
  return request(`/api/medicines/${encodeURIComponent(id)}`);
}

/** GET /api/scans -> { scans: Scan[] } */
export function getScanHistory() {
  if (DEMO_MODE) return demo.getScanHistory();
  return request('/api/scans');
}

/** GET /api/scans/{id} -> { scan, medicine } */
export function getScan(id) {
  if (DEMO_MODE) return demo.getScan(id);
  return request(`/api/scans/${encodeURIComponent(id)}`);
}

/** DELETE /api/scans/{id} -> 204 */
export function deleteScan(id) {
  if (DEMO_MODE) return demo.deleteScan(id);
  return request(`/api/scans/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** GET /api/saved -> { medicines: Medicine[] } */
export function getSavedMedicines() {
  if (DEMO_MODE) return demo.getSavedMedicines();
  return request('/api/saved');
}

/** PUT /api/saved/{id} -> 204 */
export function saveMedicine(id) {
  if (DEMO_MODE) return demo.saveMedicine(id);
  return request(`/api/saved/${encodeURIComponent(id)}`, { method: 'PUT' });
}

/** DELETE /api/saved/{id} -> 204 */
export function removeSavedMedicine(id) {
  if (DEMO_MODE) return demo.removeSavedMedicine(id);
  return request(`/api/saved/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
