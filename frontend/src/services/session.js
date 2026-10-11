// Tiny storage helpers for the login session. Kept in one file with NO imports so that
// both authService.js and demoApi.js can use it without circular imports.
// To move from localStorage to cookies later, only this file needs to change.
const SESSION_KEY = 'mediguard.demo.session'; // demo mode: { userId }
const TOKEN_KEY = 'mediguard.token';          // backend mode: bearer token returned by the API

export function getSessionUserId() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY))?.userId || null; } catch { return null; }
}
export const setSessionUserId = (userId) => localStorage.setItem(SESSION_KEY, JSON.stringify({ userId }));
export const clearSessionUserId = () => localStorage.removeItem(SESSION_KEY);

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);
