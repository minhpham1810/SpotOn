import { redis } from './_lib/cache';
import { clientIp, takeBudget, type ResearchBudget } from './_lib/rateLimit';
import { isPreviewUrl, type SampleMatch } from '../src/types/samples';

export const config = { runtime: 'edge' };

// Must equal matcher/samplematch/server.py VERSION; results from another version are not cached.
const MATCHER_VERSION = 'fp1';
const TTL_SECONDS = 60 * 60 * 24 * 30; // a result only changes when the matcher version does
// Each fresh match costs ~1 s of matcher CPU (median, matcher/eval/RESULTS.md).
const LIMITS = {
  perIpPerHour: Number(process.env.SAMPLE_MATCH_LIMIT_PER_IP_HOUR ?? 30),
  globalPerDay: Number(process.env.SAMPLE_MATCH_LIMIT_GLOBAL_PER_DAY ?? 300),
};

function json(status: number, body: unknown, source: string, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'X-Report-Source': source, ...headers },
  });
}

async function cacheKey(child: string, parent: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${child}\n${parent}`));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `sample-match:${MATCHER_VERSION}:${hex}`;
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const child = url.searchParams.get('child');
  const parent = url.searchParams.get('parent');
  if (!isPreviewUrl(child) || !isPreviewUrl(parent) || child === parent) {
    return json(400, { error: 'child and parent must be two different iTunes preview URLs' }, 'invalid');
  }

  const key = await cacheKey(child, parent);
  try {
    const cached = await redis().get<SampleMatch>(key);
    if (cached) return json(200, cached, 'cache');
  } catch (error) {
    console.error('sample-match cache read failed:', error);
  }

  const matcherUrl = process.env.MATCHER_URL;
  if (!matcherUrl) {
    return json(503, { error: 'Audio matching is not running on this deployment.' }, 'matcher-off');
  }

  // Fail closed: matcher CPU is the one paid resource here.
  let budget: ResearchBudget;
  try {
    budget = await takeBudget('sample-match', LIMITS, clientIp(request));
  } catch (error) {
    console.error('sample-match limiter unavailable, refusing:', error);
    return json(503, { error: 'Audio matching is temporarily unavailable.' }, 'limiter-down', { 'Retry-After': '60' });
  }
  if (!budget.allowed) {
    return json(429, { error: 'Too many audio checks. Try again later.' }, 'limited',
      { 'Retry-After': String(budget.retryAfterSeconds) });
  }

  // shortcut: no auth header, so the matcher must only be reachable on a private network (compose, kind);
  // add a Cloud Run ID token here before deploying it there.
  let res: Response;
  try {
    res = await fetch(`${matcherUrl.replace(/\/$/, '')}/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ child_url: child, parent_url: parent }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    console.error('matcher unreachable:', error);
    return json(502, { error: 'The audio matcher is not answering.' }, 'error');
  }
  if (res.status === 503) {
    return json(503, { error: 'The audio matcher is warming up. Try again in a few seconds.' }, 'warming',
      { 'Retry-After': '10' });
  }
  if (res.status === 422) {
    return json(422, { error: 'One of the previews could not be read.' }, 'fresh');
  }
  if (!res.ok) {
    console.error('matcher failed:', res.status, await res.text().catch(() => ''));
    return json(502, { error: 'The audio check failed.' }, 'error');
  }

  const result = (await res.json()) as SampleMatch;
  if (result.version === MATCHER_VERSION) {
    redis().set(key, result, { ex: TTL_SECONDS }).catch((error) => console.error('sample-match cache write failed:', error));
  }
  return json(200, result, 'fresh');
}
