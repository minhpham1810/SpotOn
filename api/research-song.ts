import { runResearchAgent, type AgentTool } from './_lib/groqAgent';
import { getCachedReport, setCachedReport } from './_lib/cache';
import { spotifySearch, spotifyRelatedArtists, spotifyArtistTopTracks } from './_lib/tools/spotifyTools';
import { geniusLookup } from './_lib/tools/geniusTool';
import { webSearch } from './_lib/tools/webSearchTool';
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
      description: "Search Spotify's catalog for tracks matching a free-text query.",
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Search query' } },
        required: ['query'],
      },
      execute: async (args) => spotifySearch(String(args.query), spotifyCreds),
    },
    {
      name: 'spotify_related_artists',
      description: 'Get artists Spotify considers related to the given artist name.',
      parameters: {
        type: 'object',
        properties: { artistName: { type: 'string', description: 'Artist name' } },
        required: ['artistName'],
      },
      execute: async (args) => spotifyRelatedArtists(String(args.artistName), spotifyCreds),
    },
    {
      name: 'spotify_artist_top_tracks',
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
        const cached = await getCachedReport(trackId);
        if (cached) {
          send('report', cached);
          controller.close();
          return;
        }

        const report: SongInfo = await runResearchAgent({
          track: { name: trackName, artist: artistName, album },
          tools: buildTools(),
          groqApiKey: process.env.GROQ_API_KEY as string,
          onStep: (step) => send('step', step),
        });

        await setCachedReport(trackId, report);
        send('report', report);
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
