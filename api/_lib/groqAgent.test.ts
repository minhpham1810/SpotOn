import { test, expect, vi, beforeEach } from 'vitest';
import { runResearchAgent, type AgentTool } from './groqAgent';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

function groqResponse(message: Record<string, unknown>, finishReason: string) {
  return {
    ok: true,
    json: async () => ({ choices: [{ message, finish_reason: finishReason }] }),
  };
}

const finalReportJson = JSON.stringify({
  summary: 'A summary.',
  musicalAnalysis: { mood: 'Calm', keyElements: ['piano'], soundscape: 'Warm' },
  sonicRead: 'Warm and analog, built on tape hiss and a walking bassline.',
  genre: ['Jazz'],
  culturalContext: { era: '1960s', influence: 'Big', connections: [] },
  credits: [],
  findings: [
    { text: 'The bridge modulates up a half step.', confidence: 'verified', source: { label: 'Genius', url: 'https://genius.com/x' } },
  ],
  sources: [{ label: 'Genius', url: 'https://genius.com/x' }],
  emotionalFingerprint: {
    arc: ['Opens guarded and restrained', 'Builds into aching longing', 'Resolves in quiet acceptance'],
    signatureMove: 'The vocal cracks right on the word "gone" — that\'s not a flaw, that\'s the point.',
    reachForThisWhen: 'You want to sit with something instead of getting over it.',
  },
});

test('runResearchAgent calls a requested tool then returns the final parsed report', async () => {
  const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
  mockFetch
    .mockResolvedValueOnce(
      groqResponse(
        {
          role: 'assistant',
          content: null,
          tool_calls: [
            { id: 'call1', type: 'function', function: { name: 'lookup_lyrics', arguments: '{"query":"test"}' } },
          ],
        },
        'tool_calls'
      )
    )
    .mockResolvedValueOnce(groqResponse({ role: 'assistant', content: finalReportJson }, 'stop'));

  const execute = vi.fn().mockResolvedValue('Lyrics info found.');
  const tool: AgentTool = {
    name: 'lookup_lyrics',
    label: 'Looking up lyrics',
    description: 'Looks up lyrics info',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'q' } },
      required: ['query'],
    },
    execute,
  };

  const steps: string[] = [];
  const report = await runResearchAgent({
    track: { name: 'Song', artist: 'Artist' },
    tools: [tool],
    groqApiKey: 'key',
    onStep: (e) => steps.push(e.tool),
  });

  expect(execute).toHaveBeenCalledWith({ query: 'test' });
  expect(steps).toEqual(['lookup_lyrics']);
  expect(report.summary).toBe('A summary.');
  expect(report.sources).toEqual([{ label: 'Genius', url: 'https://genius.com/x' }]);
  expect(report.sonicRead).toBe('Warm and analog, built on tape hiss and a walking bassline.');
  expect(report.findings).toEqual([
    { text: 'The bridge modulates up a half step.', confidence: 'verified', source: { label: 'Genius', url: 'https://genius.com/x' } },
  ]);
  expect(report.audioFeatures).toBeUndefined();
  expect(report.emotionalFingerprint).toEqual({
    arc: ['Opens guarded and restrained', 'Builds into aching longing', 'Resolves in quiet acceptance'],
    signatureMove: 'The vocal cracks right on the word "gone" — that\'s not a flaw, that\'s the point.',
    reachForThisWhen: 'You want to sit with something instead of getting over it.',
  });
});

test('runResearchAgent stops after maxRounds and forces a final report', async () => {
  const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
  const toolCallMessage = {
    role: 'assistant',
    content: null,
    tool_calls: [{ id: 'call1', type: 'function', function: { name: 'noop', arguments: '{}' } }],
  };
  mockFetch
    .mockResolvedValueOnce(groqResponse(toolCallMessage, 'tool_calls'))
    .mockResolvedValueOnce(groqResponse(toolCallMessage, 'tool_calls'))
    .mockResolvedValueOnce(groqResponse({ role: 'assistant', content: finalReportJson }, 'stop'));

  const tool: AgentTool = {
    name: 'noop',
    label: 'Doing nothing',
    description: 'does nothing',
    parameters: { type: 'object', properties: {}, required: [] },
    execute: vi.fn().mockResolvedValue('ok'),
  };

  const report = await runResearchAgent({
    track: { name: 'Song', artist: 'Artist' },
    tools: [tool],
    groqApiKey: 'key',
    maxRounds: 2,
  });

  expect(mockFetch).toHaveBeenCalledTimes(3);
  expect(report.summary).toBe('A summary.');
});

test('runResearchAgent retries once on a 429 and then succeeds', async () => {
  const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
  mockFetch
    .mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: new Headers({ 'retry-after': '0' }),
      json: async () => ({}),
    })
    .mockResolvedValueOnce(groqResponse({ role: 'assistant', content: finalReportJson }, 'stop'));

  const report = await runResearchAgent({
    track: { name: 'Song', artist: 'Artist' },
    tools: [],
    groqApiKey: 'key',
  });

  expect(mockFetch).toHaveBeenCalledTimes(2);
  expect(report.summary).toBe('A summary.');
});

test('runResearchAgent handles tool.execute() failure gracefully and continues', async () => {
  const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
  mockFetch
    .mockResolvedValueOnce(
      groqResponse(
        {
          role: 'assistant',
          content: null,
          tool_calls: [
            { id: 'call1', type: 'function', function: { name: 'failing_tool', arguments: '{}' } },
          ],
        },
        'tool_calls'
      )
    )
    .mockResolvedValueOnce(groqResponse({ role: 'assistant', content: finalReportJson }, 'stop'));

  const execute = vi.fn().mockRejectedValue(new Error('Tool crashed'));
  const tool: AgentTool = {
    name: 'failing_tool',
    label: 'Failing on purpose',
    description: 'A tool that fails',
    parameters: { type: 'object', properties: {}, required: [] },
    execute,
  };

  const report = await runResearchAgent({
    track: { name: 'Song', artist: 'Artist' },
    tools: [tool],
    groqApiKey: 'key',
  });

  expect(execute).toHaveBeenCalled();
  expect(report.summary).toBe('A summary.');
});

test('runResearchAgent parses final report with markdown code fence wrapping', async () => {
  const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
  const wrappedReportJson = `\`\`\`json\n${finalReportJson}\n\`\`\``;
  mockFetch.mockResolvedValueOnce(groqResponse({ role: 'assistant', content: wrappedReportJson }, 'stop'));

  const report = await runResearchAgent({
    track: { name: 'Song', artist: 'Artist' },
    tools: [],
    groqApiKey: 'key',
  });

  expect(report.summary).toBe('A summary.');
  expect(report.sources).toEqual([{ label: 'Genius', url: 'https://genius.com/x' }]);
});

test('runResearchAgent caps web_search at 2 calls and short-circuits further requests', async () => {
  const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
  const webSearchCallMessage = (id: string) => ({
    role: 'assistant',
    content: null,
    tool_calls: [{ id, type: 'function', function: { name: 'web_search', arguments: '{"query":"test"}' } }],
  });

  mockFetch
    .mockResolvedValueOnce(groqResponse(webSearchCallMessage('call1'), 'tool_calls'))
    .mockResolvedValueOnce(groqResponse(webSearchCallMessage('call2'), 'tool_calls'))
    .mockResolvedValueOnce(groqResponse(webSearchCallMessage('call3'), 'tool_calls'))
    .mockResolvedValueOnce(groqResponse({ role: 'assistant', content: finalReportJson }, 'stop'));

  const execute = vi.fn().mockResolvedValue('Some web results.');
  const tool: AgentTool = {
    name: 'web_search',
    label: 'Searching the web for cultural context',
    description: 'Search the live web.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'q' } },
      required: ['query'],
    },
    execute,
  };

  const report = await runResearchAgent({
    track: { name: 'Song', artist: 'Artist' },
    tools: [tool],
    groqApiKey: 'key',
  });

  expect(execute).toHaveBeenCalledTimes(2);

  const allRequestMessages = mockFetch.mock.calls.map(
    ([, requestInit]) => JSON.parse((requestInit as { body: string }).body).messages
  );
  const lastRequestMessages = allRequestMessages[allRequestMessages.length - 1] as Array<{
    role: string;
    content: string;
  }>;
  const thirdCallResult = lastRequestMessages.find(
    (m) => m.role === 'tool' && m.content.includes('budget exhausted')
  );
  expect(thirdCallResult?.content).toContain('web_search budget exhausted for this report (max 2 calls)');
  expect(report.summary).toBe('A summary.');
});

test('runResearchAgent uses measured Spotify audio features directly without asking the model to estimate', async () => {
  const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
  mockFetch.mockResolvedValueOnce(groqResponse({ role: 'assistant', content: finalReportJson }, 'stop'));

  const report = await runResearchAgent({
    track: { name: 'Song', artist: 'Artist' },
    tools: [],
    groqApiKey: 'key',
    spotifyAudioFeatures: {
      tempo: 118,
      key: 'C# Major',
      danceability: 0.7,
      energy: 0.6,
      valence: 0.5,
      acousticness: 0.1,
      instrumentalness: 0.02,
    },
  });

  expect(report.audioFeatures).toEqual({
    source: 'spotify',
    tempo: 118,
    key: 'C# Major',
    danceability: 0.7,
    energy: 0.6,
    valence: 0.5,
    acousticness: 0.1,
    instrumentalness: 0.02,
  });

  const requestBody = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body);
  const systemMessage = requestBody.messages[0].content as string;
  expect(systemMessage).not.toContain('audioFeatures" is your own estimate');
});

test('runResearchAgent asks the model to estimate audioFeatures when Spotify data is unavailable', async () => {
  const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
  const estimatedReportJson = JSON.stringify({
    ...JSON.parse(finalReportJson),
    audioFeatures: {
      tempo: 92,
      key: 'A Minor',
      danceability: 0.4,
      energy: 0.35,
      valence: 0.3,
      acousticness: 0.6,
      instrumentalness: 0.05,
    },
  });
  mockFetch.mockResolvedValueOnce(groqResponse({ role: 'assistant', content: estimatedReportJson }, 'stop'));

  const report = await runResearchAgent({
    track: { name: 'Song', artist: 'Artist' },
    tools: [],
    groqApiKey: 'key',
    spotifyAudioFeatures: null,
  });

  expect(report.audioFeatures).toEqual({
    source: 'estimated',
    tempo: 92,
    key: 'A Minor',
    danceability: 0.4,
    energy: 0.35,
    valence: 0.3,
    acousticness: 0.6,
    instrumentalness: 0.05,
  });

  const requestBody = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body);
  const systemMessage = requestBody.messages[0].content as string;
  expect(systemMessage).toContain('audioFeatures" is your own estimate');
});

test('runResearchAgent omits audioFeatures when the estimate has a non-numeric axis', async () => {
  const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
  const malformedReportJson = JSON.stringify({
    ...JSON.parse(finalReportJson),
    audioFeatures: {
      tempo: 92,
      key: 'A Minor',
      danceability: 0.4,
      energy: 'high',
      valence: 0.3,
      acousticness: 0.6,
      instrumentalness: 0.05,
    },
  });
  mockFetch.mockResolvedValueOnce(groqResponse({ role: 'assistant', content: malformedReportJson }, 'stop'));

  const report = await runResearchAgent({
    track: { name: 'Song', artist: 'Artist' },
    tools: [],
    groqApiKey: 'key',
    spotifyAudioFeatures: null,
  });

  expect(report.audioFeatures).toBeUndefined();
});

test('runResearchAgent round-trips a speculative finding with a null source', async () => {
  const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
  const reportWithSpeculativeFinding = JSON.stringify({
    ...JSON.parse(finalReportJson),
    findings: [{ text: 'This likely nods to 90s trip-hop.', confidence: 'speculative', source: null }],
  });
  mockFetch.mockResolvedValueOnce(groqResponse({ role: 'assistant', content: reportWithSpeculativeFinding }, 'stop'));

  const report = await runResearchAgent({
    track: { name: 'Song', artist: 'Artist' },
    tools: [],
    groqApiKey: 'key',
  });

  expect(report.findings).toEqual([
    { text: 'This likely nods to 90s trip-hop.', confidence: 'speculative', source: null },
  ]);
});

test('runResearchAgent degrades findings to an empty array when missing from the final report', async () => {
  const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
  const { findings: _omit, ...reportWithoutFindings } = JSON.parse(finalReportJson);
  mockFetch.mockResolvedValueOnce(
    groqResponse({ role: 'assistant', content: JSON.stringify(reportWithoutFindings) }, 'stop')
  );

  const report = await runResearchAgent({
    track: { name: 'Song', artist: 'Artist' },
    tools: [],
    groqApiKey: 'key',
  });

  expect(report.findings).toEqual([]);
});

test('runResearchAgent omits audioFeatures when spotifyAudioFeatures is not provided', async () => {
  const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
  mockFetch.mockResolvedValueOnce(groqResponse({ role: 'assistant', content: finalReportJson }, 'stop'));

  const report = await runResearchAgent({
    track: { name: 'Song', artist: 'Artist' },
    tools: [],
    groqApiKey: 'key',
  });

  expect(report.audioFeatures).toBeUndefined();
});
