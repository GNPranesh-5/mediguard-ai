// Single place for frontend configuration. Values come from the .env file (see .env.example).
// Vite exposes only variables that start with VITE_ through import.meta.env.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001').replace(/\/$/, '');

// Demo mode is ON unless VITE_DEMO_MODE is exactly "false".
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== 'false';

export const IMAGE_RULES = {
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedLabel: 'JPG, PNG or WebP',
  maxBytes: 8 * 1024 * 1024,
  maxLabel: '8 MB',
};
