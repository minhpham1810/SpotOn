import { runResearchAgent, type AgentTool } from './_lib/groqAgent';
import { getCachedReport, setCachedReport } from './_lib/cache';
import { spotifySearch, spotifyArtistTopTracks } from './_lib/tools/spotifyTools';
import { geniusLookup } from './_lib/tools/geniusTool';
import { webSearch } from './_lib/tools/webSearchTool';
import { spotifyAudioFeatures } from './_lib/tools/spotifyAudioFeatures';
import type { SongInfo } from '../src/types/song-info';

export const config = { runtime: 'edge' };

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function buildTools(): AgentTool[] {
  const spotifyCreds = {
    clientId: process.env.SPOTIFY_CLIENT_ID as string,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET as string,
  };
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

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const trackId = url.searchParams.get('trackId');
  const trackName = url.searchParams.get('name');
  const artistName = url.searchParams.get('artist');
  const album = url.searchParams.get('album') ?? undefined;

  if (!trackId || !trackName || !artistName) {
    return new Response(JSON.stringify({ error: 'trackId, name, and artist are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => controller.enqueue(encoder.encode(sseEvent(event, data)));

      try {
        let cached: SongInfo | null = null;
        try {
          cached = await getCachedReport(trackId);
        } catch (cacheError) {
          console.error('getCachedReport failed, falling back to a fresh run:', cacheError);
        }

        if (cached) {
          send('report', cached);
          return;
        }

        const spotifyCreds = {
          clientId: process.env.SPOTIFY_CLIENT_ID as string,
          clientSecret: process.env.SPOTIFY_CLIENT_SECRET as string,
        };

        let audioFeatures: Awaited<ReturnType<typeof spotifyAudioFeatures>> | null = null;
        try {
          audioFeatures = await spotifyAudioFeatures(trackId, spotifyCreds);
        } catch (audioFeaturesError) {
          console.error('spotifyAudioFeatures failed, the agent will estimate instead:', audioFeaturesError);
          audioFeatures = null;
        }

        const report: SongInfo = await runResearchAgent({
          track: { name: trackName, artist: artistName, album },
          tools: buildTools(),
          groqApiKey: process.env.GROQ_API_KEY as string,
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

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
