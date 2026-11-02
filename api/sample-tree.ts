import { redis } from './_lib/cache';
import { clientIp, takeBudget } from './_lib/rateLimit';
import { buildSampleTree, findGeniusSong, GeniusError } from './_lib/sampleTree';
import type { SampleNode } from '../src/types/samples';

export const config = { runtime: 'edge' };

// shortcut: 1 day, because Genius's API terms on caching are unchecked; raise once they allow longer.
const TTL_SECONDS = 60 * 60 * 24;
const MAX_TEXT = 200;
// Each uncached tree costs up to 6 Genius calls; Genius is free, so the limiter fails open.
const LIMITS = {
  perIpPerHour: Number(process.env.SAMPLE_TREE_LIMIT_PER_IP_HOUR ?? 30),
  globalPerDay: Number(process.env.SAMPLE_TREE_LIMIT_GLOBAL_PER_DAY ?? 1000),
};

function json(status: number, body: unknown, source: string, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Report-Source': source,
      // Lets the UI hide "Check the audio" where no matcher runs (Vercel today).
      'X-Audio-Check': process.env.MATCHER_URL ? 'on' : 'off',
      ...headers,
    },
  });
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const name = url.searchParams.get('name')?.trim();
  const artist = url.searchParams.get('artist')?.trim();
  if (!name || !artist || name.length > MAX_TEXT || artist.length > MAX_TEXT) {
    return json(400, { error: 'name and artist are required, at most 200 characters each' }, 'invalid');
  }

  const cacheKey = `sample-tree:v1:${artist.toLowerCase()}|${name.toLowerCase()}`;
  try {
    const cached = await redis().get<SampleNode | { missing: true }>(cacheKey);
    if (cached) {
      return 'missing' in cached
        ? json(404, { error: 'This song is not on Genius.' }, 'cache')
        : json(200, cached, 'cache');
    }
  } catch (error) {
    console.error('sample-tree cache read failed:', error);
  }

  try {
    const budget = await takeBudget('sample-tree', LIMITS, clientIp(request));
    if (!budget.allowed) {
      return json(429, { error: 'Too many sample lookups. Try again later.' }, 'limited',
        { 'Retry-After': String(budget.retryAfterSeconds) });
    }
  } catch (error) {
    console.error('sample-tree limiter unavailable, allowing:', error);
  }

  const token = process.env.GENIUS_ACCESS_TOKEN as string;
  try {
    const rootId = await findGeniusSong(name, artist, token);
    const tree = rootId ? await buildSampleTree(rootId, token) : null;
    redis().set(cacheKey, tree ?? { missing: true }, { ex: TTL_SECONDS }).catch((error) => {
      console.error('sample-tree cache write failed:', error);
    });
    return tree ? json(200, tree, 'fresh') : json(404, { error: 'This song is not on Genius.' }, 'fresh');
  } catch (error) {
    console.error('sample-tree failed:', error);
    const message = error instanceof GeniusError ? 'Genius is not answering right now.' : 'Could not load samples.';
    return json(502, { error: message }, 'error');
  }
}
