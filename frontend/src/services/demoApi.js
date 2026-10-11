// DEMO IMPLEMENTATION of the API functions. Never talks to a server.
// History and saved items are kept in the browser's localStorage so the flow can be demonstrated.
// IMPORTANT: analyzeMedicine here does NOT analyse the image. It returns a fixed sample record
// so the result screen can be shown. The UI labels this clearly as demo output.
import { DEMO_MEDICINES } from '../data/demoData';
import { ApiError } from './ApiError';
import { getSessionUserId } from './session';

// Keys are per user, so different demo accounts do not see each other's history or saved medicines.
const scope = () => getSessionUserId() || 'guest';
const historyKey = () => `mediguard.demo.history.${scope()}`;
const savedKey = () => `mediguard.demo.saved.${scope()}`;

const wait = (ms = 700) => new Promise((resolve) => setTimeout(resolve, ms));
const read = (key) => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } };
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const findMedicine = (id) => DEMO_MEDICINES.find((m) => m.id === id);

export async function analyzeMedicine({ frontThumb }) {
  await wait(1800);
  const medicine = DEMO_MEDICINES[0];
  const scan = {
    id: `scan-${Date.now()}`,
    scannedAt: new Date().toISOString(),
    medicineId: medicine.id,
    medicineName: medicine.name,
    status: 'needs_review',
    imageUrl: frontThumb || null,
    demo: true,
  };
  try { write(historyKey(), [scan, ...read(historyKey())]); }
  catch { /* storage full: still show the result, just skip saving history */ }
  return { scan, medicine };
}

export async function searchMedicines(query, strength = '') {
  await wait(450);
  const q = query.trim().toLowerCase();
  const s = strength.trim().toLowerCase();
  const results = DEMO_MEDICINES.filter((m) => {
    const haystack = [m.name, m.brandName, m.genericName, ...m.activeIngredients.map((i) => i.name)].join(' ').toLowerCase();
    return haystack.includes(q) && (!s || (m.strength || '').toLowerCase().includes(s));
  });
  return { results };
}

export async function getMedicineDetails(id) {
  await wait(300);
  const medicine = findMedicine(id);
  if (!medicine) throw new ApiError('No medicine with this ID exists in the demo data.', { status: 404 });
  return medicine;
}

export async function getScanHistory() {
  await wait(250);
  return { scans: read(historyKey()) };
}

export async function getScan(id) {
  await wait(250);
  const scan = read(historyKey()).find((s) => s.id === id);
  if (!scan) throw new ApiError('This scan is no longer in the demo history.', { status: 404 });
  return { scan, medicine: findMedicine(scan.medicineId) };
}

export async function deleteScan(id) {
  await wait(200);
  write(historyKey(), read(historyKey()).filter((s) => s.id !== id));
  return null;
}

export async function getSavedMedicines() {
  await wait(250);
  const ids = read(savedKey());
  return { medicines: ids.map(findMedicine).filter(Boolean) };
}

export async function saveMedicine(id) {
  const ids = read(savedKey());
  if (!ids.includes(id)) write(savedKey(), [id, ...ids]);
  return null;
}

export async function removeSavedMedicine(id) {
  write(savedKey(), read(savedKey()).filter((x) => x !== id));
  return null;
}

// Used by Settings: clears the current user's demo history and saved list.
export function clearDemoUserData() {
  localStorage.removeItem(historyKey());
  localStorage.removeItem(savedKey());
}
