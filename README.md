# SpotOn: AI-Powered Music Discovery

> **"Don't just hear the music—connect with it."**

## Why SpotOn?

In today's streaming era, finding music is easy. But finding music that **truly connects**—to your mood, your moment, your story—is something else.

**SpotOn** blends the power of AI and Spotify's massive catalog to deliver **emotionally intelligent** song discovery. Whether you're building a vibe-based playlist, diving into new genres, or exploring an artist's catalog, SpotOn makes the experience meaningful **even before you actually hear the song**.

No more generic recommendations. Just music that feels **SpotOn**.

---

## Features

- **Spotify Login** – PKCE OAuth against your own Spotify account, with session persistence and silent token refresh
- **Smart Song Search** – Real-time Spotify catalog search with debounced input, recent searches, and loading/empty/error states
- **Song Details View** – A full research report per track, including:
  - Emotional Fingerprint – an interpretive read on the song's emotional arc, signature musical move, and the moment it answers
  - Sonic Fingerprint – a radar chart of danceability, energy, valence, acousticness, and instrumentalness (from Spotify's audio features, or an AI estimate when unavailable)
  - Summary, musical elements, and cultural context
  - Credits, key findings (rated verified / inferred / speculative with sources), genres, and cited sources
  - An audio preview player and cover-art-driven accent theming
- **Save to Playlist** – Build a local playlist from search results or a song's detail page
- **Deep Research Agent** – A multi-step, tool-calling AI agent (Groq/Llama 3.3 70B) that searches Spotify, Genius, and the live web before generating the cited song report above, streamed live via SSE with step-by-step progress
- **Intuitive Navigation** – Smooth transitions between search, playlist, and song detail views using React Router

---

## Tech Stack

### Deployment

- **Vercel** – Hosts both the Vite frontend and the Deep Research Agent as an Edge Function

### Frontend

- **React 19** + **React Router**
- **Vite**
- **Tailwind CSS v4**

### AI & APIs

- **Spotify Web API**
- **Groq** (Llama 3.3 70B, tool-calling)
- **Genius API**
- **Tavily API** (live web search)
- **Upstash Redis** (research report caching)

### Backend Architecture

- **`api/research-song.ts`** – a Vercel Edge Function that:
  - Checks Upstash Redis for a cached report before doing any work
  - Runs the multi-step research agent (`api/_lib/groqAgent.ts`) with tool-calling over Spotify, Genius, and web search
  - Fetches Spotify's audio features for the track, falling back to an AI estimate when unavailable
  - Manages server-only API credentials (Groq, Tavily, Genius, Spotify, Upstash Redis)
  - Streams progress steps and the final cited report back to the client over Server-Sent Events

---

## Local development

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in the values:
   ```
   cp .env.example .env
   ```
   - `VITE_SPOTIFY_CLIENT_ID` – your Spotify app's client ID
   - `VITE_SPOTIFY_REDIRECT_URI` – the OAuth redirect URI registered with your Spotify app (e.g. `http://127.0.0.1:3000`)

3. **To test the deep research agent locally**, use `vercel dev` instead of `npm run dev`. This runs both the Vite development server and the Vercel Edge Functions (where the research agent lives) alongside each other:
   ```
   vercel dev
   ```
   Set the server-only env vars (listed in `.env.example`'s comment — `GROQ_API_KEY`, `TAVILY_API_KEY`, `GENIUS_ACCESS_TOKEN`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) via `vercel env pull` or manually in the Vercel dashboard.

4. **For plain client-side testing** (without the research agent), start the dev server:
   ```
   npm run dev
   ```

> **Note for deployments (e.g. Vercel):** this project was migrated from Create React App to Vite, so env vars must use the `VITE_` prefix instead of the old `REACT_APP_` prefix. If your hosting dashboard still has `REACT_APP_SPOTIFY_CLIENT_ID` or `REACT_APP_SPOTIFY_REDIRECT_URI` configured, you must manually rename them to `VITE_SPOTIFY_CLIENT_ID` and `VITE_SPOTIFY_REDIRECT_URI` respectively in the dashboard — this cannot be changed from the codebase.

### Testing & linting

```
npm test        # run the Vitest suite once
npm run lint     # eslint .
npm run build    # tsc --noEmit, then vite build
```

---

## Deployment

SpotOn is deployed on **Vercel** for the full feature set (including the deep research agent). Configure the server-only environment variables in your Vercel project settings to enable the research agent.

---

## Future Improvements

- **Spotify Premium Playback** support
- **User reviews & social features**
- **Advanced UI theming and animations**
- **Persistent playlist storage** with MongoDB/PostgreSQL

---

Explore the intersection of music and machine intelligence with SpotOn.
