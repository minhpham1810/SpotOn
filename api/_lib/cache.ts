import { Redis } from '@upstash/redis';
import type { SongInfo } from '../../src/types/song-info';

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function cacheKey(trackId: string): string {
  return `song-research:v2:${trackId}`;
}

export async function getCachedReport(trackId: string): Promise<SongInfo | null> {
  const redis = Redis.fromEnv();
  const cached = await redis.get<SongInfo>(cacheKey(trackId));
  return cached ?? null;
}

export async function setCachedReport(trackId: string, report: SongInfo): Promise<void> {
  const redis = Redis.fromEnv();
  await redis.set(cacheKey(trackId), report, { ex: CACHE_TTL_SECONDS });
}
