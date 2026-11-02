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
- **Sample Family Tree** – What a song samples, and what those songs sample, from Genius. "Check the audio" runs a fingerprint matcher on both songs' 30-second previews and, when it hears the sample, says where it sits and how it was changed (pitch, speed, sped up like a record or stretched in software), with an A/B player. Measured on held-out real pairs: 4 of 30 confirmed, 0 of 60 unrelated pairs wrongly confirmed ([matcher/eval/RESULTS.md](matcher/eval/RESULTS.md)); most misses are likely samples outside the previews.
- **Save to Playlist** – Build a local playlist from search results or a song's detail page
- **Deep Research Agent** – A multi-step, tool-calling AI agent (Gemini Flash by default, via any OpenAI-compatible API) that searches Spotify, Genius, and the live web before generating the cited song report above, streamed live via SSE with step-by-step progress
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
- **Gemini API** (`gemini-3.5-flash-lite` by default, tool-calling via its OpenAI-compatible endpoint; set `LLM_BASE_URL` / `LLM_MODEL` to use another provider)
- **Genius API**
- **Tavily API** (live web search)
- **Upstash Redis** (research report caching)

### Backend Architecture

- **`api/research-song.ts`** – a Vercel Edge Function that:
  - Checks Upstash Redis for a cached report before doing any work
  - Runs the multi-step research agent (`api/_lib/researchAgent.ts`) with tool-calling over Spotify, Genius, and web search
  - Fetches Spotify's audio features for the track, falling back to an AI estimate when unavailable
  - Manages server-only API credentials (LLM, Tavily, Genius, Spotify, Upstash Redis)
  - Streams progress steps and the final cited report back to the client over Server-Sent Events
- **`api/sample-tree.ts`** / **`api/sample-match.ts`** – Edge Functions for the sample family tree (Genius song relationships, cached a day) and audio checks (cached per pair, rate-limited, forwarded to the matcher)
- **`matcher/`** – a private Python service: pitch- and tempo-invariant triplet fingerprints with background score normalization, tested on synthetic audio with exact ground truth. See [matcher/README.md](matcher/README.md)

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
   - The OAuth redirect is always `<the origin you open the app on>/callback` (e.g. `http://127.0.0.1:3000/callback` for `npm run dev`, `http://127.0.0.1:8080/callback` for Docker). Register each one in your Spotify app's dashboard.

3. **To test the deep research agent locally**, use `vercel dev` instead of `npm run dev`. This runs both the Vite development server and the Vercel Edge Functions (where the research agent lives) alongside each other:
   ```
   vercel dev
   ```
   Set the server-only env vars (listed in `.env.example`'s comment — `LLM_API_KEY`, `TAVILY_API_KEY`, `GENIUS_ACCESS_TOKEN`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) via `vercel env pull` or manually in the Vercel dashboard.

4. **For plain client-side testing** (without the research agent), start the dev server:
   ```
   npm run dev
   ```

### Running the full app in Docker (no Vercel, no Upstash account)

The same API handlers run in a plain Node server (`server/index.ts`) that also serves the built frontend and `GET /healthz`. `compose.yaml` adds the sample matcher (no published port; only the app reaches it) and a local Redis behind Upstash's HTTP protocol, so caching works offline. Audio checks only run where a matcher is deployed (compose today); on Vercel the sample tree still shows, without the audio buttons.

```
docker compose up --build        # http://127.0.0.1:8080
docker compose logs -f app
docker compose down              # add -v to also wipe the local cache
```

Server keys come from `.env` at runtime and are never baked into the image; any missing tool key just degrades that tool. The image runs as a non-root user on a read-only filesystem. Without Docker: `npm run build && npm run build:server && npm start`.

### Container CI

`.github/workflows/container.yml` builds the image on every PR and push to `master`, boots it with `scripts/smoke-test.sh` (health check, non-root user, read-only filesystem, routes, graceful stop), and fails on fixable HIGH/CRITICAL vulnerabilities found by Trivy. It also rescans weekly. Pushes to `master` then publish `ghcr.io/minhpham1810/spoton:sha-<commit>` with provenance and an SBOM, using only the workflow's `GITHUB_TOKEN`. Set the public Spotify client ID as a repository variable: `gh variable set VITE_SPOTIFY_CLIENT_ID`. Run the same smoke test locally with `docker build -t spoton:local . && scripts/smoke-test.sh spoton:local`. A separate job runs the matcher's tests inside its image build (`--target test`), smoke-tests it with `scripts/smoke-test-matcher.sh` and scans it the same way.

### Rate limits

Fresh reports spend LLM and Tavily quota, so they are limited (cached reports are not): 5 per client IP per hour and 15 per day in total by default (`RESEARCH_LIMIT_PER_IP_HOUR`, `RESEARCH_LIMIT_GLOBAL_PER_DAY`). 15/day keeps the worst case inside Tavily's 1,000 free monthly credits. Over the limit the API returns `429` with `Retry-After`; if Redis is unreachable it refuses fresh runs with `503` rather than spending quota without counting.

> **Note for deployments (e.g. Vercel):** this project was migrated from Create React App to Vite, so env vars must use the `VITE_` prefix instead of the old `REACT_APP_` prefix. If your hosting dashboard still has `REACT_APP_SPOTIFY_CLIENT_ID` configured, rename it to `VITE_SPOTIFY_CLIENT_ID` in the dashboard — this cannot be changed from the codebase.

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
