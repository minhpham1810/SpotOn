import { describe, test, expect, vi, beforeEach } from 'vitest';

const { getCachedReportMock, setCachedReportMock, runResearchAgentMock } = vi.hoisted(() => ({
  getCachedReportMock: vi.fn(),
  setCachedReportMock: vi.fn(),
  runResearchAgentMock: vi.fn(),
}));

vi.mock('./_lib/cache', () => ({
  getCachedReport: getCachedReportMock,
  setCachedReport: setCachedReportMock,
}));

vi.mock('./_lib/groqAgent', () => ({
  runResearchAgent: runResearchAgentMock,
}));

vi.mock('./_lib/tools/spotifyTools', () => ({
  spotifySearch: vi.fn(),
  spotifyRelatedArtists: vi.fn(),
  spotifyArtistTopTracks: vi.fn(),
}));
vi.mock('./_lib/tools/geniusTool', () => ({ geniusLookup: vi.fn() }));
vi.mock('./_lib/tools/webSearchTool', () => ({ webSearch: vi.fn() }));

import handler from './research-song';

const emptyReport = {
  summary: '',
  musicalAnalysis: { mood: '', keyElements: [], soundscape: '' },
  genre: [],
  culturalContext: { era: '', influence: '' },
  credits: [],
  highlights: [],
  sources: [],
};

async function readStreamText(response: Response): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value);
  }
  return text;
}

beforeEach(() => {
  getCachedReportMock.mockReset();
  setCachedReportMock.mockReset();
  runResearchAgentMock.mockReset();
});

test('returns a cached report immediately without running the agent', async () => {
  getCachedReportMock.mockResolvedValueOnce({ ...emptyReport, summary: 'cached' });

  const request = new Request('https://example.com/api/research-song?trackId=1&name=Song&artist=Artist');
  const response = await handler(request);
  const text = await readStreamText(response);

  expect(runResearchAgentMock).not.toHaveBeenCalled();
  expect(text).toContain('event: report');
  expect(text).toContain('"summary":"cached"');
});

test('runs the agent, streams step events, caches, then streams the report', async () => {
  getCachedReportMock.mockResolvedValueOnce(null);
  runResearchAgentMock.mockImplementationOnce(
    async ({ onStep }: { onStep: (e: { tool: string; status: string }) => void }) => {
      onStep({ tool: 'genius_lookup', status: 'Calling genius_lookup...' });
      return { ...emptyReport, summary: 'fresh' };
    }
  );

  const request = new Request('https://example.com/api/research-song?trackId=2&name=Song&artist=Artist');
  const response = await handler(request);
  const text = await readStreamText(response);

  expect(text).toContain('event: step');
  expect(text).toContain('genius_lookup');
  expect(text).toContain('event: report');
  expect(setCachedReportMock).toHaveBeenCalledWith('2', expect.objectContaining({ summary: 'fresh' }));
});

test('returns a 400 response when required query params are missing', async () => {
  const request = new Request('https://example.com/api/research-song?trackId=1');
  const response = await handler(request);

  expect(response.status).toBe(400);
});
