import type { SampleNode, SampleRelation } from '../../src/types/samples';

// Up to 2 generations back, at most 4 parents per song, so one tree costs at most 1 search + 5 song reads.
const MAX_DEPTH = 2;
const MAX_PARENTS = 4;
const RELATIONS: SampleRelation[] = ['samples', 'interpolates'];

interface GeniusSongRef {
  id: number;
  title: string;
  url: string;
  primary_artist: { name: string };
  song_art_image_thumbnail_url?: string | null;
  release_date_for_display?: string | null;
}
interface GeniusSong extends GeniusSongRef {
  song_relationships?: { relationship_type: string; songs: GeniusSongRef[] }[];
}

export class GeniusError extends Error {}

const key = (text: string) =>
  text.toLowerCase().split(/ [-([]/)[0].normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '');

async function genius<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`https://api.genius.com${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new GeniusError(`Genius ${path.split('?')[0]} failed: ${res.status}`);
  return ((await res.json()) as { response: T }).response;
}

/** The Genius song for a Spotify track: first hit whose artist and title agree, or null. */
export async function findGeniusSong(title: string, artist: string, token: string): Promise<number | null> {
  const { hits } = await genius<{ hits: { result: GeniusSongRef }[] }>(
    `/search?q=${encodeURIComponent(`${title} ${artist}`)}`, token);
  const wantTitle = key(title);
  const wantArtist = key(artist);
  const hit = hits.find(({ result }) => {
    const a = key(result.primary_artist.name);
    return key(result.title) === wantTitle && a !== '' && (a.includes(wantArtist) || wantArtist.includes(a));
  });
  return hit?.result.id ?? null;
}

// Genius lists a song's demo, instrumental or remix as something it "samples"/"interpolates"; those are the song itself.
const isOwnVersion = (song: GeniusSongRef, ref: GeniusSongRef) =>
  key(ref.primary_artist.name) === key(song.primary_artist.name) && key(ref.title).startsWith(key(song.title));

function node(song: GeniusSongRef, relation?: SampleRelation): SampleNode {
  const year = song.release_date_for_display?.match(/\d{4}/)?.[0] ?? null;
  return {
    geniusId: song.id,
    title: song.title,
    artist: song.primary_artist.name,
    url: song.url,
    image: song.song_art_image_thumbnail_url ?? null,
    year,
    ...(relation ? { relation } : {}),
    parents: [],
  };
}

/** What a song samples, then what those sample, from Genius song relationships. */
export async function buildSampleTree(rootId: number, token: string): Promise<SampleNode> {
  const seen = new Set<number>([rootId]);
  const expand = async (id: number, relation: SampleRelation | undefined, depth: number): Promise<SampleNode> => {
    const { song } = await genius<{ song: GeniusSong }>(`/songs/${id}`, token);
    const out = node(song, relation);
    if (depth >= MAX_DEPTH) return out;
    const parents: { ref: GeniusSongRef; relation: SampleRelation }[] = [];
    for (const rel of song.song_relationships ?? []) {
      if (!RELATIONS.includes(rel.relationship_type as SampleRelation)) continue;
      for (const ref of rel.songs) {
        if (parents.length >= MAX_PARENTS || seen.has(ref.id) || isOwnVersion(song, ref)) continue;
        seen.add(ref.id);
        parents.push({ ref, relation: rel.relationship_type as SampleRelation });
      }
    }
    // The last generation needs no song read: the relationship listing already has title and artist.
    // A parent whose own page fails still shows, just without its parents.
    out.parents = await Promise.all(parents.map(({ ref, relation: r }) =>
      depth + 1 >= MAX_DEPTH ? node(ref, r) : expand(ref.id, r, depth + 1).catch(() => node(ref, r))));
    return out;
  };
  return expand(rootId, undefined, 0);
}
