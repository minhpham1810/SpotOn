// Shared by api/ and src/. Keep free of browser-only code.

export type SampleRelation = 'samples' | 'interpolates';

/** A song and what it takes from (its parents), as listed on Genius. */
export interface SampleNode {
  geniusId: number;
  title: string;
  artist: string;
  url: string;
  image: string | null;
  year: string | null;
  /** How this song's child uses it. Absent on the root. */
  relation?: SampleRelation;
  parents: SampleNode[];
}

/** Matcher result for one (child, parent) pair of 30 s previews. */
export interface SampleMatch {
  found: boolean;
  score: number;
  votes: number;
  semitones: number;
  speed: number;
  mode: 'unchanged' | 'turntable' | 'stretched' | 'none';
  child_start_s: number;
  child_end_s: number;
  parent_start_s: number;
  version: string;
}

export const PREVIEW_HOST = 'audio-ssl.itunes.apple.com';

/** The only audio the matcher will fetch. Mirrors matcher/samplematch/audio.py:is_preview_url. */
export function isPreviewUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === PREVIEW_HOST && url.port === ''
      && url.username === '' && url.password === '';
  } catch {
    return false;
  }
}
