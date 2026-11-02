import { runResearchAgent, type AgentTool } from './_lib/researchAgent';
import { getCachedReport, setCachedReport } from './_lib/cache';
import { takeResearchBudget, clientIp, type ResearchBudget } from './_lib/rateLimit';
import { spotifySearch, spotifyArtistTopTracks } from './_lib/tools/spotifyTools';
import { geniusLookup } from './_lib/tools/geniusTool';
import { webSearch } from './_lib/tools/webSearchTool';
import { spotifyAudioFeatures } from './_lib/tools/spotifyAudioFeatures';
import type { SongInfo } from '../src/types/song-info';

export const config = { runtime: 'edge' };

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function getSpotifyCreds() {
  return {
    clientId: process.env.SPOTIFY_CLIENT_ID as string,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET as string,
  };
}

function buildTools(): AgentTool[] {
  const spotifyCreds = getSpotifyCreds();
  const geniusToken = process.env.GENIUS_ACCESS_TOKEN as string;
  const tavilyKey = process.env.TAVILY_API_KEY as string;

  return [
    {
      name: 'spotify_search',
      label: "Searching Spotify's catalog",
      description: "Search Spotify's catalog for tracks matching a free-text query.",
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Search query' } },
        required: ['query'],
      },
      execute: async (args) => spotifySearch(String(args.query), spotifyCreds),
    },
    {
      name: 'spotify_artist_top_tracks',
      label: "Checking the artist's top tracks on Spotify",
      description: "Get an artist's top tracks on Spotify.",
      parameters: {
        type: 'object',
        properties: { artistName: { type: 'string', description: 'Artist name' } },
        required: ['artistName'],
      },
      execute: async (args) => spotifyArtistTopTracks(String(args.artistName), spotifyCreds),
    },
    {
      name: 'genius_lookup',
      label: 'Reading lyrics annotations on Genius',
      description: "Look up a song's Genius page for its description and annotations.",
      parameters: {
        type: 'object',
        properties: {
          trackName: { type: 'string', description: 'Track name' },
          artistName: { type: 'string', description: 'Artist name' },
        },
        required: ['trackName', 'artistName'],
      },
      execute: async (args) => geniusLookup(String(args.trackName), String(args.artistName), geniusToken),
    },
    {
      name: 'web_search',
      label: 'Searching the web for cultural context',
      description: 'Search the live web for reviews, cultural context, or the story behind a song.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Search query' } },
        required: ['query'],
      },
      execute: async (args) => webSearch(String(args.query), tavilyKey),
    },
  ];
}

function jsonError(status: number, error: string, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

// X-Report-Source tells logs and metrics how a request was answered: cache, fresh, limited, limiter-down.
function sseResponse(stream: ReadableStream, source: 'cache' | 'fresh'): Response {
  return new Response(stream, {
    headers: {
      'X-Report-Source': source,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

// trackId becomes a cache key and the text fields go into the LLM prompt, so bound both.
const TRACK_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_TEXT_LENGTH = 200;

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const trackId = url.searchParams.get('trackId');
  const trackName = url.searchParams.get('name');
  const artistName = url.searchParams.get('artist');
  const album = url.searchParams.get('album') ?? undefined;

  if (!trackId || !trackName || !artistName) {
    return jsonError(400, 'trackId, name, and artist are required');
  }
  if (!TRACK_ID_PATTERN.test(trackId) || [trackName, artistName, album ?? ''].some((v) => v.length > MAX_TEXT_LENGTH)) {
    return jsonError(400, 'trackId must be 1-64 letters, digits, - or _; name, artist and album at most 200 characters');
  }

  let cached: SongInfo | null = null;
  try {
    cached = await getCachedReport(trackId);
  } catch (cacheError) {
    console.error('getCachedReport failed, falling back to a fresh run:', cacheError);
  }

  if (cached) {
    const report = cached;
    return sseResponse(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(sseEvent('report', report)));
          controller.close();
        },
      }),
      'cache'
    );
  }

  // Fail closed: if the limiter can't count, don't spend LLM/Tavily quota blind.
  let budget: ResearchBudget;
  try {
    budget = await takeResearchBudget(clientIp(request));
  } catch (limitError) {
    console.error('takeResearchBudget failed, refusing the fresh run:', limitError);
    return jsonError(503, 'New song reports are temporarily unavailable. Please try again shortly.', {
      'Retry-After': '60',
      'X-Report-Source': 'limiter-down',
    });
  }
  if (!budget.allowed) {
    const minutes = Math.ceil(budget.retryAfterSeconds / 60);
    const message =
      budget.reason === 'ip'
        ? `You've reached the limit for new song reports. Try again in about ${minutes} minutes.`
        : `SpotOn has used today's budget for new song reports. Try again in about ${Math.ceil(minutes / 60)} hours.`;
    return jsonError(429, message, { 'Retry-After': String(budget.retryAfterSeconds), 'X-Report-Source': 'limited' });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => controller.enqueue(encoder.encode(sseEvent(event, data)));

      try {
        let audioFeatures: Awaited<ReturnType<typeof spotifyAudioFeatures>> | null = null;
        try {
          audioFeatures = await spotifyAudioFeatures(trackId, getSpotifyCreds());
        } catch (audioFeaturesError) {
          console.error('spotifyAudioFeatures failed, the agent will estimate instead:', audioFeaturesError);
          audioFeatures = null;
        }

        const report: SongInfo = await runResearchAgent({
          track: { name: trackName, artist: artistName, album },
          tools: buildTools(),
          apiKey: process.env.LLM_API_KEY as string,
          spotifyAudioFeatures: audioFeatures,
          onStep: (step) => send('step', step),
        });

        send('report', report);

        setCachedReport(trackId, report).catch((cacheError) => {
          console.error('setCachedReport failed:', cacheError);
        });
      } catch (error) {
        send('error', { message: error instanceof Error ? error.message : String(error) });
      } finally {
        controller.close();
      }
    },
  });

  return sseResponse(stream, 'fresh');
}
