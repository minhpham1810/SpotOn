# TypeScript + Vite Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert SpotOn from JS/JSX + Create React App to TypeScript + Vite, swap Jest for Vitest, upgrade Tailwind to v4 and React Router to v7, and remove two dead dependencies — with zero functional/UI behavior changes.

**Architecture:** Convert source files to TypeScript incrementally while still running on the existing CRA toolchain (react-scripts supports mixed `.js`/`.ts` out of the box), verifying `tsc --noEmit` and `npm run build` after every task. Once 100% of `src/` is TypeScript, do one atomic toolchain cutover from CRA to Vite (+ Tailwind v4 + Vitest), then finish with dependency cleanup and deploy-config updates (Dockerfile, CI, Vercel).

**Tech Stack:** React 19, TypeScript 5, Vite 6, Vitest, Tailwind CSS 4, React Router 7, Vercel.

## Global Constraints

- No functional or UI behavior changes — this is a tooling/types/dependency pass (per spec `docs/superpowers/specs/2026-07-27-typescript-vite-modernization-design.md`).
- `tsconfig.json` uses `strict: true`.
- Env vars rename `REACT_APP_*` → `VITE_*`, read via `import.meta.env.VITE_*`.
- Remove dead dependencies: `@google/generative-ai`, `express-session`.
- Build output directory changes `build/` → `dist/` (Vite default) — Dockerfile/CI must track this.
- Hosted on Vercel — final task adds a minimal `vercel.json` SPA rewrite.
- Every task must end with `npx tsc --noEmit` (once tsconfig exists) and the project's current build command both succeeding.

---

## Pre-existing issues discovered during investigation (fix inline, not separate tasks)

- `src/SearchBar.jsx` imports `debounce` from `lodash`, but `lodash` is **not** a declared dependency — it only resolves today because CRA/react-scripts pulls it in transitively. This will break under Vite. Fixed in Task 3 by replacing it with a small local debounce utility (no new dependency).
- `src/Tracklist.jsx` is dead code: not imported anywhere, and its usage of `<Track onRemoveTrack={} isPlaylist={} />` doesn't match `Track`'s real prop interface (`onAdd`/`onRemove`/`isInPlaylist`). Deleted in Task 4 rather than converted.
- `src/index.css` is dead code: not imported anywhere (`src/index.js` only imports `src/styles/global.css`). Deleted in Task 7.
- `src/reportWebVitals.js` uses the web-vitals v2 API (`getCLS`, `getFID`, ...). Updated to the v6 API (`onCLS`, `onINP`, `onFCP`, `onLCP`, `onTTFB` — `onFID` was removed upstream in favor of `onINP`) in Task 10.
- `GeminiAPI.generateSongInfo` returns a `SongInfo` object on success but a plain error **string** on failure (caught internally, never re-thrown). `SongDetails` renders `songInfo.summary` etc. directly, so on the (currently unhandled) error path it would silently render `undefined` fields. Task 6 types this honestly as `Promise<SongInfo | string>` and adds a `typeof songInfo === 'string'` render guard — this makes the failure path show the actual message instead of blank fields, a direct consequence of type-checking the existing contract, not a new feature.

---

### Task 1: TypeScript tooling + shared types + API layer

**Files:**
- Create: `tsconfig.json`
- Modify: `package.json` (add TS + `@types/*` devDependencies)
- Create: `src/types/spotify.ts`
- Create: `src/types/song-info.ts`
- Create: `src/api/SpotifyAPI.ts` (replaces `src/api/SpotifyAPI.js`)
- Create: `src/api/GeminiAPI.ts` (replaces `src/api/GeminiAPI.js`)
- Delete: `src/api/SpotifyAPI.js`, `src/api/GeminiAPI.js`

**Interfaces:**
- Produces: `SpotifyTrack`, `TrackDetails` (extends `SpotifyTrack` + `releaseDate: string`), `SongInfo`, `SongInfoCredit` — used by every later task.
- Produces: `SpotifyAPI` default export with methods `init(): void`, `isAuthenticated(): boolean`, `logout(): void`, `getLoginUrl(): Promise<string>`, `handleAuthCallback(code: string): Promise<SpotifyTokenResponse>`, `refreshAccessToken(): Promise<SpotifyTokenResponse>`, `searchTracks(query: string): Promise<SpotifyTrack[]>`, `getTrackDetails(trackId: string): Promise<TrackDetails>`, `createPlaylist(playlistName: string, tracks: SpotifyTrack[]): Promise<SpotifyPlaylist>`.
- Produces: `GeminiAPI` default export with `generateSongInfo(track: { name: string; artist: string; album?: string }): Promise<SongInfo | string>`.

- [ ] **Step 1: Install TypeScript tooling**

Run:
```bash
npm install --save-dev typescript @types/react @types/react-dom @types/node
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "allowJs": true,
    "checkJs": false,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `src/types/spotify.ts`**

```typescript
export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  cover: string;
  preview_url?: string | null;
}

export interface TrackDetails extends SpotifyTrack {
  releaseDate: string;
}

export interface SpotifyTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  [key: string]: unknown;
}

export interface SpotifyPlaylist {
  id: string;
  [key: string]: unknown;
}
```

- [ ] **Step 4: Create `src/types/song-info.ts`**

```typescript
export interface SongInfoCredit {
  name: string;
  role: string;
  knownFor?: string;
}

export interface SongInfoMusicalAnalysis {
  mood: string;
  keyElements: string[];
  soundscape: string;
}

export interface SongInfoCulturalContext {
  era: string;
  influence: string;
  connections?: string[];
}

export interface SongInfo {
  summary: string;
  musicalAnalysis: SongInfoMusicalAnalysis;
  genre: string[];
  culturalContext: SongInfoCulturalContext;
  credits: SongInfoCredit[];
  highlights: string[];
}
```

- [ ] **Step 5: Create `src/api/SpotifyAPI.ts`**

```typescript
import { sha256 } from "js-sha256";
import type {
  SpotifyTrack,
  TrackDetails,
  SpotifyTokenResponse,
  SpotifyPlaylist,
} from "../types/spotify";

const SpotifyAPI = {
  clientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined,
  redirectUri:
    window.location.hostname === "127.0.0.1"
      ? "https://127.0.0.1:3000/callback"
      : "https://spot-on-six.vercel.app/callback",
  markets: ["US", "GB", "ES", "FR", "DE"],

  accessToken: null as string | null,
  refreshToken: null as string | null,
  expiresAt: null as number | null,

  init(): void {
    if (!this.clientId) {
      console.error("Missing Spotify client ID");
      throw new Error("Spotify client ID not set in .env file");
    }

    this.accessToken = localStorage.getItem("spotify_access_token");
    this.refreshToken = localStorage.getItem("spotify_refresh_token");
    const storedExpiresAt = localStorage.getItem("spotify_expires_at");
    this.expiresAt = storedExpiresAt ? Number(storedExpiresAt) : null;
  },

  isAuthenticated(): boolean {
    return !!this.accessToken && !!this.expiresAt && Date.now() < this.expiresAt;
  },

  logout(): void {
    localStorage.removeItem("spotify_access_token");
    localStorage.removeItem("spotify_refresh_token");
    localStorage.removeItem("spotify_expires_at");
    localStorage.removeItem("spotify_auth_state");
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = null;
  },

  generateRandomString(length: number): string {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  },

  generateCodeChallenge(): string {
    const codeVerifier = this.generateRandomString(128);
    localStorage.setItem("spotify_code_verifier", codeVerifier);

    const hashBuffer = sha256.arrayBuffer(codeVerifier);
    const b64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
    const codeChallenge = b64
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    return codeChallenge;
  },

  async getLoginUrl(): Promise<string> {
    if (!this.clientId) {
      throw new Error("Missing Spotify client ID");
    }

    const scope = [
      "streaming",
      "user-read-email",
      "user-read-private",
      "user-library-read",
      "user-library-modify",
      "playlist-modify-public",
      "playlist-modify-private",
      "user-read-playback-state",
      "user-modify-playback-state",
    ].join(" ");

    const state = Math.random().toString(36).substring(2);
    localStorage.setItem("spotify_auth_state", state);

    const codeChallenge = this.generateCodeChallenge();

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: "code",
      redirect_uri: this.redirectUri,
      state: state,
      scope: scope,
      code_challenge_method: "S256",
      code_challenge: codeChallenge,
      show_dialog: "true",
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  },

  async handleAuthCallback(code: string): Promise<SpotifyTokenResponse> {
    console.log("Handling auth callback...");

    const codeVerifier = localStorage.getItem("spotify_code_verifier");

    if (!codeVerifier) {
      throw new Error("Code verifier not found");
    }

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: this.redirectUri,
      client_id: this.clientId ?? "",
      code_verifier: codeVerifier,
    });

    try {
      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Token exchange error:", data);
        throw new Error(
          data.error_description || "Failed to exchange code for token"
        );
      }

      console.log("Token exchange successful");
      this.setTokens(data);

      localStorage.removeItem("spotify_code_verifier");
      localStorage.removeItem("spotify_auth_state");

      return data;
    } catch (error) {
      console.error("Auth callback error:", error);
      throw error;
    }
  },

  async refreshAccessToken(): Promise<SpotifyTokenResponse> {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: this.refreshToken,
      client_id: this.clientId ?? "",
    });

    try {
      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      });

      if (!response.ok) {
        throw new Error("Failed to refresh token");
      }

      const data = await response.json();
      this.setTokens(data);
      return data;
    } catch (error) {
      console.error("Token refresh error:", error);
      throw error;
    }
  },

  setTokens(data: SpotifyTokenResponse): void {
    this.accessToken = data.access_token;
    if (data.refresh_token) {
      this.refreshToken = data.refresh_token;
    }
    this.expiresAt = Date.now() + data.expires_in * 1000;

    localStorage.setItem("spotify_access_token", this.accessToken);
    localStorage.setItem("spotify_refresh_token", this.refreshToken ?? "");
    localStorage.setItem("spotify_expires_at", String(this.expiresAt));

    console.log("Tokens updated successfully");
  },

  async getAccessToken(): Promise<string> {
    if (!this.isAuthenticated()) {
      if (this.refreshToken) {
        await this.refreshAccessToken();
      } else {
        throw new Error("User not authenticated");
      }
    }
    return this.accessToken as string;
  },

  async searchTracks(query: string): Promise<SpotifyTrack[]> {
    const token = await this.getAccessToken();

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(
          query
        )}&type=track&market=US&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch search results");
      }

      const data = await response.json();
      console.log("Search results:", data.tracks.items.length, "tracks found");

      return data.tracks.items.map((track: any): SpotifyTrack => ({
        id: track.id,
        name: track.name,
        artist: track.artists[0].name,
        album: track.album.name,
        cover: track.album.images[0]?.url || "default-cover.jpg",
      }));
    } catch (error) {
      console.error("Search error:", error);
      throw error;
    }
  },

  async getTrackDetails(trackId: string): Promise<TrackDetails> {
    const token = await this.getAccessToken();

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/tracks/${trackId}?market=US`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch track details");
      }

      const track = await response.json();

      return {
        id: track.id,
        name: track.name,
        artist: track.artists[0].name,
        album: track.album.name,
        cover: track.album.images[0]?.url || "default-cover.jpg",
        releaseDate: track.album.release_date,
      };
    } catch (error) {
      console.error("Track details error:", error);
      throw error;
    }
  },

  async createPlaylist(
    playlistName: string,
    tracks: SpotifyTrack[]
  ): Promise<SpotifyPlaylist> {
    const token = await this.getAccessToken();

    try {
      const userResponse = await fetch("https://api.spotify.com/v1/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error("Failed to get user information");
      }

      const userData = await userResponse.json();

      const createResponse = await fetch(
        `https://api.spotify.com/v1/users/${userData.id}/playlists`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: playlistName,
            description: "Created with SpotOn",
            public: false,
          }),
        }
      );

      if (!createResponse.ok) {
        throw new Error("Failed to create playlist");
      }

      const playlistData: SpotifyPlaylist = await createResponse.json();

      const addTracksResponse = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistData.id}/tracks`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uris: tracks.map((track) => `spotify:track:${track.id}`),
          }),
        }
      );

      if (!addTracksResponse.ok) {
        throw new Error("Failed to add tracks to playlist");
      }

      return playlistData;
    } catch (error) {
      console.error("Error creating playlist:", error);
      throw error;
    }
  },
};

SpotifyAPI.init();

export default SpotifyAPI;
```

Note: `import.meta.env` doesn't type-check until Task 8 adds `src/vite-env.d.ts` and switches the build to Vite. Until then, under CRA, this file won't be part of the CRA build's env resolution — that's fine, because CRA (webpack) isn't executing this file with real env substitution until Task 8's cutover; `tsc --noEmit` will only complain if `import.meta` isn't recognized by the `lib`/`module` target. `"module": "ESNext"` in Step 2's `tsconfig.json` supports `import.meta` syntax, so this compiles cleanly now and becomes functionally correct once Task 8 wires up Vite's env replacement.

- [ ] **Step 6: Create `src/api/GeminiAPI.ts`**

```typescript
import type { SongInfo } from "../types/song-info";

interface GeminiAPITrack {
  name: string;
  artist: string;
  album?: string;
}

const GeminiAPI = {
  getApiKey(): string | null {
    return (import.meta.env.VITE_GROQ_API_KEY as string | undefined) ?? null;
  },

  async generateSongInfo(
    { name, artist, album }: GeminiAPITrack,
    retryCount = 0
  ): Promise<SongInfo | string> {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error("Groq API key is not configured");

    const prompt = `As a passionate music historian and critic with deep expertise in musical analysis, provide an engaging deep-dive into "${name}" by ${artist} from the album "${
      album || "Unknown"
    }". Respond only with a JSON object in this exact structure:

{
  "summary": "4-5 sentence narrative capturing the song's essence, emotional impact, and cultural significance",
  "musicalAnalysis": {
    "mood": "2-3 evocative adjectives describing the emotional atmosphere",
    "keyElements": ["3-4 standout musical elements"],
    "soundscape": "One sentence describing the overall sonic texture and production style"
  },
  "genre": ["primary genre", "secondary genre"],
  "culturalContext": {
    "era": "musical era and cultural moment",
    "influence": "brief description of cultural impact",
    "connections": ["2-3 similar songs or artists"]
  },
  "credits": [
    {
      "name": "contributor name",
      "role": "their specific role",
      "knownFor": "notable fact about their career"
    }
  ],
  "highlights": ["3-4 most memorable aspects of the song"]
}`;

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 429 && retryCount < 2) {
          const retryAfter = parseInt(response.headers.get("retry-after") || "10") * 1000;
          console.log(`Rate limited. Retrying in ${retryAfter / 1000}s...`);
          await new Promise((res) => setTimeout(res, retryAfter));
          return this.generateSongInfo({ name, artist, album }, retryCount + 1);
        }
        throw new Error(err.error?.message || `Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const songInfo: SongInfo = JSON.parse(data.choices[0].message.content);
      return songInfo;
    } catch (error) {
      console.error("Error generating summary:", error);
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("429")) {
        return "Groq API quota exceeded. Please wait a moment and try again.";
      }
      return `Unable to generate song summary: ${message}`;
    }
  },
};

export default GeminiAPI;
```

- [ ] **Step 7: Delete old JS API files**

```bash
git rm src/api/SpotifyAPI.js src/api/GeminiAPI.js
```

- [ ] **Step 8: Verify type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed (the CRA build still resolves `SpotifyAPI`/`GeminiAPI` imports to the new `.ts` files automatically since no other file has been converted to reference `import.meta.env` yet outside these two — `import.meta.env` won't be replaced by webpack, but that only matters at runtime, not at `tsc`/build-bundle time, since CRA's webpack treats unresolved `import.meta.env.X` as `undefined` accesses, which is syntactically valid and won't fail the build).

- [ ] **Step 9: Commit**

```bash
git add tsconfig.json package.json package-lock.json src/types src/api
git commit -m "feat: add TypeScript tooling and convert API layer to TS"
```

---

### Task 2: Convert Toast system + LoadingSpinner

**Files:**
- Create: `src/Toast.tsx` (replaces `src/Toast.jsx`)
- Create: `src/contexts/ToastContext.tsx` (replaces `src/contexts/ToastContext.jsx`)
- Create: `src/LoadingSpinner.tsx` (replaces `src/LoadingSpinner.jsx`)
- Delete: `src/Toast.jsx`, `src/contexts/ToastContext.jsx`, `src/LoadingSpinner.jsx`

**Interfaces:**
- Consumes: none (leaf modules).
- Produces: `Toast` default export (props: `{ message: string; type?: 'success' | 'error'; duration?: number; onClose: () => void; style?: React.CSSProperties }`), `ToastContainer` named export (props: `{ children: React.ReactNode }`).
- Produces: `ToastProvider` named export (props: `{ children: React.ReactNode }`), `useToast()` hook returning `{ showToast: (message: string, type?: 'success' | 'error', duration?: number) => void }`.
- Produces: `LoadingSpinner` default export (props: `{ size?: 'small' | 'medium' | 'large'; light?: boolean }`), `LoadingOverlay` named export (same props).

- [ ] **Step 1: Create `src/Toast.tsx`**

```typescript
import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
  style?: React.CSSProperties;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success', duration = 3000, onClose, style }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const baseClasses = `
        opacity-0 transform translate-y-2 transition-all duration-300
        bg-[#0D0C0E]/95 text-white px-5 py-3.5 flex items-center
        backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.4)] min-w-[220px] max-w-[360px]
        pointer-events-auto border border-white/[0.06]
        w-auto z-50
    `;

    const showClasses = 'opacity-100 translate-y-0 pointer-events-auto';

    const iconClasses: Record<ToastType, string> = {
        success: 'text-primary transition-transform duration-300 group-hover:scale-110',
        error: 'text-red-500 transition-transform duration-300 group-hover:scale-110'
    };

    const leftBarColor = type === 'success' ? '#1DB954' : '#ef4444';

    return (
        <div
            className={`
                ${baseClasses}
                ${showClasses}
                group
                relative overflow-hidden
                rounded-lg
                animate-slideUp
            `}
            style={{
                ...style,
                borderLeft: `3px solid ${leftBarColor}`,
                fontFamily: 'DM Sans, sans-serif',
                letterSpacing: '0.01em',
            }}
            role="alert"
            aria-live="polite"
        >
            <div className="flex items-center gap-3 text-sm font-medium relative z-10">
                {type === 'success' && (
                    <span className={`flex-shrink-0 ${iconClasses[type]}`} role="img" aria-label="success">✓</span>
                )}
                {type === 'error' && (
                    <span className={`flex-shrink-0 ${iconClasses[type]}`} role="img" aria-label="error">✕</span>
                )}
                {message}
            </div>
        </div>
    );
};

export const ToastContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="fixed bottom-6 right-6 flex flex-col gap-2.5 pointer-events-none z-50 items-end">
            {children}
        </div>
    );
};

export default Toast;
```

- [ ] **Step 2: Create `src/contexts/ToastContext.tsx`**

```typescript
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Toast, { ToastContainer, ToastType } from '../Toast';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  createdAt: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'success', duration = 3000) => {
        const id = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id, message, type, duration, createdAt: Date.now() }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const sortedToasts = [...toasts].sort((a, b) => a.createdAt - b.createdAt);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <ToastContainer>
                {sortedToasts.map((toast, index) => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        duration={toast.duration}
                        onClose={() => removeToast(toast.id)}
                        style={{
                            bottom: `${(index * 70) + 20}px`
                        }}
                    />
                ))}
            </ToastContainer>
        </ToastContext.Provider>
    );
};

export const useToast = (): ToastContextValue => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export default ToastContext;
```

- [ ] **Step 3: Create `src/LoadingSpinner.tsx`**

```typescript
import React from 'react';

type SpinnerSize = 'small' | 'medium' | 'large';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  light?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'medium', light = true }) => {
    const sizeClasses: Record<SpinnerSize, string> = {
        small: 'w-6 h-6',
        medium: 'w-10 h-10',
        large: 'w-16 h-16'
    };

    const spinnerRingClasses: Record<SpinnerSize, string> = {
        small: 'w-5 h-5',
        medium: 'w-8 h-8',
        large: 'w-[51px] h-[51px]'
    };

    const borderColor = light ? 'border-t-white' : 'border-t-primary';

    return (
        <div className="flex justify-center items-center p-4">
            <div className={`relative inline-block ${sizeClasses[size]} animate-fadeIn`}>
                <div className="absolute inset-0 bg-shimmer animate-shimmer opacity-30" />
                <div className={`relative inline-block ${sizeClasses[size]}`}>
                    {[...Array(4)].map((_, index) => (
                        <div
                            key={index}
                            className={`box-border block absolute rounded-full border-3
                                      ${light ? 'border-white/[0.15]' : 'border-primary/[0.15]'}
                                      ${borderColor}
                                      ${spinnerRingClasses[size]}
                                      animate-[spin_1.2s_cubic-bezier(0.5,0,0.5,1)_infinite]
                                      backdrop-blur-sm shadow-[0_0_20px_rgba(255,255,255,0.15)]
                                      transition-all duration-300`}
                            style={{
                                animationDelay: `${-0.45 + (index * 0.15)}s`,
                                borderRightColor: 'transparent',
                                borderBottomColor: 'transparent',
                                borderLeftColor: 'transparent',
                                filter: `blur(${0.2 * index}px)`
                            }}
                        />
                    ))}
                    <div className={`absolute inset-0 animate-pulse ${light ? 'bg-white' : 'bg-primary'}
                                   rounded-full opacity-10 mix-blend-overlay`} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent
                               rounded-full animate-spinSlow blur-xl opacity-50" />
            </div>
        </div>
    );
};

export const LoadingOverlay: React.FC<LoadingSpinnerProps> = ({ size = 'large', light = true }) => (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex justify-center items-center z-50
                    animate-fadeIn">
        <div className="relative p-8 rounded-xl bg-white/5">
            <LoadingSpinner size={size} light={light} />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent rounded-xl
                          animate-pulse blur-xl" />
            <div className="absolute inset-0 bg-shimmer animate-shimmer opacity-20" />
        </div>
    </div>
);

export default LoadingSpinner;
```

- [ ] **Step 4: Delete old JSX files**

```bash
git rm src/Toast.jsx src/contexts/ToastContext.jsx src/LoadingSpinner.jsx
```

- [ ] **Step 5: Verify type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 6: Commit**

```bash
git add src/Toast.tsx src/contexts/ToastContext.tsx src/LoadingSpinner.tsx
git commit -m "feat: convert toast system and loading spinner to TypeScript"
```

---

### Task 3: Local debounce utility + convert SearchBar

**Files:**
- Create: `src/lib/debounce.ts`
- Create: `src/SearchBar.tsx` (replaces `src/SearchBar.jsx`)
- Delete: `src/SearchBar.jsx`

**Interfaces:**
- Consumes: none new.
- Produces: `debounce<Args extends unknown[]>(fn: (...args: Args) => void, delayMs: number): (...args: Args) => void` from `src/lib/debounce.ts` — replaces the `lodash` import.
- Produces: `SearchBar` default export (props: `{ onSearch: (query: string) => void | Promise<void> }`).

- [ ] **Step 1: Create `src/lib/debounce.ts`**

```typescript
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delayMs: number
): (...args: Args) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  return (...args: Args) => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => fn(...args), delayMs);
  };
}
```

- [ ] **Step 2: Create `src/SearchBar.tsx`**

```typescript
import React, { useState, useCallback, useMemo } from "react";
import { debounce } from "./lib/debounce";

interface SearchBarProps {
  onSearch: (query: string) => void | Promise<void>;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem("recentSearches");
    return saved ? JSON.parse(saved) : [];
  });

  const updateRecentSearches = useCallback((searchQuery: string) => {
    setRecentSearches((prevSearches) => {
      const updatedSearches = [
        searchQuery,
        ...prevSearches.filter((s) => s !== searchQuery),
      ].slice(0, 5);
      localStorage.setItem("recentSearches", JSON.stringify(updatedSearches));
      return updatedSearches;
    });
  }, []);

  const debouncedSearch = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.trim()) {
        setIsLoading(true);
        try {
          await onSearch(searchQuery);
        } catch (error) {
          console.error("Search error:", error);
        }
        setIsLoading(false);
      }
    },
    [onSearch]
  );

  const debouncedSearchHandler = useMemo(
    () => debounce(debouncedSearch, 500),
    [debouncedSearch]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearchHandler(value);
  };

  const handleRecentSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    onSearch(searchQuery);
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      onSearch(query);
      updateRecentSearches(query);
    }
  };
  return (
    <div className="max-w-[700px] mx-auto px-4 md:px-4 relative">
      <div className="relative flex items-center">
        <input
          type="text"
          className="w-full py-4 px-12 md:px-14 border border-white/10 rounded-full
                             bg-white/[0.04] text-white backdrop-blur-md transition-all duration-normal
                             focus:outline-none focus:border-primary/60 focus:bg-white/[0.07]
                             focus:shadow-[0_0_24px_rgba(29,185,84,0.12)]
                             hover:border-white/15 hover:bg-white/[0.06]
                             placeholder:text-white/25
                             animate-[fadeIn_0.3s_ease-out]"
          style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px' }}
          placeholder="Search for songs, artists…"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
        <span
          className="absolute left-5 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none
                                transition-all duration-normal group-focus-within:text-primary md:left-4
                                transform group-focus-within:scale-110"
        >
          🔍
        </span>
        {isLoading && (
          <div
            className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 
                                  border-2 border-white/10 border-t-primary rounded-full 
                                  animate-spin md:right-4"
          ></div>
        )}
      </div>

      {recentSearches.length > 0 && !query && (
        <div className="mt-4 text-left px-4">
          <h3 className="text-white/60 text-sm mb-2">Recent Searches</h3>
          <div>
            {recentSearches.map((search, index) => (
              <button
                key={index}
                className="inline-flex items-center m-1 px-4 py-2 bg-white/10
                                          rounded-full text-white text-sm cursor-pointer
                                          transition-all duration-fast hover:bg-white/20
                                          hover:-translate-y-0.5 hover:shadow-lg
                                          hover:shadow-primary/10 hover:border-primary/30
                                          active:translate-y-0 active:shadow-md
                                          border border-transparent"
                onClick={() => handleRecentSearch(search)}
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
```

Note: the original used `debounce(debouncedSearch, 500)` recomputed fresh on every render (a latent bug where debouncing was less effective than intended, since a new debounced function was created each render). Wrapping it in `useMemo` keyed on `debouncedSearch` fixes that side effect implicitly. This is a direct, minimal consequence of replacing the `lodash` import — worth flagging in review, but it's within the "no dead/broken code" spirit rather than a new feature.

- [ ] **Step 3: Delete old JSX file**

```bash
git rm src/SearchBar.jsx
```

- [ ] **Step 4: Verify type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed. Confirms `lodash` is no longer referenced anywhere:
Run: `grep -r "lodash" src`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/lib/debounce.ts src/SearchBar.tsx
git commit -m "feat: replace undeclared lodash dependency with local debounce, convert SearchBar to TS"
```

---

### Task 4: Convert Track + SearchResults, remove dead Tracklist

**Files:**
- Create: `src/Track.tsx` (replaces `src/Track.jsx`)
- Create: `src/SearchResults.tsx` (replaces `src/SearchResults.jsx`)
- Delete: `src/Track.jsx`, `src/SearchResults.jsx`, `src/Tracklist.jsx` (dead code — unused, prop-mismatched with `Track`, see investigation notes at top of plan)

**Interfaces:**
- Consumes: `SpotifyTrack` from `src/types/spotify.ts` (Task 1), `useToast` from `src/contexts/ToastContext.tsx` (Task 2).
- Produces: `Track` default export (props: `{ track: SpotifyTrack; onAdd?: (track: SpotifyTrack) => void; onRemove?: (trackId: string) => void; isInPlaylist?: boolean }`).
- Produces: `SearchResults` default export (props: `{ searchResults: SpotifyTrack[]; onAddTrack: (track: SpotifyTrack) => void; isLoading?: boolean }`).

- [ ] **Step 1: Create `src/Track.tsx`**

```typescript
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './contexts/ToastContext';
import { SpotifyTrack } from './types/spotify';

interface TrackProps {
  track: SpotifyTrack;
  onAdd?: (track: SpotifyTrack) => void;
  onRemove?: (trackId: string) => void;
  isInPlaylist?: boolean;
}

const Track: React.FC<TrackProps> = ({ track, onAdd, onRemove, isInPlaylist = false }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasAudioSupport, setHasAudioSupport] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const navigate = useNavigate();
    const { showToast } = useToast();

    useEffect(() => {
        setHasAudioSupport(typeof Audio !== 'undefined');
    }, []);

    useEffect(() => {
        if (!track.preview_url || !hasAudioSupport) return;

        const handleEnded = () => setIsPlaying(false);
        const handleError = () => {
            setIsPlaying(false);
            setIsLoading(false);
            showToast('Failed to load audio preview', 'error');
        };

        const audio = new Audio(track.preview_url);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);
        audioRef.current = audio;

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.removeEventListener('ended', handleEnded);
                audioRef.current.removeEventListener('error', handleError);
                audioRef.current = null;
            }
        };
    }, [track.preview_url, hasAudioSupport, showToast]);

    const handlePlayPause = async (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!track.preview_url) {
            showToast('No preview available for this song', 'error');
            return;
        }

        try {
            setIsLoading(true);
            document.querySelectorAll('audio').forEach(audio => {
                if (audio !== audioRef.current) {
                    audio.pause();
                }
            });

            if (isPlaying) {
                audioRef.current?.pause();
                setIsPlaying(false);
            } else {
                await audioRef.current?.play();
                setIsPlaying(true);
            }
        } catch (error) {
            console.error('Playback error:', error);
            showToast('Failed to play preview', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTrackClick = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
        navigate(`/song/${track.id}`);
    };

    const handleAction = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isInPlaylist) {
            onRemove?.(track.id);
        } else {
            onAdd?.(track);
        }
    };

    const baseButtonClasses = `
        w-8 h-8 md:w-7 md:h-7 rounded-full flex items-center justify-center
        cursor-pointer transition-all duration-200 text-lg md:text-base
        border border-white/20 text-white disabled:opacity-50 disabled:cursor-wait
        enabled:hover:scale-110 enabled:hover:shadow-lg enabled:hover:shadow-white/10
        enabled:active:scale-95 enabled:active:shadow-md
        backdrop-blur-sm bg-black/20
    `;

    return (
        <div
            onClick={handleTrackClick}
            className="p-3 rounded-lg bg-white/[0.04] mb-2.5 flex items-center gap-4
                     transition-all duration-300 cursor-pointer relative overflow-hidden
                     hover:-translate-y-0.5 hover:bg-white/[0.07]
                     hover:shadow-[0_6px_20px_rgba(0,0,0,0.3)]
                     animate-fadeIn active:translate-y-0
                     before:content-[''] before:absolute before:inset-0
                     before:bg-gradient-to-r before:from-transparent before:to-primary/8
                     before:opacity-0 before:transition-all before:duration-300
                     hover:before:opacity-100
                     group"
        >
            <div className="relative flex-shrink-0">
                <img
                    src={track.cover}
                    alt={`${track.name} cover`}
                    className="w-16 h-16 rounded-md object-cover
                              shadow-lg transition-all duration-300
                              group-hover:scale-105 relative z-10"
                />
                <div className="absolute inset-0 rounded-md bg-primary/0 group-hover:bg-primary/10
                               blur-md scale-110 transition-all duration-300 group-hover:blur-lg" />
            </div>

            <div className="flex-grow text-left flex flex-col gap-0.5 min-w-0">
                <h3 className="m-0 text-white font-semibold text-sm transition-colors duration-300
                              group-hover:text-primary truncate"
                    style={{ fontFamily: 'Syne, sans-serif' }}>
                    {track.name}
                </h3>
                <p className="m-0 text-white/40 transition-colors duration-300
                              group-hover:text-white/60 truncate"
                   style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    {track.artist}
                </p>
                {!track.preview_url && (
                    <span className="inline-block text-[10px] text-white/30 italic mt-0.5">
                        No preview
                    </span>
                )}
            </div>

            <div className="flex gap-2 flex-shrink-0 opacity-0 translate-x-2 transition-all duration-300
                          group-hover:opacity-100 group-hover:translate-x-0 md:opacity-100 md:translate-x-0">
                {track.preview_url && hasAudioSupport && (
                    <button
                        className={`${baseButtonClasses} bg-primary/10 border-primary/50
                                   enabled:hover:bg-primary enabled:hover:border-primary`}
                        onClick={handlePlayPause}
                        disabled={isLoading}
                        title={isPlaying ? 'Pause preview' : 'Play preview'}
                    >
                        {isLoading ? '⌛' : isPlaying ? '⏸' : '▶'}
                    </button>
                )}
                <button
                    className={`${baseButtonClasses} text-base
                              ${isInPlaylist
                                ? 'border-white/20 enabled:hover:bg-red-500/80 enabled:hover:border-red-500 enabled:hover:rotate-45'
                                : 'border-white/20 enabled:hover:bg-primary/80 enabled:hover:border-primary'}`}
                    onClick={handleAction}
                    title={isInPlaylist ? 'Remove from playlist' : 'Add to playlist'}
                >
                    {isInPlaylist ? '−' : '+'}
                </button>
            </div>
        </div>
    );
};

export default Track;
```

- [ ] **Step 2: Create `src/SearchResults.tsx`**

```typescript
import React from 'react';
import Track from './Track';
import { SpotifyTrack } from './types/spotify';

const SoundbarsIcon: React.FC = () => (
    <div className="flex items-end gap-1 h-10">
        {[1, 1.8, 1.3, 2, 1.5].map((delay, i) => (
            <div
                key={i}
                className="w-1.5 bg-primary/40 rounded-full"
                style={{
                    height: '100%',
                    animation: `soundbar ${delay}s ease-in-out infinite`,
                    animationDelay: `${i * 0.15}s`,
                    transformOrigin: 'bottom',
                }}
            />
        ))}
    </div>
);

interface SearchResultsProps {
  searchResults: SpotifyTrack[];
  onAddTrack: (track: SpotifyTrack) => void;
  isLoading?: boolean;
}

const SearchResults: React.FC<SearchResultsProps> = ({ searchResults, onAddTrack, isLoading }) => {
    return (
        <div className="p-6 rounded-xl bg-white/[0.03] border border-white/5 h-full flex flex-col
                      transition-all duration-300 hover:bg-white/[0.04] hover:border-white/8
                      backdrop-blur-sm">
            <div className="mb-5">
                <p className="m-0 mb-2 text-primary"
                   style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase' }}>
                    Discover
                </p>
                <h2 className="text-xl font-semibold text-white m-0 mb-3"
                    style={{ fontFamily: 'Syne, sans-serif' }}>
                    Search Results
                </h2>
                <div className="h-px bg-white/8" />
            </div>

            <div className="flex-grow overflow-y-auto min-h-[200px]">
                {isLoading ? (
                    <div className="flex justify-center items-center h-[200px]">
                        <div className="w-8 h-8 border-2 border-white/10 border-t-primary rounded-full animate-spin" />
                    </div>
                ) : searchResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[200px] text-white/30 text-center p-8 gap-4">
                        <SoundbarsIcon />
                        <p className="m-0 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                            Search for a song to begin
                        </p>
                    </div>
                ) : (
                    <ul className="list-none p-0 m-0">
                        {searchResults.map((track) => (
                            <li key={track.id}>
                                <Track
                                    track={track}
                                    onAdd={onAddTrack}
                                    isInPlaylist={false}
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default SearchResults;
```

- [ ] **Step 3: Delete old JSX files and dead Tracklist**

```bash
git rm src/Track.jsx src/SearchResults.jsx src/Tracklist.jsx
```

- [ ] **Step 4: Verify type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 5: Commit**

```bash
git add src/Track.tsx src/SearchResults.tsx
git commit -m "feat: convert Track and SearchResults to TypeScript, remove dead Tracklist.jsx"
```

---

### Task 5: Convert Playlist

**Files:**
- Create: `src/Playlist.tsx` (replaces `src/Playlist.jsx`)
- Delete: `src/Playlist.jsx`

**Interfaces:**
- Consumes: `SpotifyTrack` (Task 1), `useToast` (Task 2), `SpotifyAPI` (Task 1).
- Produces: `Playlist` default export (props: `{ tracks: SpotifyTrack[]; onRemoveTrack: (trackId: string) => void; name: string; onNameChange: (newName: string) => void; onClearPlaylist: () => void }`).

- [ ] **Step 1: Create `src/Playlist.tsx`**

```typescript
import React, { useState, useRef, useEffect } from 'react';
import { useToast } from './contexts/ToastContext';
import SpotifyAPI from './api/SpotifyAPI';
import { SpotifyTrack } from './types/spotify';

const VinylIcon: React.FC = () => (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"
         style={{ animation: 'vinyl 4s linear infinite' }}>
        <circle cx="28" cy="28" r="27" stroke="rgba(255,255,255,0.08)" strokeWidth="2" fill="rgba(255,255,255,0.03)" />
        <circle cx="28" cy="28" r="18" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" fill="rgba(255,255,255,0.02)" />
        <circle cx="28" cy="28" r="10" stroke="rgba(29,185,84,0.15)" strokeWidth="1" fill="rgba(29,185,84,0.04)" />
        <circle cx="28" cy="28" r="3.5" fill="rgba(29,185,84,0.4)" />
        <circle cx="28" cy="28" r="1.5" fill="rgba(29,185,84,0.8)" />
    </svg>
);

interface PlaylistProps {
  tracks: SpotifyTrack[];
  onRemoveTrack: (trackId: string) => void;
  name: string;
  onNameChange: (newName: string) => void;
  onClearPlaylist: () => void;
}

const Playlist: React.FC<PlaylistProps> = ({ tracks, onRemoveTrack, name, onNameChange, onClearPlaylist }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(name);
    const [isSaving, setIsSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { showToast } = useToast();

    const handleSavePlaylist = async () => {
        if (tracks.length === 0) {
            showToast('Cannot save empty playlist', 'error');
            return;
        }
        try {
            setIsSaving(true);
            await SpotifyAPI.createPlaylist(name, tracks);
            showToast('Playlist saved to Spotify successfully. Check your library!', 'success');
        } catch (error) {
            console.error('Error saving playlist:', error);
            const message = error instanceof Error ? error.message : String(error);
            showToast('Failed to save playlist: ' + message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleClearPlaylist = () => {
        if (window.confirm('Are you sure you want to clear the playlist?')) {
            onClearPlaylist();
        }
    };

    const handleNameClick = () => {
        setIsEditing(true);
        setEditValue(name);
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => setEditValue(e.target.value);

    const handleNameSubmit = () => {
        const newName = editValue.trim();
        if (newName && newName !== name) onNameChange(newName);
        setIsEditing(false);
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleNameSubmit();
        else if (e.key === 'Escape') { setIsEditing(false); setEditValue(name); }
    };

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    return (
        <div className="p-6 rounded-xl bg-white/[0.03] border border-white/5 h-full flex flex-col
                      transition-all duration-300 hover:bg-white/[0.04] hover:border-white/8
                      backdrop-blur-sm">
            <div className="mb-5">
                <p className="m-0 mb-2 text-primary"
                   style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase' }}>
                    Your Mix
                </p>

                {isEditing ? (
                    <input
                        ref={inputRef}
                        className="text-xl font-semibold text-white bg-transparent border-b-2 border-primary
                                  w-full outline-none transition-all duration-200 py-1 px-0 mb-3
                                  placeholder:text-white/30"
                        style={{ fontFamily: 'Syne, sans-serif' }}
                        value={editValue}
                        onChange={handleNameChange}
                        onBlur={handleNameSubmit}
                        onKeyDown={handleKeyPress}
                        maxLength={50}
                    />
                ) : (
                    <h2
                        className="text-xl font-semibold text-white m-0 mb-3 cursor-pointer
                                  transition-colors duration-200 hover:text-primary inline-block border-b border-transparent hover:border-white/20 pb-1"
                        style={{ fontFamily: 'Syne, sans-serif' }}
                        onClick={handleNameClick}
                        title="Click to edit playlist name"
                    >
                        {name}
                    </h2>
                )}

                <div className="h-px bg-white/8" />
            </div>

            <div className="flex-grow overflow-y-auto min-h-[200px]">
                {tracks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[200px] text-white/30 text-center p-8">
                        <div className="mb-5 opacity-50">
                            <VinylIcon />
                        </div>
                        <p className="m-0 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>Add songs to begin</p>
                    </div>
                ) : (
                    <ul className="list-none p-0 m-0">
                        {tracks.map((track, index) => (
                            <li key={track.id}
                                className="py-3 px-3 rounded-lg mb-1.5 bg-transparent transition-all duration-300
                                          flex items-center gap-3 hover:bg-white/[0.05] hover:translate-x-0.5 group cursor-pointer border border-transparent hover:border-white/5">
                                <span className="text-primary flex-shrink-0 w-6 text-right"
                                      style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                                    {String(index + 1).padStart(2, '0')}
                                </span>
                                <div className="flex-grow text-left min-w-0">
                                    <h3 className="font-semibold text-white m-0 text-sm truncate transition-colors duration-300
                                               group-hover:text-primary"
                                        style={{ fontFamily: 'Syne, sans-serif' }}>
                                        {track.name}
                                    </h3>
                                    <p className="text-white/40 text-[10px] mt-0.5 m-0 truncate transition-colors duration-300
                                               group-hover:text-white/60 uppercase tracking-wider"
                                       style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                        {track.artist}
                                    </p>
                                </div>
                                <button
                                    className="bg-transparent border border-white/10 text-white/30 cursor-pointer
                                              w-6 h-6 rounded-full transition-all duration-300 flex items-center
                                              justify-center opacity-0 hover:text-red-400 hover:border-red-500/40
                                              hover:bg-red-500/10 hover:rotate-45
                                              group-hover:opacity-100 md:opacity-100 flex-shrink-0 text-sm"
                                    onClick={() => onRemoveTrack(track.id)}
                                    title="Remove from playlist"
                                >
                                    ✕
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {tracks.length > 0 && (
                <div className="mt-5 pt-4 border-t border-white/8 flex flex-col gap-2.5">
                    <button
                        className="w-full py-3.5 rounded-lg text-white text-sm font-semibold
                                   cursor-pointer transition-all duration-300 relative overflow-hidden
                                   hover:-translate-y-0.5 active:translate-y-0 group
                                   disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
                        style={{
                            fontFamily: 'Syne, sans-serif',
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            fontSize: '12px',
                            background: '#1DB954',
                        }}
                        onClick={handleSavePlaylist}
                        disabled={isSaving}
                    >
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent
                                         -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        <span className="relative">{isSaving ? 'Saving...' : 'Save to Spotify'}</span>
                    </button>
                    <button
                        className="w-full py-2.5 rounded-lg text-white/40 text-xs font-medium
                                   cursor-pointer transition-all duration-300
                                   hover:text-white/70 hover:bg-white/[0.04]
                                   border border-transparent hover:border-white/8"
                        style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.05em' }}
                        onClick={handleClearPlaylist}
                    >
                        Clear all
                    </button>
                </div>
            )}
        </div>
    );
};

export default Playlist;
```

- [ ] **Step 2: Delete old JSX file**

```bash
git rm src/Playlist.jsx
```

- [ ] **Step 3: Verify type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add src/Playlist.tsx
git commit -m "feat: convert Playlist to TypeScript"
```

---

### Task 6: Convert Login + SongDetails

**Files:**
- Create: `src/Login.tsx` (replaces `src/Login.jsx`)
- Create: `src/SongDetails.tsx` (replaces `src/SongDetails.jsx`)
- Delete: `src/Login.jsx`, `src/SongDetails.jsx`

**Interfaces:**
- Consumes: `SpotifyAPI` (Task 1), `GeminiAPI` (Task 1), `SongInfo` (Task 1), `TrackDetails`/`SpotifyTrack` (Task 1), `useToast` (Task 2), `LoadingSpinner` (Task 2).
- Produces: `Login` default export (no props). `SongDetails` default export (props: `{ onAddToPlaylist: (track: TrackDetails) => void }`).

- [ ] **Step 1: Create `src/Login.tsx`**

```typescript
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SpotifyAPI from './api/SpotifyAPI';

const DESCRIPTORS = [
    'Search millions of songs from Spotify',
    'Get AI-powered insights on every track',
    'Build and save playlists in seconds',
];

interface ColorBlock {
  color: string;
  size: number;
  top: string;
  left: string;
  delay: string;
  dur: string;
}

const COLOR_BLOCKS: ColorBlock[] = [
    { color: '#1DB954', size: 180, top: '5%', left: '8%', delay: '0s', dur: '7s' },
    { color: '#6B21A8', size: 140, top: '20%', left: '55%', delay: '1.2s', dur: '9s' },
    { color: '#BE185D', size: 160, top: '55%', left: '15%', delay: '2.1s', dur: '8s' },
    { color: '#0284C7', size: 120, top: '70%', left: '60%', delay: '0.5s', dur: '11s' },
    { color: '#D97706', size: 100, top: '40%', left: '30%', delay: '3s', dur: '6s' },
    { color: '#1DB954', size: 90, top: '80%', left: '40%', delay: '1.8s', dur: '10s' },
    { color: '#7C3AED', size: 200, top: '-5%', left: '70%', delay: '0.9s', dur: '13s' },
    { color: '#DC2626', size: 80, top: '45%', left: '78%', delay: '2.5s', dur: '8s' },
];

const Login: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        try { SpotifyAPI.init(); } catch (e) { console.error("Failed to initialize Spotify API", e); }
        if (SpotifyAPI.isAuthenticated()) navigate('/', { replace: true });
    }, [navigate]);

    const handleLogin = async (event: React.MouseEvent) => {
        event.preventDefault();
        try {
            const loginUrl = await SpotifyAPI.getLoginUrl();
            window.location.href = loginUrl;
        } catch (error) {
            console.error('Failed to generate login URL:', error);
        }
    };

    return (
        <div className="min-h-screen flex overflow-hidden" style={{ background: '#0D0C0E' }}>
            <div className="hidden md:flex flex-[0_0_60%] relative overflow-hidden">
                {COLOR_BLOCKS.map((block, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full"
                        style={{
                            width: block.size,
                            height: block.size,
                            background: block.color,
                            top: block.top,
                            left: block.left,
                            filter: 'blur(80px)',
                            opacity: 0.35,
                            animation: `drift ${block.dur} ease-in-out infinite`,
                            animationDelay: block.delay,
                        }}
                    />
                ))}

                <div className="absolute inset-0" style={{ background: 'rgba(13, 12, 14, 0.55)' }} />

                <div
                    className="absolute bottom-8 left-8 text-white/30 text-xs"
                    style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.1em' }}
                >
                    Made by Minh Pham
                </div>

                <div
                    className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
                    style={{
                        fontFamily: 'Syne, sans-serif',
                        fontSize: 'clamp(80px, 15vw, 160px)',
                        fontWeight: 800,
                        color: 'rgba(255,255,255,0.04)',
                        letterSpacing: '-0.02em',
                        lineHeight: 1,
                    }}
                >
                    SPOT<br />ON
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-center px-10 md:px-16 relative z-10">
                <div className="md:hidden absolute inset-0 overflow-hidden pointer-events-none">
                    {COLOR_BLOCKS.slice(0, 3).map((block, i) => (
                        <div
                            key={i}
                            className="absolute rounded-full"
                            style={{
                                width: block.size * 0.7,
                                height: block.size * 0.7,
                                background: block.color,
                                top: block.top,
                                left: block.left,
                                filter: 'blur(60px)',
                                opacity: 0.25,
                            }}
                        />
                    ))}
                </div>

                <div className="max-w-[380px] w-full animate-fadeIn">
                    <div
                        className="mb-12 flex items-baseline gap-0"
                        style={{ fontFamily: 'Syne, sans-serif' }}
                    >
                        <span className="text-2xl font-extrabold text-white uppercase tracking-wide">Spot</span>
                        <span className="text-2xl font-extrabold text-primary uppercase tracking-wide">On</span>
                    </div>

                    <h1
                        className="mb-4 text-white leading-[1.1]"
                        style={{
                            fontFamily: 'Syne, sans-serif',
                            fontSize: 'clamp(36px, 5vw, 52px)',
                            fontWeight: 700,
                            letterSpacing: '-0.02em',
                        }}
                    >
                        Your music.<br />
                        <span className="text-primary">Deeper.</span>
                    </h1>

                    <ul className="list-none p-0 m-0 mb-10 space-y-3">
                        {DESCRIPTORS.map((desc, i) => (
                            <li
                                key={i}
                                className="flex items-center gap-3 text-white/50 text-sm"
                                style={{ fontFamily: 'DM Sans, sans-serif', animationDelay: `${i * 0.1 + 0.2}s` }}
                            >
                                <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                                {desc}
                            </li>
                        ))}
                    </ul>

                    <button
                        onClick={handleLogin}
                        className="w-full py-4 px-8 rounded-full text-white font-semibold text-base
                                   cursor-pointer transition-all duration-300 relative overflow-hidden
                                   hover:-translate-y-0.5 active:translate-y-0 group"
                        style={{
                            fontFamily: 'Syne, sans-serif',
                            letterSpacing: '0.05em',
                            background: '#1DB954',
                        }}
                    >
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent
                                         -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100
                                         transition-opacity duration-300 shadow-[0_0_30px_rgba(29,185,84,0.5)]" />
                        <span className="relative">Connect with Spotify</span>
                    </button>

                    <p
                        className="md:hidden mt-10 text-white/20 text-xs text-center"
                        style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.1em' }}
                    >
                        Made by Minh Pham
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
```

- [ ] **Step 2: Create `src/SongDetails.tsx`**

```typescript
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from './contexts/ToastContext';
import LoadingSpinner from './LoadingSpinner';
import SpotifyAPI from './api/SpotifyAPI';
import GeminiAPI from './api/GeminiAPI';
import { TrackDetails } from './types/spotify';
import { SongInfo } from './types/song-info';

interface SongDetailsProps {
  onAddToPlaylist: (track: TrackDetails) => void;
}

const SongDetails: React.FC<SongDetailsProps> = ({ onAddToPlaylist }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [song, setSong] = useState<TrackDetails | null>(null);
    const [songInfo, setSongInfo] = useState<SongInfo | string | null>(null);
    const [isLoadingInfo, setIsLoadingInfo] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSongDetails = async () => {
            if (!id) return;
            try {
                const data = await SpotifyAPI.getTrackDetails(id);
                setSong(data);

                setIsLoadingInfo(true);
                try {
                    const info = await GeminiAPI.generateSongInfo(data);
                    setSongInfo(info);
                } catch (error) {
                    console.error('Error generating song info:', error);
                    showToast('Unable to load song details at this time', 'error');
                } finally {
                    setIsLoadingInfo(false);
                }
            } catch (error) {
                console.error('Error fetching song details:', error);
                setError('Failed to load song details');
                showToast('Failed to load song details', 'error');
            }
        };

        fetchSongDetails();
    }, [id, showToast]);

    const handleSaveToPlaylist = () => {
        if (!song) return;
        try {
            onAddToPlaylist(song);
        } catch (error) {
            showToast('Failed to add song to playlist', 'error');
        }
    };

    if (error) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-500 mb-4">{error}</p>
                <button
                    onClick={() => navigate('/')}
                    className="px-4 py-2 bg-spotify-green text-white rounded-full hover:bg-spotify-green-light transition-all duration-300"
                >
                    Back to Homepage
                </button>
            </div>
        );
    }

    if (!song) {
        return <div className="p-8 text-center text-white/70">Loading...</div>;
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const infoSections = typeof songInfo === 'object' && songInfo !== null
        ? [
            {
                label: 'About this Song',
                content: <p className="text-white/75 leading-relaxed text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>{songInfo.summary}</p>
            },
            songInfo.musicalAnalysis && {
                label: 'Musical Elements',
                content: (
                    <div className="space-y-4">
                        <div>
                            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>Mood</p>
                            <p className="text-white/75 text-sm leading-relaxed" style={{ fontFamily: 'DM Sans, sans-serif' }}>{songInfo.musicalAnalysis.mood}</p>
                        </div>
                        <div>
                            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>Key Elements</p>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                {songInfo.musicalAnalysis.keyElements.map((el, i) => (
                                    <li key={i} className="flex items-start gap-2 text-white/70 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                        <span className="text-primary mt-1 flex-shrink-0">·</span>{el}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>Soundscape</p>
                            <p className="text-white/75 text-sm leading-relaxed" style={{ fontFamily: 'DM Sans, sans-serif' }}>{songInfo.musicalAnalysis.soundscape}</p>
                        </div>
                    </div>
                )
            },
            songInfo.culturalContext && {
                label: 'Cultural Impact',
                content: (
                    <div className="space-y-4">
                        <div>
                            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>Era</p>
                            <p className="text-white/75 text-sm leading-relaxed" style={{ fontFamily: 'DM Sans, sans-serif' }}>{songInfo.culturalContext.era}</p>
                        </div>
                        <div>
                            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>Influence</p>
                            <p className="text-white/75 text-sm leading-relaxed" style={{ fontFamily: 'DM Sans, sans-serif' }}>{songInfo.culturalContext.influence}</p>
                        </div>
                        {songInfo.culturalContext.connections && songInfo.culturalContext.connections.length > 0 && (
                            <div>
                                <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>Similar Artists</p>
                                <div className="flex flex-wrap gap-2">
                                    {songInfo.culturalContext.connections.map((c, i) => (
                                        <span key={i} className="text-xs px-3 py-1 rounded-full border border-white/10 text-white/60"
                                              style={{ fontFamily: 'DM Sans, sans-serif' }}>{c}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )
            },
            {
                label: 'Song Credits',
                content: (
                    <div className="space-y-4">
                        {Array.isArray(songInfo.genre) && songInfo.genre.length > 0 && (
                            <div>
                                <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>Genre</p>
                                <div className="flex flex-wrap gap-2">
                                    {songInfo.genre.map((g, i) => (
                                        <span key={i} className="text-xs px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary"
                                              style={{ fontFamily: 'DM Sans, sans-serif' }}>{g}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {songInfo.credits?.map((credit, i) => (
                            <div key={i} className="flex flex-col gap-0.5">
                                <p className="text-white font-medium text-sm m-0" style={{ fontFamily: 'DM Sans, sans-serif' }}>{credit.name}</p>
                                <p className="text-primary/80 text-xs m-0" style={{ fontFamily: 'DM Sans, sans-serif' }}>{credit.role}</p>
                                {credit.knownFor && (
                                    <p className="text-white/40 text-xs m-0 mt-0.5 pl-2 border-l border-primary/20 italic" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                        {credit.knownFor}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )
            },
            songInfo.highlights && songInfo.highlights.length > 0 && {
                label: 'Key Highlights',
                content: (
                    <div className="space-y-3">
                        {songInfo.highlights.map((h, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <span className="text-primary text-xs font-semibold w-5 flex-shrink-0 mt-0.5"
                                      style={{ fontFamily: 'DM Sans, sans-serif', fontVariantNumeric: 'tabular-nums' }}>
                                    {String(i + 1).padStart(2, '0')}
                                </span>
                                <p className="text-white/75 text-sm leading-relaxed flex-1 m-0" style={{ fontFamily: 'DM Sans, sans-serif' }}>{h}</p>
                            </div>
                        ))}
                    </div>
                )
            }
        ].filter((section): section is { label: string; content: React.ReactNode } => Boolean(section))
        : [];

    return (
        <div className="max-w-[1200px] mx-auto p-6 md:p-8 min-h-screen flex flex-col">
            <button
                className="text-white/40 text-sm cursor-pointer transition-all duration-300 mb-8 flex items-center
                          gap-2 w-fit hover:text-white group"
                style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.05em' }}
                onClick={() => navigate('/')}
            >
                <span className="transition-transform duration-300 group-hover:-translate-x-1">←</span>
                <span>Back</span>
            </button>

            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8 mb-8 animate-fadeIn">
                <div className="flex flex-col gap-6 md:items-start items-center">
                    <div className="relative w-full max-w-[280px] md:max-w-none">
                        <img
                            className="w-full aspect-square rounded-lg object-cover shadow-2xl relative z-10"
                            src={song.cover}
                            alt={song.name}
                        />
                        <img
                            className="absolute inset-0 w-full h-full object-cover rounded-lg blur-3xl opacity-25 scale-110 -z-0"
                            src={song.cover}
                            alt=""
                            aria-hidden="true"
                        />
                    </div>

                    <div className="w-full text-left">
                        <h2 className="text-2xl font-bold text-white m-0 mb-1 leading-tight"
                            style={{ fontFamily: 'Syne, sans-serif' }}>
                            {song.name}
                        </h2>
                        <p className="m-0 mb-4 text-white/40"
                           style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                            {song.artist}
                        </p>
                        <div className="space-y-1.5 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                            <p className="text-white/50 m-0">
                                <span className="text-white/20 text-[10px] uppercase tracking-widest mr-2">Album</span>
                                {song.album}
                            </p>
                            <p className="text-white/50 m-0">
                                <span className="text-white/20 text-[10px] uppercase tracking-widest mr-2">Released</span>
                                {formatDate(song.releaseDate)}
                            </p>
                        </div>
                    </div>

                    <button
                        className="w-full py-3.5 rounded-lg text-white text-sm font-semibold
                                  cursor-pointer transition-all duration-300 relative overflow-hidden
                                  hover:-translate-y-0.5 active:translate-y-0 group"
                        style={{
                            fontFamily: 'Syne, sans-serif',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            fontSize: '12px',
                            background: '#1DB954',
                        }}
                        onClick={handleSaveToPlaylist}
                    >
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent
                                         -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        <span className="relative">+ Add to Playlist</span>
                    </button>
                </div>

                <div className="overflow-y-auto pr-1 flex flex-col gap-5">
                    {isLoadingInfo ? (
                        <div className="my-4 flex flex-col items-center gap-4 animate-fadeIn py-12">
                            <LoadingSpinner size="small" />
                            <p className="text-white/40 text-sm italic animate-pulse"
                               style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                Gathering song info...
                            </p>
                        </div>
                    ) : typeof songInfo === 'string' ? (
                        <div className="border-l-2 border-white/10 pl-5 py-1">
                            <p className="text-white/30 m-0 mb-2"
                               style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                                Info
                            </p>
                            <p className="text-white/60 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                {songInfo}
                            </p>
                        </div>
                    ) : infoSections.length > 0 ? (
                        <div className="space-y-5">
                            {infoSections.map((section, i) => (
                                <div key={i} className="border-l-2 border-primary/30 pl-5 py-1 transition-all duration-300 hover:border-primary/60">
                                    <p className="text-primary m-0 mb-3"
                                       style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                                        {section.label}
                                    </p>
                                    {section.content}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="border-l-2 border-white/10 pl-5 py-1">
                            <p className="text-white/30 m-0 mb-2"
                               style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                                Info
                            </p>
                            <p className="text-white/60 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                Additional song information is currently unavailable.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SongDetails;
```

- [ ] **Step 3: Delete old JSX files**

```bash
git rm src/Login.jsx src/SongDetails.jsx
```

- [ ] **Step 4: Verify type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 5: Commit**

```bash
git add src/Login.tsx src/SongDetails.tsx
git commit -m "feat: convert Login and SongDetails to TypeScript"
```

---

### Task 7: Convert App + entry point (full TS conversion checkpoint)

**Files:**
- Create: `src/App.tsx` (replaces `src/App.jsx`)
- Modify: `src/index.js` → typed as `src/index.tsx` (still CRA entry point for this task; renamed to `src/main.tsx` in Task 8's Vite cutover)
- Delete: `src/App.jsx`, `src/index.js`, `src/index.css` (dead/unused, see investigation notes)
- Modify: `src/reportWebVitals.js` → `src/reportWebVitals.ts` (typed now, web-vitals v2→v6 API upgrade deferred to Task 10 alongside the dependency bump)

**Interfaces:**
- Consumes: every component/API module converted in Tasks 1–6.
- Produces: `App` default export (no props) — the full application shell.

- [ ] **Step 1: Create `src/App.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate, useLocation, Navigate } from 'react-router-dom';
import SearchBar from './SearchBar';
import SearchResults from './SearchResults';
import Playlist from './Playlist';
import SongDetails from './SongDetails';
import Login from './Login';
import LoadingSpinner from './LoadingSpinner';
import { ToastProvider, useToast } from './contexts/ToastContext';
import SpotifyAPI from './api/SpotifyAPI';
import { SpotifyTrack } from './types/spotify';

const MainContent: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();
    const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
    const [playlist, setPlaylist] = useState<SpotifyTrack[]>([]);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [playlistName, setPlaylistName] = useState("My Playlist");

    useEffect(() => {
        const checkAuth = async () => {
            if (SpotifyAPI.isAuthenticated()) {
                setIsAuthenticated(true);
                setIsLoading(false);
                return;
            } else {
                try {
                    await SpotifyAPI.refreshAccessToken();
                    setIsAuthenticated(true);
                    setIsLoading(false);
                    return;
                } catch {
                    console.warn("Could not refresh token, redirecting to login");
                }
            }

            if (location.pathname === '/callback') {
                const params = new URLSearchParams(location.search);
                const code = params.get('code');
                const state = params.get('state');
                const storedState = localStorage.getItem('spotify_auth_state');

                try {
                    if (!code) throw new Error('No code provided');
                    if (state !== storedState) throw new Error('State mismatch');

                    await SpotifyAPI.handleAuthCallback(code);
                    setIsAuthenticated(true);
                    showToast('Successfully connected to Spotify', 'success');
                    navigate('/', { replace: true });
                } catch (error) {
                    console.error('Authentication error:', error);
                    showToast('Failed to connect to Spotify', 'error');
                    navigate('/login', { replace: true });
                } finally {
                    setIsLoading(false);
                }
                return;
            }

            if (!isAuthenticated && location.pathname !== '/login') {
                navigate('/login', { replace: true });
            }
            setIsLoading(false);
        };

        checkAuth();
    }, [location, navigate, isAuthenticated, showToast]);

    const searchSpotify = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            const results = await SpotifyAPI.searchTracks(query);
            setSearchResults(results);
            if (results.length === 0) {
                showToast('No songs found', 'error');
            }
        } catch (error) {
            console.error('Search error:', error);
            showToast('Failed to search songs', 'error');
            if (error instanceof Error && error.message === 'User not authenticated') {
                setIsAuthenticated(false);
                navigate('/login', { replace: true });
            }
        }
    };

    const addToPlaylist = (track: SpotifyTrack) => {
        if (!playlist.find(item => item.id === track.id)) {
            setPlaylist([...playlist, track]);
            showToast(`Added "${track.name}" to ${playlistName}`, 'success');
        } else {
            showToast('Song is already in playlist', 'error');
        }
    };

    const removeFromPlaylist = (trackId: string) => {
        const track = playlist.find(t => t.id === trackId);
        if (track) {
            setPlaylist(playlist.filter(t => t.id !== trackId));
            showToast(`Removed "${track.name}" from playlist`, 'success');
        }
    };

    const handleLogout = () => {
        SpotifyAPI.logout();
        setIsAuthenticated(false);
        setSearchResults([]);
        setPlaylist([]);
        showToast('Logged out successfully', 'success');
        navigate('/login', { replace: true });
    };

    const updatePlaylistName = (newName: string) => {
        setPlaylistName(newName);
        showToast(`Playlist renamed to "${newName}"`, 'success');
    };

    const clearPlaylist = () => {
        setPlaylist([]);
        showToast('Playlist cleared', 'success');
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-background to-background-elevated z-50">
                <LoadingSpinner size="large" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Login />;
    }

    return (
        <div className="min-h-screen p-5 text-center font-sans text-white bg-gradient-to-b from-background to-background-elevated relative">
            <div className="absolute inset-x-0 top-0 h-[300px] bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
            {!isAuthenticated ? (
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/callback" element={
                        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-background to-background-elevated z-50">
                            <LoadingSpinner size="large" />
                        </div>
                    } />
                    <Route path="*" element={<Login />} />
                </Routes>
            ) : (
                <>
                    <header className="max-w-[1200px] mx-auto mb-0 px-4 pt-6 pb-4 flex justify-between items-center relative z-10 md:flex-row md:gap-0 flex-col gap-4">
                        <h1
                            className="m-0 flex items-baseline gap-0 tracking-tight"
                            aria-label="SpotOn Music App"
                            style={{ fontFamily: 'Syne, sans-serif' }}
                        >
                            <span className="text-3xl md:text-4xl font-extrabold text-white uppercase tracking-wide">
                                Spot
                            </span>
                            <span className="text-3xl md:text-4xl font-extrabold text-primary uppercase tracking-wide">
                                On
                            </span>
                        </h1>
                        <button
                            className="text-white/40 text-sm cursor-pointer transition-all duration-300 hover:text-white relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-px after:bg-white after:transition-all after:duration-300 hover:after:w-full md:w-auto w-full"
                            style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.05em' }}
                            onClick={handleLogout}
                        >
                            logout
                        </button>
                    </header>
                    <div className="max-w-[1200px] mx-auto mb-8 px-4">
                        <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                    </div>
                    <SearchBar onSearch={searchSpotify} />
                    <Routes>
                        <Route path="/" element={
                            <div className="max-w-[1200px] mx-auto mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 px-4 animate-fadeIn">
                                <SearchResults
                                    searchResults={searchResults}
                                    onAddTrack={addToPlaylist}
                                />
                                <Playlist
                                    name={playlistName}
                                    onNameChange={updatePlaylistName}
                                    tracks={playlist}
                                    onRemoveTrack={removeFromPlaylist}
                                    onClearPlaylist={clearPlaylist}
                                />
                            </div>
                        } />
                        <Route path="/song/:id" element={
                            <SongDetails onAddToPlaylist={addToPlaylist} />
                        } />
                        <Route path="*" element={
                            <Navigate to="/" replace />
                        } />
                    </Routes>
                </>
            )}
        </div>
    );
};

const App: React.FC = () => {
    return (
        <Router>
            <ToastProvider>
                <MainContent />
            </ToastProvider>
        </Router>
    );
};

export default App;
```

- [ ] **Step 2: Create `src/reportWebVitals.ts`**

```typescript
import { ReportHandler } from 'web-vitals';

const reportWebVitals = (onPerfEntry?: ReportHandler) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};

export default reportWebVitals;
```

Note: kept on the v2 `get*`/`ReportHandler` API for this task since `web-vitals` itself isn't upgraded until Task 10 — upgrading the API here would fail to compile against the still-installed v2 package. Task 10 updates this file's imports to the v6 API (`onCLS`/`onINP`/etc.) in the same step it bumps the dependency.

- [ ] **Step 3: Create `src/index.tsx`**

```typescript
import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found');
}
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals(console.log);
```

Note: added a `null` check on `container` — `document.getElementById` returns `HTMLElement | null`, and `createRoot` requires a non-null `Element`. The original JS implicitly assumed non-null (CRA's `index.html` always has `<div id="root">`, so this never throws in practice); TypeScript's `strict` mode requires this to be made explicit. No behavior change for the real app, since `public/index.html` always provides `#root`.

- [ ] **Step 4: Delete old files**

```bash
git rm src/App.jsx src/index.js src/reportWebVitals.js src/index.css
```

- [ ] **Step 5: Verify type-check and build — full TS conversion checkpoint**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed. At this point every file under `src/` is `.ts`/`.tsx` (except the not-yet-converted test files, handled in Task 9).
Run: `find src -name "*.js" -o -name "*.jsx"` (excluding test/setup files) to confirm no stray JS/JSX component files remain.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/index.tsx src/reportWebVitals.ts
git commit -m "feat: convert App and entry point to TypeScript, remove dead index.css"
```

---

### Task 8: Cut over from CRA to Vite (+ Tailwind v4)

**Files:**
- Create: `index.html` (project root, replaces `public/index.html`)
- Delete: `public/index.html`
- Create: `vite.config.ts`
- Modify: `tsconfig.json` (Vite-specific settings), Create: `tsconfig.node.json`
- Create: `src/vite-env.d.ts`
- Rename: `src/index.tsx` → `src/main.tsx`
- Modify: `src/api/SpotifyAPI.ts`, `src/api/GeminiAPI.ts` (already use `import.meta.env.VITE_*` from Task 1 — now functionally correct under Vite)
- Delete: `tailwind.config.js`, `postcss.config.js`
- Modify: `src/styles/global.css` (Tailwind v4 CSS-first config)
- Modify: `package.json` (remove `react-scripts`, add `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`; update scripts)
- Modify: `.env` / `.env.example` if present (rename vars) — none exist in this repo, so this is a no-op; documented for anyone with a local untracked `.env`.

**Interfaces:**
- Consumes: all `src/` TS modules from Tasks 1–7.
- Produces: `npm run dev` (Vite dev server), `npm run build` (outputs to `dist/`), `npm run preview`.

- [ ] **Step 1: Install Vite tooling, remove react-scripts**

```bash
npm install --save-dev vite @vitejs/plugin-react @tailwindcss/vite
npm uninstall react-scripts autoprefixer postcss tailwindcss
npm install --save-dev tailwindcss@latest
```

- [ ] **Step 2: Create `vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
  },
});
```

- [ ] **Step 3: Create `src/vite-env.d.ts`**

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SPOTIFY_CLIENT_ID: string;
  readonly VITE_SPOTIFY_REDIRECT_URI: string;
  readonly VITE_GROQ_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 4: Rename entry point**

```bash
git mv src/index.tsx src/main.tsx
```

- [ ] **Step 5: Create root `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#1DB954" />
    <meta
      name="description"
      content="SpotOn - Your AI-powered music companion. Discover, organize, and enjoy music with intelligent insights."
    />

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet">

    <meta property="og:title" content="SpotOn - AI Music Companion" />
    <meta property="og:description" content="Discover and enjoy music with AI-powered insights." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://spoton.app" />
    <meta property="og:image" content="/og-image.png" />

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="SpotOn - AI Music Companion">
    <meta name="twitter:description" content="Discover and enjoy music with AI-powered insights.">
    <meta name="twitter:image" content="/og-image.png">

    <title>SpotOn - AI Music Companion</title>

    <style>
      body {
        background-color: #0D0C0E;
        margin: 0;
      }
    </style>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Delete old CRA `public/index.html`**

```bash
git rm public/index.html
```

Note: `%PUBLIC_URL%` placeholders (a CRA-only feature) are replaced with plain `/` paths above — Vite serves everything in `public/` from the site root automatically, so `/favicon.ico` and `/og-image.png` resolve the same way `%PUBLIC_URL%/favicon.ico` did under CRA. (`og-image.png` doesn't currently exist in `public/` — that's a pre-existing gap unrelated to this migration, left as-is.)

- [ ] **Step 7: Update `tsconfig.json` for Vite + add `tsconfig.node.json`**

Replace `tsconfig.json` with:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 8: Tailwind v4 CSS-first config in `src/styles/global.css`**

Replace the top of `src/styles/global.css` (the three `@tailwind` directives) with:

```css
@import "tailwindcss";

@theme {
  --font-syne: 'Syne', sans-serif;
  --font-dm-sans: 'DM Sans', sans-serif;

  --color-spotify-green: #1DB954;
  --color-spotify-green-light: #1ed760;
  --color-primary: #1DB954;
  --color-primary-light: #1ed760;
  --color-primary-dark: #1aa34a;

  --color-background: #0D0C0E;
  --color-background-elevated: #1A1625;

  --color-text-primary: #FFFFFF;
  --color-text-secondary: rgba(255, 255, 255, 0.7);
  --color-text-tertiary: rgba(255, 255, 255, 0.5);

  --color-surface-light: rgba(255, 255, 255, 0.1);
  --color-surface-lighter: rgba(255, 255, 255, 0.05);

  --color-border: rgba(255, 255, 255, 0.1);

  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.2);
  --shadow-DEFAULT: 0 4px 8px rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.2);

  --radius-sm: 4px;
  --radius-DEFAULT: 8px;
  --radius-lg: 12px;
  --radius-xl: 20px;

  --transition-duration-fast: 200ms;
  --transition-duration-DEFAULT: 300ms;
  --transition-duration-slow: 500ms;

  --animate-fadeIn: fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  --animate-slideIn: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  --animate-slideUp: slideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  --animate-pulse: pulse 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  --animate-spinSlow: spinSlow 3s linear infinite;
  --animate-shimmer: shimmer 2.5s linear infinite;
  --animate-bounce: bounce 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  --animate-drift: drift 6s ease-in-out infinite;
  --animate-soundbar: soundbar 1s ease-in-out infinite;
  --animate-vinyl: vinyl 4s linear infinite;
  --animate-glowPulse: glowPulse 3s ease-in-out infinite;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); filter: blur(5px); }
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
}
@keyframes slideIn {
  from { transform: translateX(-20px); opacity: 0; filter: blur(5px); }
  to { transform: translateX(0); opacity: 1; filter: blur(0); }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); filter: blur(5px); }
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
}
@keyframes pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(0.97); }
}
@keyframes spinSlow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}
@keyframes drift {
  0%, 100% { transform: translateY(0) translateX(0); }
  33% { transform: translateY(-8px) translateX(4px); }
  66% { transform: translateY(4px) translateX(-6px); }
}
@keyframes soundbar {
  0%, 100% { transform: scaleY(0.2); }
  50% { transform: scaleY(1); }
}
@keyframes vinyl {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes glowPulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
}
```

Keep the rest of `src/styles/global.css` (`::-webkit-scrollbar` rules, `:focus` rules, `@layer base { ... }` block) unchanged below this new header — Tailwind v4 still supports `@apply` and `@layer` inside plain CSS. One adjustment required: Tailwind v4 removed the `@screen` at-rule (used in the `@layer base` block for `@screen md`/`@screen lg` responsive typography). Replace those two blocks:

```css
    @screen md {
        html {
            @apply text-[16px];
        }
    }

    @screen lg {
        html {
            @apply text-[18px];
        }
    }
```

with native CSS media queries (Tailwind v4's recommended replacement):

```css
    @media (min-width: 768px) {
        html {
            @apply text-[16px];
        }
    }

    @media (min-width: 1024px) {
        html {
            @apply text-[18px];
        }
    }
```

- [ ] **Step 9: Delete old Tailwind v3 / PostCSS config**

```bash
git rm tailwind.config.js postcss.config.js
```

- [ ] **Step 10: Update `package.json` scripts**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview"
  }
}
```

(`test` script is added in Task 9; `eject` is removed — it was a `react-scripts`-only command with no Vite equivalent and nothing in this repo used it.)

- [ ] **Step 11: Verify dev server and build**

Run: `npm run build`
Expected: succeeds, produces `dist/index.html` and `dist/assets/*`.

Run: `npm run dev` (start in background or foreground briefly), open `http://localhost:5173` in a browser.
Expected: Login screen renders with correct styling (color blobs, gradients, fonts) — confirms Tailwind v4 theme translated correctly. Stop the dev server after confirming.

- [ ] **Step 12: Commit**

```bash
git add index.html vite.config.ts tsconfig.json tsconfig.node.json src/vite-env.d.ts src/main.tsx src/styles/global.css package.json package-lock.json
git commit -m "feat: migrate build tooling from Create React App to Vite, upgrade Tailwind to v4"
```

---

### Task 9: Vitest setup + test conversion

**Files:**
- Create: `src/setupTests.ts` (replaces `src/setupTests.js`)
- Create: `src/App.test.tsx` (replaces `src/App.test.js`)
- Modify: `vite.config.ts` (add `test` block)
- Modify: `package.json` (add `vitest`, `jsdom`, update `@testing-library/*`; add `test` script)
- Delete: `src/setupTests.js`, `src/App.test.js`

**Interfaces:**
- Consumes: `App` (Task 7), mocks `SpotifyAPI` (Task 1).
- Produces: `npm test` runs Vitest.

- [ ] **Step 1: Install Vitest + jsdom, update Testing Library**

```bash
npm install --save-dev vitest jsdom
npm install --save-dev @testing-library/dom@latest @testing-library/jest-dom@latest @testing-library/react@latest @testing-library/user-event@latest
```

- [ ] **Step 2: Add `test` block to `vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    globals: true,
  },
});
```

- [ ] **Step 3: Create `src/setupTests.ts`**

```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 4: Write the new `src/App.test.tsx`**

The original test (`screen.getByText(/learn react/i)`) asserted on CRA boilerplate text that `App` never actually renders — it was stale from project scaffolding and untested by CI (no `test` step exists in `.github/workflows/ci-cd.yml`). Replace it with a real smoke test: with no stored Spotify tokens, `App` should render the `Login` screen's "Connect with Spotify" button. `SpotifyAPI.init()` is mocked so the test doesn't depend on a real `VITE_SPOTIFY_CLIENT_ID` being set.

```typescript
import { render, screen } from '@testing-library/react';
import { vi, test, expect, beforeEach } from 'vitest';
import App from './App';

vi.mock('./api/SpotifyAPI', () => ({
  default: {
    init: vi.fn(),
    isAuthenticated: vi.fn(() => false),
    refreshAccessToken: vi.fn(() => Promise.reject(new Error('no refresh token'))),
    logout: vi.fn(),
  },
}));

beforeEach(() => {
  localStorage.clear();
});

test('renders the login screen when the user is not authenticated', async () => {
  render(<App />);
  const loginButton = await screen.findByRole('button', { name: /connect with spotify/i });
  expect(loginButton).toBeInTheDocument();
});
```

- [ ] **Step 5: Delete old test/setup files**

```bash
git rm src/App.test.js src/setupTests.js
```

- [ ] **Step 6: Add `test` script to `package.json`**

```json
{
  "scripts": {
    "test": "vitest run"
  }
}
```

- [ ] **Step 7: Run the test suite**

Run: `npm test`
Expected: `renders the login screen when the user is not authenticated` passes.

- [ ] **Step 8: Commit**

```bash
git add vite.config.ts src/setupTests.ts src/App.test.tsx package.json package-lock.json
git commit -m "test: migrate from Jest (react-scripts) to Vitest, replace stale CRA smoke test"
```

---

### Task 10: Final dependency cleanup, deploy config, and full verification

**Files:**
- Modify: `package.json` (remove dead deps, bump remaining deps, bump `react-router-dom` to v7)
- Modify: `src/reportWebVitals.ts` (web-vitals v2 → v6 API)
- Modify: `Dockerfile` (env var names, `dist/` output)
- Modify: `.github/workflows/ci-cd.yml` (build-arg names)
- Create: `vercel.json`

**Interfaces:**
- Consumes: everything from Tasks 1–9.
- Produces: final, fully modernized dependency set and deploy configuration.

- [ ] **Step 1: Remove dead dependencies**

```bash
npm uninstall @google/generative-ai express-session
```

- [ ] **Step 2: Bump remaining dependencies to latest**

```bash
npm install react-router-dom@latest
npm install --save-dev js-sha256@latest web-vitals@latest
```

(`react`, `react-dom`, `@testing-library/*`, and `tailwindcss` were already brought to latest in Tasks 8–9; this step covers what's left per the `npm outdated` audit from the design phase.)

- [ ] **Step 3: Update `src/reportWebVitals.ts` to the web-vitals v6 API**

```typescript
import type { Metric } from 'web-vitals';

const reportWebVitals = (onPerfEntry?: (metric: Metric) => void) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
      onCLS(onPerfEntry);
      onINP(onPerfEntry);
      onFCP(onPerfEntry);
      onLCP(onPerfEntry);
      onTTFB(onPerfEntry);
    });
  }
};

export default reportWebVitals;
```

Note: `onFID` doesn't exist in web-vitals v5+ (Google deprecated the First Input Delay metric in favor of Interaction to Next Paint); `onINP` is its direct replacement, reporting on the same "responsiveness" category of the original five Core Web Vitals calls. This is a mechanical API-name update to keep the same reporting behavior, not a new feature.

- [ ] **Step 4: Verify react-router-dom v7 didn't change behavior**

Run: `npx tsc --noEmit && npm run build && npm test`
Expected: all succeed — the app's router usage (`BrowserRouter`, `Routes`, `Route`, `useNavigate`, `useLocation`, `Navigate`) is unchanged between v6 and v7.

- [ ] **Step 5: Update `Dockerfile`**

```dockerfile
########################################
# Stage 1: Build Vite app
########################################
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_SPOTIFY_CLIENT_ID
ARG VITE_SPOTIFY_REDIRECT_URI
ARG VITE_GROQ_API_KEY
ENV VITE_SPOTIFY_CLIENT_ID=$VITE_SPOTIFY_CLIENT_ID
ENV VITE_SPOTIFY_REDIRECT_URI=$VITE_SPOTIFY_REDIRECT_URI
ENV VITE_GROQ_API_KEY=$VITE_GROQ_API_KEY

RUN npm run build

########################################
# Stage 2: Serve with custom NGINX
########################################
FROM nginx:stable-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

(Node base image bumped from `node:18-alpine` to `node:20-alpine` — Vite 6 requires Node 18+, and 20 is the current LTS; also fixes the pre-existing `REACT_APP_GEMINI_API_KEY` build arg that pointed at nothing since the Groq switch, matching the naming used by `GeminiAPI.ts`'s `VITE_GROQ_API_KEY`.)

- [ ] **Step 6: Update `.github/workflows/ci-cd.yml` build args**

```yaml
      - name: Build Docker image
        run: |
          docker build \
            --build-arg VITE_SPOTIFY_CLIENT_ID=${{ secrets.SPOTIFY_CLIENT_ID }} \
            --build-arg VITE_SPOTIFY_REDIRECT_URI=${{ secrets.SPOTIFY_REDIRECT_URI }} \
            --build-arg VITE_GROQ_API_KEY=${{ secrets.GROQ_API_KEY }} \
            -t ${{ secrets.DOCKERHUB_USERNAME }}/spoton:latest \
            .
```

(`secrets.GEMINI_API_KEY` → `secrets.GROQ_API_KEY`, matching the actual GitHub Actions secret this repo should have configured for the Groq-backed `GeminiAPI.ts`. If the secret is still named `GEMINI_API_KEY` in the repo's Actions settings, rename it there to `GROQ_API_KEY` to match — flagged for the person merging this, not fixable from the codebase alone.)

- [ ] **Step 7: Create `vercel.json`**

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- [ ] **Step 8: Full verification pass**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run build`
Expected: succeeds, `dist/` produced.

Run: `npm test`
Expected: passes.

Run: `npm run dev`, manually walk through in a browser: login redirect → (with real Spotify credentials in a local `.env`) OAuth callback → search → add track to playlist → remove track → rename playlist → open a song's detail page (Groq-backed summary loads) → logout. Confirms no behavioral regressions end-to-end. Stop the dev server after.

Run: `git status` and confirm no leftover `.js`/`.jsx` files remain anywhere under `src/`, and `package.json` no longer lists `react-scripts`, `@google/generative-ai`, or `express-session`.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json src/reportWebVitals.ts Dockerfile .github/workflows/ci-cd.yml vercel.json
git commit -m "chore: remove dead dependencies, bump remaining deps to latest, update Docker/CI/Vercel config for Vite"
```
