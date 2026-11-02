import { test, expect, vi, beforeEach, afterEach } from 'vitest';

const { store, takeBudgetMock } = vi.hoisted(() => ({ store: new Map<string, unknown>(), takeBudgetMock: vi.fn() }));
vi.mock('./_lib/cache', () => ({
  redis: () => ({
    get: async (k: string) => store.get(k) ?? null,
    set: async (k: string, v: unknown) => void store.set(k, v),
  }),
}));
vi.mock('./_lib/rateLimit', () => ({
  takeBudget: takeBudgetMock,
  clientIp: () => '1.1.1.1',
}));

import handler from './sample-match';

const A = 'https://audio-ssl.itunes.apple.com/itunes-assets/a.m4a';
const B = 'https://audio-ssl.itunes.apple.com/itunes-assets/b.m4a';
const RESULT = { found: true, score: 21.4, votes: 80, semitones: 0, speed: 1, mode: 'turntable',
  child_start_s: 3, child_end_s: 12, parent_start_s: 40, version: 'fp1' };
const req = (child: string, parent: string) =>
  new Request(`http://x/api/sample-match?child=${encodeURIComponent(child)}&parent=${encodeURIComponent(parent)}`);
let matcher: ReturnType<typeof vi.fn>;

beforeEach(() => {
  store.clear();
  takeBudgetMock.mockReset().mockResolvedValue({ allowed: true });
  matcher = vi.fn(async () => Response.json(RESULT));
  vi.stubGlobal('fetch', matcher);
  vi.stubEnv('MATCHER_URL', 'http://matcher:8000/');
});
afterEach(() => vi.unstubAllEnvs());

test.each([
  ['https://evil.com/a.m4a', B], [A, 'http://audio-ssl.itunes.apple.com/b.m4a'], [A, A],
  ['https://audio-ssl.itunes.apple.com.evil.com/a', B],
])('rejects anything but two different iTunes preview URLs: %s', async (child, parent) => {
  const res = await handler(req(child, parent));
  expect(res.status).toBe(400);
  expect(matcher).not.toHaveBeenCalled();
});

test('a fresh match calls the matcher once, then is served from cache without spending budget', async () => {
  const first = await handler(req(A, B));
  expect(first.status).toBe(200);
  expect(first.headers.get('x-report-source')).toBe('fresh');
  expect(await first.json()).toEqual(RESULT);
  expect(matcher).toHaveBeenCalledWith('http://matcher:8000/match', expect.objectContaining({
    method: 'POST', body: JSON.stringify({ child_url: A, parent_url: B }),
  }));
  await new Promise((r) => setTimeout(r));
  const second = await handler(req(A, B));
  expect(second.headers.get('x-report-source')).toBe('cache');
  expect(matcher).toHaveBeenCalledTimes(1);
  expect(takeBudgetMock).toHaveBeenCalledTimes(1);
});

test('results from a different matcher version are returned but not cached', async () => {
  matcher.mockResolvedValue(Response.json({ ...RESULT, version: 'fp0' }));
  await handler(req(A, B));
  expect(store.size).toBe(0);
});

test('without MATCHER_URL the endpoint says audio matching is off', async () => {
  vi.stubEnv('MATCHER_URL', '');
  const res = await handler(req(A, B));
  expect(res.status).toBe(503);
  expect(res.headers.get('x-report-source')).toBe('matcher-off');
});

test('over budget is 429 with Retry-After; limiter down fails closed', async () => {
  takeBudgetMock.mockResolvedValueOnce({ allowed: false, reason: 'ip', retryAfterSeconds: 120 });
  const limited = await handler(req(A, B));
  expect(limited.status).toBe(429);
  expect(limited.headers.get('retry-after')).toBe('120');

  takeBudgetMock.mockRejectedValueOnce(new Error('redis down'));
  const down = await handler(req(A, B));
  expect(down.status).toBe(503);
  expect(down.headers.get('x-report-source')).toBe('limiter-down');
  expect(matcher).not.toHaveBeenCalled();
});

test.each([
  [503, 503, 'warming'], [422, 422, 'fresh'], [500, 502, 'error'],
])('matcher status %i becomes %i', async (upstream, status, source) => {
  matcher.mockResolvedValue(new Response('{}', { status: upstream }));
  const res = await handler(req(A, B));
  expect(res.status).toBe(status);
  expect(res.headers.get('x-report-source')).toBe(source);
});

test('an unreachable matcher is 502', async () => {
  matcher.mockRejectedValue(new TypeError('fetch failed'));
  expect((await handler(req(A, B))).status).toBe(502);
});
