// AUTH SERVICE: register, log in, log out, get the current user.
//
//  DEMO_MODE true  -> accounts live in this browser's localStorage (NOT real security, see below).
//  DEMO_MODE false -> calls the future FastAPI endpoints:
//       POST /auth/register   POST /auth/login   POST /auth/logout   GET /auth/me
//
// Every function returns/throws the same shapes in both modes, so the pages do not care which is active.
import { DEMO_MODE } from '../config';
import { request } from './api';
import { ApiError } from './ApiError';
import { getSessionUserId, setSessionUserId, clearSessionUserId, getToken, setToken, clearToken } from './session';

const USERS_KEY = 'mediguard.demo.users';
const wait = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

/* ------------------------------------------------------------------ */
/* DEMO AUTH. For demonstration only. This is NOT real security:       */
/* everything is stored in the user's own browser, anyone with access  */
/* to the browser can read or edit it, and there is no server check.   */
/* We still never store the plain-text password: we store a random     */
/* salt and a SHA-256 hash of (salt + password) made with Web Crypto.  */
/* Real authentication (hashing with bcrypt/argon2, sessions/JWT,      */
/* rate limiting) must be done by the backend.                         */
/* ------------------------------------------------------------------ */
const readUsers = () => { try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; } catch { return []; } };
const writeUsers = (users) => localStorage.setItem(USERS_KEY, JSON.stringify(users));
const randomHex = (bytes = 16) => Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, '0')).join('');
const publicUser = ({ id, name, email }) => ({ id, name, email }); // never expose salt/hash to the UI
const normalizeEmail = (email) => email.trim().toLowerCase();

async function hashPassword(password, salt) {
  const text = `${salt}:${password}`;
  // crypto.subtle only exists on HTTPS or localhost. On plain http:// (e.g. testing from a phone over Wi-Fi)
  // we fall back to a simple non-cryptographic hash so the demo still works. Demo only.
  if (window.crypto?.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h1 = 0xdeadbeef; let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i += 1) { const c = text.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `fallback-${(h2 >>> 0).toString(16)}${(h1 >>> 0).toString(16)}`;
}

async function demoRegister({ name, email, password }) {
  await wait();
  const users = readUsers();
  const cleanEmail = normalizeEmail(email);
  if (users.some((u) => u.email === cleanEmail)) {
    throw new ApiError('An account with this email already exists. Try logging in.', { status: 409 });
  }
  const salt = randomHex();
  const user = { id: `u-${randomHex(8)}`, name: name.trim(), email: cleanEmail, salt, hash: await hashPassword(password, salt) };
  writeUsers([...users, user]);
  setSessionUserId(user.id);
  return { user: publicUser(user) };
}

async function demoLogin(email, password) {
  await wait();
  const user = readUsers().find((u) => u.email === normalizeEmail(email));
  // Same generic error whether the email or the password is wrong, so it does not reveal which emails exist.
  const fail = () => new ApiError('Email or password is incorrect.', { status: 401 });
  if (!user) throw fail();
  if ((await hashPassword(password, user.salt)) !== user.hash) throw fail();
  setSessionUserId(user.id);
  return { user: publicUser(user) };
}

/* ------------------------------------------------------------------ */
/* BACKEND AUTH (used when VITE_DEMO_MODE=false)                       */
/* ------------------------------------------------------------------ */
const postJson = (path, body) => request(path, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

async function remember(response) {
  if (response.token) setToken(response.token); // api.js adds it as "Authorization: Bearer <token>"
  return { user: response.user };
}

/* ------------------------------------------------------------------ */
/* PUBLIC FUNCTIONS                                                    */
/* ------------------------------------------------------------------ */

/** details: { name, email, password } -> { user, token } */
export async function registerUser(details) {
  if (DEMO_MODE) return demoRegister(details);
  return remember(await postJson('/auth/register', details));
}


/** -> { user } ; throws ApiError (status 401 = wrong credentials, pending = backend unreachable) */
export async function loginUser(email, password) {
  if (DEMO_MODE) return demoLogin(email, password);
  return remember(await postJson('/auth/login', { email, password }));
}

export async function logoutUser() {
  if (DEMO_MODE) { clearSessionUserId(); return; }
  try { await request('/auth/logout', { method: 'POST' }); } catch { /* still log out locally if the server is unreachable */ }
  clearToken();
}

/** Restores the session on page load. Returns the user object or null. */
export async function getCurrentUser() {
  if (DEMO_MODE) {
    const id = getSessionUserId();
    const user = readUsers().find((u) => u.id === id);
    return user ? publicUser(user) : null;
  }
  if (!getToken()) return null;
  try {
    const res = await request('/auth/me');
    return res?.user || res || null;
  } catch (err) {
    if (err.status === 401) clearToken(); // token expired or invalid
    return null;                          // backend unreachable: treat as logged out for now
  }
}
