import { test, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, number>();
const expiries = new Map<string, number>();
vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: () => ({
      incr: async (key: string) => {
        const next = (store.get(key) ?? 0) + 1;
        store.set(key, next);
        return next;
      },
      expire: async (key: string, seconds: number) => {
        expiries.set(key, seconds);
        return 1;
      },
    }),
  },
}));

import { takeResearchBudget, clientIp } from './rateLimit';

// 2026-11-01T10:30:00Z: 30 minutes into an hour window, 13.5 hours before the day window ends.
const NOW = Date.UTC(2026, 10, 1, 10, 30);

beforeEach(() => {
  store.clear();
  expiries.clear();
});

test('allows 5 fresh reports per IP per hour, then reports when the window resets', async () => {
  for (let i = 0; i < 5; i++) {
    expect(await takeResearchBudget('1.1.1.1', NOW)).toEqual({ allowed: true });
  }
  expect(await takeResearchBudget('1.1.1.1', NOW)).toEqual({ allowed: false, reason: 'ip', retryAfterSeconds: 30 * 60 });

  // A different caller is unaffected, and the next hour starts fresh.
  expect(await takeResearchBudget('2.2.2.2', NOW)).toEqual({ allowed: true });
  expect(await takeResearchBudget('1.1.1.1', NOW + 60 * 60 * 1000)).toEqual({ allowed: true });
});

test('caps fresh reports across all callers at 15 per day', async () => {
  for (let i = 0; i < 15; i++) {
    expect((await takeResearchBudget(`10.0.0.${i}`, NOW)).allowed).toBe(true);
  }
  expect(await takeResearchBudget('10.0.0.99', NOW)).toEqual({
    allowed: false,
    reason: 'global',
    retryAfterSeconds: 13.5 * 60 * 60,
  });
});

test("a blocked caller doesn't consume the shared daily budget", async () => {
  for (let i = 0; i < 20; i++) await takeResearchBudget('1.1.1.1', NOW);

  const globalKey = [...store.keys()].find((k) => k.startsWith('research-limit:global:'))!;
  expect(store.get(globalKey)).toBe(5);
});

test('counters expire with their window so Redis never fills up', async () => {
  await takeResearchBudget('1.1.1.1', NOW);

  const ttls = [...expiries.entries()];
  expect(ttls).toContainEqual([expect.stringMatching(/^research-limit:ip:1\.1\.1\.1:/), 3600]);
  expect(ttls).toContainEqual([expect.stringMatching(/^research-limit:global:/), 86400]);
});

test('clientIp reads x-real-ip and falls back to "unknown"', () => {
  expect(clientIp(new Request('http://x', { headers: { 'x-real-ip': ' 3.3.3.3 ' } }))).toBe('3.3.3.3');
  expect(clientIp(new Request('http://x'))).toBe('unknown');
});
