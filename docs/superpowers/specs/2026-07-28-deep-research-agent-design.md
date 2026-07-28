# SpotOn Deep Research Agent — Design

## Goal

Replace the current one-shot Groq summary (`src/api/GeminiAPI.ts`) with a genuine agentic research pipeline. Given a track, an LLM agent autonomously decides which tools to call — Spotify catalog data, Genius lyrics/annotations, live web search — reasons over the results across multiple steps, and produces a grounded, cited "discovery report." The report replaces today's summary entirely on `SongDetails`.

This is the first of two planned agentic features for SpotOn. A second concept — autonomous playlist curation, where the agent independently assembles a playlist from a goal like "road trip playlist" or "songs like X but sadder" — was discussed and deferred to a future spec.

## Current State

- `SongDetails.tsx` calls `GeminiAPI.generateSongInfo()`, which makes a single Groq chat-completion request (`llama-3.3-70b-versatile`) with a fixed prompt and parses the JSON response into a `SongInfo` object. No tools, no multi-step reasoning, no external grounding beyond the model's training data.
- The app is a pure client-side Vite SPA (served by nginx in Docker, or as a static build on Vercel). All `VITE_*` env vars — including today's Groq key — are baked into the client bundle at build time and are visible to anyone who inspects the deployed JS.
- No backend, no database, no caching layer exists today.

## Architecture

### Server-side agent (new)

A multi-step tool-calling loop cannot run safely or practically in the browser (it would ship three third-party API keys client-side and require chaining several round-trips). It runs server-side instead:

- **New Vercel serverless function**: `api/research-song.ts`. Runs the agent loop, holds all third-party keys as server-only env vars (`GROQ_API_KEY`, `TAVILY_API_KEY`, `GENIUS_API_KEY` — no `VITE_` prefix, never sent to the client).
- **Agent loop**: uses Groq's OpenAI-compatible tool-calling API. On each turn the model chooses to call a tool or produce a final report; tool results are fed back in; the loop ends when the model emits a final structured report or a hard cap of 6 tool-call rounds is reached (whichever comes first). The cap bounds latency and, more importantly, bounds Tavily credit spend (see Budget below).
- **Tools available to the agent**:
  - `spotify_search`, `spotify_related_artists`, `spotify_artist_top_tracks` — thin wrappers around logic already in `src/api/SpotifyAPI.ts`, reused server-side.
  - `genius_lookup` — searches Genius for the track, returns metadata/annotations/description (Genius's public API does not return verbatim lyrics text due to licensing; the agent uses it for themes/context, not transcription).
  - `web_search` — Tavily, for reviews, "story behind the song," and cultural-context grounding.
- **Streaming trace**: the function streams Server-Sent Events with two event types:
  - `step` — `{ tool: string; status: string }`, one per tool call, used to render a live research trace in the UI.
  - `report` — the final structured `SongInfo` payload, sent once and ending the stream.
- **Cache**: report results are cached in Upstash Redis (provisioned via the Vercel Marketplace integration — Vercel's native "Vercel KV" product is deprecated), keyed by Spotify track ID. On request, the function checks Redis first; on a hit it streams the cached `report` event immediately with no `step` events (matching today's fast, instant-feeling UX for repeat views). On a miss, it runs the full agent loop and writes the result to Redis on success.

### Budget constraints (all free-tier, $0)

| Service | Free tier | Constraint this design respects |
|---|---|---|
| Groq | No card, rate-limited (30 RPM / 6K TPM / 14.4K req/day) | Agent loop capped at 6 rounds keeps per-report token/request usage bounded |
| Tavily | 1,000 search credits/month, no card | This is the tightest budget — the agent is limited to at most 1-2 `web_search` calls per report; caching means repeat views of the same song cost zero additional credits |
| Genius | Free (no paid tier exists) | No hard published rate limit found; treated as effectively free but worth confirming empirically once a key is issued |
| Upstash Redis (Vercel Marketplace) | 500K commands/month, 256MB | Trivial for this workload — cache reads/writes are one command each |
| Vercel serverless functions | Included on Hobby plan | No additional cost at this app's scale |

## Data Flow

1. User opens `SongDetails` for a track.
2. Frontend calls `api/research-song?trackId=...`, opens a streaming connection.
3. Server checks Redis for a cached report keyed by `trackId`.
   - **Hit**: stream a single `report` event; done.
   - **Miss**: start the agent loop.
4. Agent loop: Groq model receives the track's known metadata (name/artist/album) and the tool definitions, decides which tool(s) to call, receives results, and iterates (≤6 rounds) until it emits a final `SongInfo` JSON object with populated `sources`.
5. Each tool call the server executes also emits a `step` SSE event to the client in real time.
6. On loop completion, the server writes the report to Redis and streams the final `report` event.
7. Frontend renders the trace live as `step` events arrive, then swaps to the finished report view once `report` arrives.

## Report Schema Changes

Extend the existing `SongInfo` type (`src/types/song-info.ts`) with a `sources` field:

```ts
export interface SongInfoSource {
  label: string; // e.g. "Genius", "Rolling Stone (via web search)"
  url: string;
}

export interface SongInfo {
  summary: string;
  musicalAnalysis: SongInfoMusicalAnalysis;
  genre: string[];
  culturalContext: SongInfoCulturalContext;
  credits: SongInfoCredit[];
  highlights: string[];
  sources: SongInfoSource[]; // new
}
```

All existing fields keep their shape so existing report-rendering components need minimal changes — only the addition of source badges/links.

## Frontend UX

`SongDetails.tsx` moves from an instant single-fetch render to a two-phase view:

1. **Research trace** (agent-loop path only): a simple appending list rendered as `step` events arrive over the stream (e.g. "Searching Spotify for related artists…", "Reading lyrics annotations on Genius…", "Searching the web for cultural context…"), styled consistently with the existing `LoadingSpinner`.
2. **Final report**: once the `report` event arrives, swap to the existing report layout, now with small "via [source]" links attached to the sections whose content came from Genius/Tavily.

On a cache hit, the trace phase is skipped entirely — the report event is streamed immediately, preserving today's fast feel for repeat views.

## Error Handling

- Per-tool failures (Genius has no match, Tavily times out, etc.) are non-fatal: the agent proceeds with whatever information it has rather than aborting the whole request.
- The 6-round cap guarantees the function always terminates, bounding both latency and Tavily spend even if the model loops indecisively.
- If Groq itself errors (rate limit, etc.), reuse the existing retry-with-backoff pattern from today's `GeminiAPI.ts`; surface a final failure as a Toast, consistent with current error UX.

## Testing

- Unit tests for each tool wrapper (Spotify, Genius, Tavily) with mocked HTTP responses.
- Unit tests for the Redis cache read/write logic.
- An integration-style test of the agent loop against a mocked Groq client, asserting it terminates within the round cap and produces a valid `SongInfo` object matching the schema.
- Update existing `SongDetails`/`Toast` component tests for the new two-phase (trace → report) rendering, including the cache-hit fast path.

## Out of Scope (deferred)

- Autonomous playlist curation (goal-directed playlist assembly) — a distinct agentic feature, to be designed separately.
- Persistent playlist storage (MongoDB/PostgreSQL) — already flagged as a future improvement in the README, unrelated to this feature.
