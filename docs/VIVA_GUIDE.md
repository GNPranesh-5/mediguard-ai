# Frontend viva guide

## 1. The one-minute explanation
A single-page React app built with Vite. React Router swaps pages without reloading. Pages get data only through `src/services/api.js`, which either returns sample data (demo mode) or calls a FastAPI server with `fetch`. Because pages never call `fetch` themselves, the backend can be connected later without changing the UI.

## 2. Flow of a request (scan)
`ScannerPage` -> user picks file -> `useImageUpload.select` validates (`validateImage`) and makes a preview URL -> **Analyze** calls `handleAnalyze` -> `analyzeMedicine()` in `api.js` -> demo: `demoApi.js` waits 1.8 s and returns a fixed sample; backend: `POST /api/analyze` -> `navigate('/scan/<id>')` -> `ResultPage` loads with `getScan(id)`.

## 3. React concepts used (and where)
- **useState**: form values, loading status, errors (`SearchPage`, `ScannerPage`, `ExpandableSection`).
- **useEffect**: close menu on route change (`Navbar`), revoke preview URLs (`useImageUpload`), apply theme to `<html>` (`useSettings`), keyboard handling in `ConfirmationDialog`.
- **useRef**: reach hidden file inputs to open the picker (`UploadDropzone`), focus the dialog button.
- **useMemo**: filtered history list (`HistoryPage`).
- **useCallback**: stable functions in `useAsync`, `useImageUpload`.
- **useId**: unique ids linking labels/regions (accessibility).
- **useContext + Provider**: `SettingsProvider` (theme) and `ToastProvider` so any component can call `useToast()` without passing props down.
- **Custom hooks**: `useAsync(loader, deps)` returns `{status, data, error, reload}`; this one hook gives every page the same loading/error/success handling.
- **Props**: components are configured by props (`Button variant="primary" icon={Search}`); the parent owns state, children receive values and callbacks ("lifting state up", e.g. `UploadDropzone`).
- **Controlled inputs**: `value` + `onChange` keep the input and state in sync (`SearchInput`).
- **Conditional rendering and lists**: `{cond && <X/>}`, `.map()` with a `key`.

## 4. Routing
`App.jsx` lists `<Route path element>`. `MainLayout` is a layout route: it renders navbar/footer and `<Outlet/>` where the matched page appears. `:scanId` and `:id` are read with `useParams`. `NavLink` adds the `active` class. `*` is the 404 page. `ResultPage` is reused for two routes through the `source` prop.

## 5. Form validation
`validateImage` (type in JPEG/PNG/WebP, size up to 8 MB, not empty) runs on select and on drop. `SearchPage` requires 2 or more characters. Errors appear next to the field with `role="alert"`. Backend must validate again because browser checks can be bypassed.

## 6. API service layer
`request()` wraps `fetch`: builds the URL from `API_BASE_URL`, turns network failures and 404/501 into `ApiError` with `pending: true`, turns other non-OK responses into messages from `detail`. `ErrorState` shows "Backend integration pending" when `pending` is true. `FormData` is used for file upload (the browser sets the multipart header itself, so do not set Content-Type).

## 7. Responsive CSS
Mobile-first thinking with tokens in `tokens.css`; `clamp()` for fluid headings; CSS Grid for layouts that collapse at 960 px and 640 px in `pages.css`; below 820 px the top links become a hamburger plus a fixed bottom tab bar (thumb reach); `env(safe-area-inset-bottom)` for iPhone home bar; buttons are 44 px tall minimum for touch.

## 8. Animation
Framer Motion: `motion.div` with `initial/animate` (hero), `variants` with `staggerChildren` (feature cards), `AnimatePresence` for exit animations (menu, accordion, toasts, page fade). `MotionConfig reducedMotion="user"` and a CSS `prefers-reduced-motion` rule disable motion for users who request it.

## 9. Accessibility features to mention
Skip link, semantic landmarks (`header`, `nav`, `main`, `aside`), labelled inputs, `aria-expanded` on accordions, `role="alertdialog"` with focus return and Escape, `aria-live` toasts, visible focus ring, alt text on previews, no hover-only actions.

## 10. Honest-by-design decisions (likely viva questions)
- *Why does demo mode show the same medicine for any image?* Because no model runs. The UI says so in the banner, progress screen and result page.
- *Why are some fields "Information unavailable"?* Unknown data is `null` and never invented; this matters in a medical context.
- *Why five statuses?* To separate OCR text, AI guesses and reference-matched data (see About page).
- *Why no Redux?* State is local to pages; two small contexts are enough.

## 11. Pre-demo checklist (not yet performed for you)
- [ ] `npm run dev` opens the landing page; every nav link works.
- [ ] Upload JPG: preview, replace, remove. Upload a PDF or file over 8 MB: error appears.
- [ ] Analyze shows demo progress, then result with the "Demo sample" notice.
- [ ] Search "paracetamol", "xyz" (empty state), 1 character (validation).
- [ ] Save, then see it under Saved; remove it. History shows scan; delete asks for confirmation.
- [ ] Resize to 360, 390, 768, 1024, 1440 px: no sideways scrolling.
- [ ] Set `VITE_DEMO_MODE=false` with no backend: pages show "Backend integration pending".
- [ ] Dark theme and larger text in Settings.

---

# Added: authentication and live camera

## Authentication
- **Context + hook:** `AuthProvider` (in `main.jsx`) holds `user` in state and exposes it with `useAuth()`. On first load it calls `getCurrentUser()` so a refresh keeps you logged in; `isLoading` prevents a flash of the login page.
- **ProtectedRoute:** a layout route that renders `<Outlet/>` (the real page) when logged in, otherwise `<Navigate to="/login" state={{ from: location }}/>`. The login page reads `location.state.from` to send the user back.
- **Why a salted hash in demo mode?** To avoid storing plain passwords even in a demo. SHA-256 via Web Crypto is fast and not suitable for real password storage, and everything is in the user's own browser, so this is not security. A real backend uses bcrypt/argon2, rate limiting and server sessions or JWT. On plain `http://` Web Crypto is unavailable, so a simple fallback hash is used (also demo only).
- **Generic login error:** the same message for a wrong email or a wrong password, so attackers cannot discover which emails exist.
- **Demo vs backend:** same function names and return shapes in both modes. Backend mode uses `request()` from `api.js`, which adds `Authorization: Bearer <token>`.
- **Per-user demo data:** `demoApi.js` builds its localStorage keys from the signed-in user id.
- **Bug found while testing:** `MainLayout` rendered `<Outlet/>` inside a fading page wrapper, which could remount the next page and wipe typed form text. It now captures the page with `useOutlet()`. This also meant `ProtectedRoute` and the login redirect had to ignore changes that happen while a page is fading out (`useRef` snapshots).

## Camera
- `useCamera` calls `navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })`, attaches the stream to `<video autoPlay playsInline muted>` (required on iPhone Safari), and stops every track in the effect cleanup.
- Capture draws the video frame on a `<canvas>` and `canvas.toBlob(..., 'image/jpeg', 0.9)` makes a `File`.
- Requires a **secure context** (HTTPS or localhost); that is why the dialog explains it on plain http.
- Dialog accessibility: `role="dialog"`, `aria-modal`, focus trap (Tab), Escape closes, focus returns to the Take photo button, status text in an `aria-live` region.

## Extra test checklist
- [ ] Register, then Log out, then Log in; refresh stays logged in.
- [ ] Visit `/history` while logged out: goes to login, then returns to `/history`.
- [ ] Two accounts do not see each other's history or saved items.
- [ ] Take photo on a laptop webcam and on a phone (HTTPS): preview, Capture, Retake, Use photo; camera light turns off after closing.
- [ ] Block camera permission: message and "Use file picker instead" work.
