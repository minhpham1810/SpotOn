import { Redis } from '@upstash/redis';
import type { SongInfo } from '../../src/types/song-info';

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

// The client's default (5 retries, e^n*50ms backoff) is ~4.3 s per command when Redis is down,
// measured as 8.6 s per fresh request (cache read + limiter count) in the Cloud Run outage drill.
// One quick retry rides out a blip; a real outage now fails in ~0.2 s.
export function redis(): Redis {
  return Redis.fromEnv({ retry: { retries: 1, backoff: () => 100 } });
}

// Hot reports are answered from this instance's memory, so a flood of cache hits doesn't become a
// flood of billed Upstash commands. Measured: ~1,650 cached requests/s on 1 vCPU, which would spend
// the 500k free monthly commands in ~5 minutes. Reports don't change, so a short TTL is safe.
const MEMORY_TTL_MS = 10 * 60 * 1000;
const MEMORY_MAX_ENTRIES = 200;
const memory = new Map<string, { report: SongInfo; expires: number }>();

function remember(trackId: string, report: SongInfo): void {
  memory.delete(trackId); // re-insert so Map order is least-recently-stored first
  memory.set(trackId, { report, expires: Date.now() + MEMORY_TTL_MS });
  if (memory.size > MEMORY_MAX_ENTRIES) memory.delete(memory.keys().next().value as string);
}

function cacheKey(trackId: string): string {
  return `song-research:v2:${trackId}`;
}

export async function getCachedReport(trackId: string): Promise<SongInfo | null> {
  const hot = memory.get(trackId);
  if (hot && hot.expires > Date.now()) return hot.report;
  if (hot) memory.delete(trackId);

  const cached = await redis().get<SongInfo>(cacheKey(trackId));
  if (cached) remember(trackId, cached);
  return cached ?? null;
}

export async function setCachedReport(trackId: string, report: SongInfo): Promise<void> {
  remember(trackId, report);
  await redis().set(cacheKey(trackId), report, { ex: CACHE_TTL_SECONDS });
}
