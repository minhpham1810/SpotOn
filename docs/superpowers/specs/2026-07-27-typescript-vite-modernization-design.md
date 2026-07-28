# SpotOn: TypeScript rewrite + dependency modernization

Date: 2026-07-27
Status: Approved

## Goal

Convert the SpotOn React app from JavaScript/JSX to TypeScript, and modernize its
build tooling and dependencies. This is a tooling/types/dependency pass only —
no functional or UI behavior changes.

## Context

- Current stack: Create React App (`react-scripts` 5.0.1), React 19, React Router
  6.30, Tailwind CSS 3.3, Jest (via react-scripts) + Testing Library.
- `react-scripts`/CRA is deprecated and unmaintained, and already has peer-dependency
  friction with React 19.
- App is hosted on Vercel.
- `npm outdated` shows several stale packages (see Dependency updates below).
- Two dependencies are dead code:
  - `@google/generative-ai` — unused. `src/api/GeminiAPI.js` already talks to
    Groq's REST API directly via `fetch`, not this SDK (a prior refactor moved
    off Gemini but didn't remove the now-unused package).
  - `express-session` — unused. There is no backend server in this repo
    (confirmed: no server entrypoint, only `nginx/default.conf` for static
    serving); this is a stray dependency.
- Source is small: 17 JS/JSX files under `src/` (2 API modules, ~10 components,
  1 context, entry point, tests).

## Scope boundary

No functional or UI changes. Existing component behavior, styling, and the
Spotify PKCE auth flow stay exactly as they are today — just typed, and on
current tooling. No new features.

## Design

### 1. Build tooling: CRA → Vite

Replace `react-scripts` with Vite (`@vitejs/plugin-react`) and
`@tailwindcss/vite`.

- `index.html` moves from `public/` to the project root, with a
  `<script type="module" src="/src/main.tsx">` entry point (Vite convention).
  `src/index.js` is renamed/replaced by `src/main.tsx`.
- `public/favicon.ico`, `public/manifest.json`, `public/robots.txt` stay in
  `public/` and continue to be served as static assets automatically.
- Env vars rename `REACT_APP_*` → `VITE_*`:
  - `REACT_APP_SPOTIFY_CLIENT_ID` → `VITE_SPOTIFY_CLIENT_ID`
  - `REACT_APP_SPOTIFY_REDIRECT_URI` → `VITE_SPOTIFY_REDIRECT_URI`
  - `REACT_APP_GROQ_API_KEY` → `VITE_GROQ_API_KEY`
  - Code reads them via `import.meta.env.VITE_*` instead of
    `process.env.REACT_APP_*`.
- Build output directory changes from `build/` → `dist/` (Vite default).
- `Dockerfile` updated: build args/env renamed to the `VITE_*` names above
  (also fixing the existing mismatch where the Dockerfile still passes
  `REACT_APP_GEMINI_API_KEY`, which nothing reads anymore since the Groq
  switch), and the copy stage points at `dist/` instead of `build/`.
- `.github/workflows/ci-cd.yml` updated: `--build-arg` names updated to match
  the new `VITE_*` names.
- `nginx/default.conf` unchanged in behavior (still serves static files with
  SPA fallback to `index.html`); kept for parity in case the Docker/nginx path
  is still used.
- Add a minimal `vercel.json` with an SPA rewrite (`"/(.*)" → "/index.html"`)
  so Vercel's native static/Vite deployment works directly without depending
  on the Docker image.

### 2. Language: JS/JSX → TypeScript

All `.js`/`.jsx` files under `src/` convert to `.ts`/`.tsx`:

- `src/api/SpotifyAPI.js` → `.ts`, with typed shapes for track search results,
  track details, playlist creation payloads/responses (`SpotifyTrack`, etc.).
- `src/api/GeminiAPI.js` → `.ts`, with a typed `SongInfo` result shape matching
  the JSON structure it already prompts for (summary, musicalAnalysis, genre,
  culturalContext, credits, highlights).
- All components (`App`, `SearchBar`, `SearchResults`, `Playlist`,
  `SongDetails`, `Login`, `LoadingSpinner`, `Toast`, `Track`, `Tracklist`) get
  explicit prop interfaces.
- `src/contexts/ToastContext.jsx` → `.tsx`, with a typed context value and
  `Toast` shape.
- `tsconfig.json` added with `strict: true`.
- No behavior changes — this is a straight typing pass over existing logic
  (auth flow, search, playlist add/remove, song detail fetch all stay as-is).

### 3. Testing: Jest (react-scripts) → Vitest

- Add `vitest`, keep `@testing-library/react` and `@testing-library/jest-dom`
  (both updated to latest).
- `src/setupTests.js` → `src/setupTests.ts`, using Vitest's `expect.extend`
  wiring for jest-dom matchers.
- `src/App.test.js` → `src/App.test.tsx`, updated for Vitest's `vi`/`expect`
  APIs (mechanical Jest→Vitest syntax changes only, same assertions).
- `npm test` script points at `vitest`.

### 4. Dependency updates

Updated to latest:
- `react-router-dom` 6.30 → 7.x (routing API used — `BrowserRouter`, `Routes`,
  `Route`, `useNavigate`, `useLocation`, `Navigate` — is unchanged in v7)
- `tailwindcss` 3.3 → 4.x via `@tailwindcss/vite` plugin; drops
  `tailwind.config.js` in favor of CSS-first config (`@import "tailwindcss"` +
  `@theme` block for the existing custom colors/fonts). `postcss` and
  `autoprefixer` are dropped if no longer required under Tailwind v4's Vite
  plugin (Tailwind v4 handles vendor prefixing internally).
- `react` / `react-dom` → latest 19.2.x
- `@testing-library/dom`, `@testing-library/jest-dom`, `@testing-library/react`
  → latest
- `@testing-library/user-event` 13.5.0 → latest 14.x (note: v14's API is
  async-first — `userEvent.click()` etc. return promises — so any existing
  test usage is updated accordingly)
- `web-vitals` 2.1.4 → latest 6.x (check for API changes in
  `src/reportWebVitals`)
- `js-sha256` 0.11.1 → 1.0.0

Removed (dead dependencies, not just updated):
- `@google/generative-ai`
- `express-session`

## Testing/verification plan

- `npm run build` produces a working Vite production build.
- `npm test` (Vitest) passes with the converted test file.
- `npx tsc --noEmit` passes with no type errors under `strict: true`.
- Manual smoke test of the app in the browser: login redirect, Spotify OAuth
  callback, search, add/remove playlist tracks, song detail view (Groq-backed
  summary), logout — confirming no behavioral regressions from the rewrite.
