import type { Redis } from '@upstash/redis';
import { redis as redisClient } from './cache';

// Fresh reports spend LLM and Tavily quota; cached reports are free and never limited.
// Defaults keep the worst case inside Tavily's 1,000 free credits/month:
// 15 reports/day x <=2 searches x 31 days = 930 credits.
const PER_IP_PER_HOUR = Number(process.env.RESEARCH_LIMIT_PER_IP_HOUR ?? 5);
const GLOBAL_PER_DAY = Number(process.env.RESEARCH_LIMIT_GLOBAL_PER_DAY ?? 15);

export type ResearchBudget =
  | { allowed: true }
  | { allowed: false; reason: 'ip' | 'global'; retryAfterSeconds: number };

// Fixed windows: INCR a counter keyed by the current window, set its expiry on first use.
async function hit(redis: Redis, key: string, windowSeconds: number): Promise<number> {
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSeconds);
  return count;
}

// Per-IP hourly and global daily fixed windows, counted in Redis under `${name}-limit:*`.
export async function takeBudget(
  name: string,
  limits: { perIpPerHour: number; globalPerDay: number },
  clientIp: string,
  now = Date.now()
): Promise<ResearchBudget> {
  const redis = redisClient();
  const nowSeconds = Math.floor(now / 1000);
  const hourWindow = Math.floor(nowSeconds / 3600);
  const dayWindow = Math.floor(nowSeconds / 86400);

  // Check the caller first so one noisy client can't burn the shared daily budget.
  if ((await hit(redis, `${name}-limit:ip:${clientIp}:${hourWindow}`, 3600)) > limits.perIpPerHour) {
    return { allowed: false, reason: 'ip', retryAfterSeconds: (hourWindow + 1) * 3600 - nowSeconds };
  }
  if ((await hit(redis, `${name}-limit:global:${dayWindow}`, 86400)) > limits.globalPerDay) {
    return { allowed: false, reason: 'global', retryAfterSeconds: (dayWindow + 1) * 86400 - nowSeconds };
  }
  return { allowed: true };
}

export function takeResearchBudget(clientIp: string, now = Date.now()): Promise<ResearchBudget> {
  return takeBudget('research', { perIpPerHour: PER_IP_PER_HOUR, globalPerDay: GLOBAL_PER_DAY }, clientIp, now);
}

// Vercel sets x-real-ip itself; server/index.ts overwrites it (socket address, or the
// X-Forwarded-For entry appended by TRUSTED_PROXY_HOPS trusted proxies on Cloud Run).
export function clientIp(request: Request): string {
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}
