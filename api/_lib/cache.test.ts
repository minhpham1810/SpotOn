import { test, expect, vi, beforeEach } from 'vitest';

const getMock = vi.fn();
const setMock = vi.fn();
const { fromEnvMock } = vi.hoisted(() => ({ fromEnvMock: vi.fn() }));

vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: (...args: unknown[]) => {
      fromEnvMock(...args);
      return { get: getMock, set: setMock };
    },
  },
}));

import { getCachedReport, setCachedReport } from './cache';
import type { SongInfo } from '../../src/types/song-info';

const sampleReport: SongInfo = {
  emotionalFingerprint: {
    arc: ['Build', 'Peak', 'Release'],
    signatureMove: 'Chorus hit',
    reachForThisWhen: 'Celebrating victories',
  },
  summary: 'A great song.',
  musicalAnalysis: { mood: 'Upbeat', keyElements: [], soundscape: '' },
  sonicRead: 'A rich sonic landscape.',
  genre: ['Pop'],
  culturalContext: { era: '2020s', influence: '' },
  credits: [],
  findings: [],
  sources: [],
};

beforeEach(() => {
  getMock.mockReset();
  setMock.mockReset();
});

test('getCachedReport returns null when nothing is cached', async () => {
  getMock.mockResolvedValueOnce(null);

  const result = await getCachedReport('track123');

  expect(result).toBeNull();
  expect(getMock).toHaveBeenCalledWith('song-research:v2:track123');
});

test('getCachedReport returns the cached report when present', async () => {
  getMock.mockResolvedValueOnce(sampleReport);

  const result = await getCachedReport('track123');

  expect(result).toEqual(sampleReport);
});

test('setCachedReport writes the report with a 30-day expiry', async () => {
  await setCachedReport('track123', sampleReport);

  expect(setMock).toHaveBeenCalledWith('song-research:v2:track123', sampleReport, {
    ex: 60 * 60 * 24 * 30,
  });
});

test('a report read from Redis is then served from memory without another Redis call', async () => {
  getMock.mockResolvedValueOnce(sampleReport);

  expect(await getCachedReport('hot-track')).toEqual(sampleReport);
  expect(await getCachedReport('hot-track')).toEqual(sampleReport);
  expect(await getCachedReport('hot-track')).toEqual(sampleReport);

  expect(getMock).toHaveBeenCalledTimes(1);
});

test('a freshly written report is served from memory', async () => {
  await setCachedReport('new-track', sampleReport);

  expect(await getCachedReport('new-track')).toEqual(sampleReport);
  expect(getMock).not.toHaveBeenCalled();
});

test('memory entries expire after 10 minutes and Redis is asked again', async () => {
  vi.useFakeTimers();
  try {
    getMock.mockResolvedValue(sampleReport);
    await getCachedReport('expiring-track');
    vi.advanceTimersByTime(10 * 60 * 1000 + 1);
    await getCachedReport('expiring-track');
    expect(getMock).toHaveBeenCalledTimes(2);
  } finally {
    vi.useRealTimers();
  }
});

test('memory holds at most 200 reports, dropping the oldest first', async () => {
  for (let i = 0; i < 201; i++) await setCachedReport(`bulk-${i}`, sampleReport);

  getMock.mockResolvedValue(null);
  expect(await getCachedReport('bulk-0')).toBeNull(); // evicted, so Redis (mocked empty) is asked
  expect(await getCachedReport('bulk-200')).toEqual(sampleReport);
  expect(getMock).toHaveBeenCalledTimes(1);
});

test('a Redis miss is not remembered, so a later write is seen', async () => {
  getMock.mockResolvedValueOnce(null);
  expect(await getCachedReport('miss-track')).toBeNull();
  getMock.mockResolvedValueOnce(sampleReport);
  expect(await getCachedReport('miss-track')).toEqual(sampleReport);
});

test('the Redis client fails fast: one retry after 100 ms instead of the 5-retry default', async () => {
  getMock.mockResolvedValueOnce(null);
  await getCachedReport('fail-fast-track');

  const options = fromEnvMock.mock.calls[fromEnvMock.mock.calls.length - 1]?.[0] as { retry: { retries: number; backoff: (n: number) => number } };
  expect(options.retry.retries).toBe(1);
  expect(options.retry.backoff(0)).toBe(100);
});
