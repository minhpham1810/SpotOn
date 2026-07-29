import { test, expect, vi, beforeEach } from 'vitest';

const getMock = vi.fn();
const setMock = vi.fn();

vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: () => ({ get: getMock, set: setMock }),
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
