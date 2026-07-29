import { test, expect, vi, beforeEach } from 'vitest';

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
  spotifyArtistTopTracks: vi.fn(),
}));
vi.mock('./_lib/tools/geniusTool', () => ({ geniusLookup: vi.fn() }));
vi.mock('./_lib/tools/webSearchTool', () => ({ webSearch: vi.fn() }));

const spotifyAudioFeaturesMock = vi.fn();
vi.mock('./_lib/tools/spotifyAudioFeatures', () => ({
  spotifyAudioFeatures: (...args: unknown[]) => spotifyAudioFeaturesMock(...args),
}));

import handler from './research-song';

const emptyReport = {
  summary: '',
  musicalAnalysis: { mood: '', keyElements: [], soundscape: '' },
  sonicRead: '',
  genre: [],
  culturalContext: { era: '', influence: '' },
  credits: [],
  findings: [],
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
  spotifyAudioFeaturesMock.mockReset();
  spotifyAudioFeaturesMock.mockResolvedValue({
    tempo: 100,
    key: 'C Major',
    danceability: 0.5,
    energy: 0.5,
    valence: 0.5,
    acousticness: 0.5,
    instrumentalness: 0.5,
  });
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

test('passes fetched Spotify audio features into the agent when available', async () => {
  getCachedReportMock.mockResolvedValueOnce(null);
  runResearchAgentMock.mockResolvedValueOnce({ ...emptyReport, summary: 'fresh' });

  const request = new Request('https://example.com/api/research-song?trackId=3&name=Song&artist=Artist');
  const response = await handler(request);
  await readStreamText(response);

  expect(runResearchAgentMock).toHaveBeenCalledWith(
    expect.objectContaining({
      spotifyAudioFeatures: {
        tempo: 100,
        key: 'C Major',
        danceability: 0.5,
        energy: 0.5,
        valence: 0.5,
        acousticness: 0.5,
        instrumentalness: 0.5,
      },
    })
  );
});

test('passes null for spotifyAudioFeatures when the Spotify call fails', async () => {
  getCachedReportMock.mockResolvedValueOnce(null);
  spotifyAudioFeaturesMock.mockRejectedValueOnce(new Error('403'));
  runResearchAgentMock.mockResolvedValueOnce({ ...emptyReport, summary: 'fresh' });

  const request = new Request('https://example.com/api/research-song?trackId=4&name=Song&artist=Artist');
  const response = await handler(request);
  await readStreamText(response);

  expect(runResearchAgentMock).toHaveBeenCalledWith(
    expect.objectContaining({ spotifyAudioFeatures: null })
  );
});
