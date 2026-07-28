import { describe, test, expect, vi, beforeEach } from 'vitest';
import ResearchAgentAPI from './ResearchAgentAPI';

function streamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

test('researchSong emits step callbacks and resolves with the final report', async () => {
  const sse =
    'event: step\ndata: {"tool":"genius_lookup","status":"Looking up lyrics..."}\n\n' +
    'event: report\ndata: {"summary":"done","musicalAnalysis":{"mood":"","keyElements":[],"soundscape":""},"genre":[],"culturalContext":{"era":"","influence":""},"credits":[],"highlights":[],"sources":[]}\n\n';

  (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(streamResponse([sse]));

  const steps: string[] = [];
  const report = await ResearchAgentAPI.researchSong({ id: '1', name: 'Song', artist: 'Artist' }, (step) =>
    steps.push(step.tool)
  );

  expect(steps).toEqual(['genius_lookup']);
  expect(report.summary).toBe('done');
});

test('researchSong throws when the server streams an error event', async () => {
  const sse = 'event: error\ndata: {"message":"boom"}\n\n';
  (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(streamResponse([sse]));

  await expect(
    ResearchAgentAPI.researchSong({ id: '1', name: 'Song', artist: 'Artist' }, () => {})
  ).rejects.toThrow('boom');
});

test('researchSong throws when the HTTP response is not ok', async () => {
  (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(new Response(null, { status: 500 }));

  await expect(
    ResearchAgentAPI.researchSong({ id: '1', name: 'Song', artist: 'Artist' }, () => {})
  ).rejects.toThrow('Research request failed: 500');
});

test('researchSong correctly handles events split across multiple chunks', async () => {
  // Split the closing \n\n across two chunks: first chunk ends with \n, second starts with \n
  const chunk1 = 'event: step\ndata: {"tool":"spotify_lookup","status":"Searching..."}\n';
  const chunk2 = '\nevent: report\ndata: {"summary":"done","musicalAnalysis":{"mood":"","keyElements":[],"soundscape":""},"genre":[],"culturalContext":{"era":"","influence":""},"credits":[],"highlights":[],"sources":[]}\n\n';

  (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(streamResponse([chunk1, chunk2]));

  const steps: string[] = [];
  const report = await ResearchAgentAPI.researchSong({ id: '1', name: 'Song', artist: 'Artist' }, (step) =>
    steps.push(step.tool)
  );

  expect(steps).toEqual(['spotify_lookup']);
  expect(report.summary).toBe('done');
});

test('researchSong forwards the abort signal to fetch', async () => {
  const sse =
    'event: report\ndata: {"summary":"done","musicalAnalysis":{"mood":"","keyElements":[],"soundscape":""},"genre":[],"culturalContext":{"era":"","influence":""},"credits":[],"highlights":[],"sources":[]}\n\n';
  (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(streamResponse([sse]));

  const controller = new AbortController();
  await ResearchAgentAPI.researchSong({ id: '1', name: 'Song', artist: 'Artist' }, () => {}, controller.signal);

  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining('/api/research-song'),
    expect.objectContaining({ signal: controller.signal })
  );
});

test('researchSong rejects when the signal is aborted', async () => {
  (fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation((_url: string, options?: { signal?: AbortSignal }) => {
    return new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        reject(err);
      });
    });
  });

  const controller = new AbortController();
  const promise = ResearchAgentAPI.researchSong({ id: '1', name: 'Song', artist: 'Artist' }, () => {}, controller.signal);
  controller.abort();

  await expect(promise).rejects.toThrow('The operation was aborted');
});
