import type { SampleMatch, SampleNode } from '../types/samples';

export class SamplesUnavailableError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<{ body: T; headers: Headers }> {
  const response = await fetch(path, { signal });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new SamplesUnavailableError((body as { error?: string }).error ?? `Request failed (${response.status})`, response.status);
  }
  return { body: body as T, headers: response.headers };
}

/** What the song samples, two generations back, or null when the song is not on Genius. */
export async function fetchSampleTree(
  name: string, artist: string, signal?: AbortSignal
): Promise<{ tree: SampleNode; audioCheck: boolean } | null> {
  const query = new URLSearchParams({ name, artist });
  try {
    const { body, headers } = await getJson<SampleNode>(`/api/sample-tree?${query}`, signal);
    return { tree: body, audioCheck: headers.get('x-audio-check') === 'on' };
  } catch (error) {
    if (error instanceof SamplesUnavailableError && error.status === 404) return null;
    throw error;
  }
}

export async function fetchSampleMatch(childPreview: string, parentPreview: string, signal?: AbortSignal): Promise<SampleMatch> {
  const query = new URLSearchParams({ child: childPreview, parent: parentPreview });
  return (await getJson<SampleMatch>(`/api/sample-match?${query}`, signal)).body;
}
