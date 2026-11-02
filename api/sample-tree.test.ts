import { test, expect, vi, beforeEach } from 'vitest';

const { store, takeBudgetMock, findMock, buildMock } = vi.hoisted(() => ({
  store: new Map<string, unknown>(), takeBudgetMock: vi.fn(), findMock: vi.fn(), buildMock: vi.fn(),
}));
vi.mock('./_lib/cache', () => ({
  redis: () => ({
    get: async (k: string) => store.get(k) ?? null,
    set: async (k: string, v: unknown) => void store.set(k, v),
  }),
}));
vi.mock('./_lib/rateLimit', () => ({ takeBudget: takeBudgetMock, clientIp: () => '1.1.1.1' }));
vi.mock('./_lib/sampleTree', async (orig) => ({
  ...(await orig<typeof import('./_lib/sampleTree')>()),
  findGeniusSong: findMock,
  buildSampleTree: buildMock,
}));

import handler from './sample-tree';
import { GeniusError } from './_lib/sampleTree';

const TREE = { geniusId: 1, title: 'Stronger', artist: 'Kanye West', url: 'u', image: null, year: '2007', parents: [] };
const req = (q: string) => new Request(`http://x/api/sample-tree?${q}`);
const settle = () => new Promise((r) => setTimeout(r));

beforeEach(() => {
  store.clear();
  takeBudgetMock.mockReset().mockResolvedValue({ allowed: true });
  findMock.mockReset().mockResolvedValue(1);
  buildMock.mockReset().mockResolvedValue(TREE);
});

test.each(['', 'name=Stronger', `name=${'x'.repeat(201)}&artist=a`])('rejects bad input: %s', async (q) => {
  expect((await handler(req(q))).status).toBe(400);
});

test('builds the tree once, then serves it from cache', async () => {
  const first = await handler(req('name=Stronger&artist=Kanye%20West'));
  expect(first.status).toBe(200);
  expect(first.headers.get('x-audio-check')).toBe('off');   // no MATCHER_URL in tests
  expect(await first.json()).toEqual(TREE);
  await settle();
  const second = await handler(req('name=stronger&artist=kanye%20west'));
  expect(second.headers.get('x-report-source')).toBe('cache');
  expect(buildMock).toHaveBeenCalledTimes(1);
});

test('a song missing from Genius is 404 and the miss is cached too', async () => {
  findMock.mockResolvedValue(null);
  expect((await handler(req('name=Nope&artist=Nobody'))).status).toBe(404);
  await settle();
  expect((await handler(req('name=Nope&artist=Nobody'))).status).toBe(404);
  expect(findMock).toHaveBeenCalledTimes(1);
});

test('over budget is 429; a broken limiter does not block (Genius is free)', async () => {
  takeBudgetMock.mockResolvedValueOnce({ allowed: false, reason: 'ip', retryAfterSeconds: 60 });
  expect((await handler(req('name=a&artist=b'))).status).toBe(429);
  takeBudgetMock.mockRejectedValueOnce(new Error('redis down'));
  expect((await handler(req('name=a&artist=b'))).status).toBe(200);
});

test('Genius failures are 502 and not cached', async () => {
  buildMock.mockRejectedValue(new GeniusError('Genius /songs/1 failed: 500'));
  const res = await handler(req('name=a&artist=b'));
  expect(res.status).toBe(502);
  expect((await res.json()).error).toMatch(/Genius/);
  expect(store.size).toBe(0);
});
