import type { SongInfo } from '../types/song-info';

export interface ResearchTrack {
  id: string;
  name: string;
  artist: string;
  album?: string;
}

export interface ResearchStepEvent {
  tool: string;
  status: string;
}

interface ParsedSseEvent {
  event: string;
  data: string;
}

function parseSseBlock(block: string): ParsedSseEvent {
  const lines = block.split('\n');
  const eventLine = lines.find((l) => l.startsWith('event:'));
  const dataLine = lines.find((l) => l.startsWith('data:'));
  return {
    event: eventLine ? eventLine.replace('event:', '').trim() : 'message',
    data: dataLine ? dataLine.replace('data:', '').trim() : '',
  };
}

const ResearchAgentAPI = {
  async researchSong(
    track: ResearchTrack,
    onStep: (step: ResearchStepEvent) => void,
    signal?: AbortSignal
  ): Promise<SongInfo> {
    const params = new URLSearchParams({
      trackId: track.id,
      name: track.name,
      artist: track.artist,
    });
    if (track.album) params.set('album', track.album);

    const response = await fetch(`/api/research-song?${params.toString()}`, { signal });
    if (!response.ok || !response.body) {
      throw new Error(`Research request failed: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Split on \n\n, pop the last element (incomplete trailing segment), parse the rest
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || ''; // Keep the incomplete trailing segment for the next read

      for (const part of parts) {
        if (part.trim().length === 0) continue;
        const { event, data } = parseSseBlock(part);
        if (!data) continue;
        if (event === 'step') {
          onStep(JSON.parse(data));
        } else if (event === 'report') {
          return JSON.parse(data) as SongInfo;
        } else if (event === 'error') {
          throw new Error(JSON.parse(data).message);
        }
      }
    }

    throw new Error('Research stream ended without a report');
  },
};

export default ResearchAgentAPI;
