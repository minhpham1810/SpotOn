import { test, expect, vi, beforeEach } from 'vitest';
import { buildSampleTree, findGeniusSong, GeniusError } from './sampleTree';

const ref = (id: number, title: string, artist: string) => ({
  id, title, url: `https://genius.com/${id}`, primary_artist: { name: artist },
  song_art_image_thumbnail_url: null, release_date_for_display: 'June 12, 2007',
});

const songs: Record<number, unknown> = {
  1: { ...ref(1, 'Stronger', 'Kanye West'), song_relationships: [
    { relationship_type: 'samples', songs: [ref(2, 'Harder, Better, Faster, Stronger', 'Daft Punk'), ref(5, 'Part 2', 'X')] },
    { relationship_type: 'sampled_in', songs: [ref(9, 'Later Song', 'Y')] },
    { relationship_type: 'interpolates', songs: [ref(8, 'Stronger (Demo)', 'Kanye West'), ref(6, 'Melody', 'Z')] },
  ] },
  2: { ...ref(2, 'Harder, Better, Faster, Stronger', 'Daft Punk'), song_relationships: [
    { relationship_type: 'samples', songs: [ref(3, 'Cola Bottle Baby', 'Edwin Birdsong'), ref(1, 'Stronger', 'Kanye West')] },
  ] },
  6: { ...ref(6, 'Melody', 'Z'), song_relationships: [] },
};
const calls: string[] = [];

beforeEach(() => {
  calls.length = 0;
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const path = new URL(input).pathname;
    calls.push(path);
    if (path.startsWith('/search')) {
      return Response.json({ response: { hits: [
        { result: ref(7, 'Stronger (Remix)', 'Someone Else') },
        { result: ref(1, 'Stronger', 'Kanye West') },
      ] } });
    }
    const id = Number(path.split('/').pop());
    if (id === 5) return new Response('boom', { status: 500 });
    return songs[id] ? Response.json({ response: { song: songs[id] } }) : new Response('', { status: 404 });
  }));
});

test('findGeniusSong picks the hit whose title and artist match, not the first hit', async () => {
  expect(await findGeniusSong('Stronger', 'Kanye West', 't')).toBe(1);
  expect(await findGeniusSong('Nope', 'Nobody', 't')).toBeNull();
});

test('buildSampleTree follows samples and interpolations two generations back', async () => {
  const tree = await buildSampleTree(1, 't');
  expect(tree.title).toBe('Stronger');
  expect(tree.year).toBe('2007');
  expect(tree.parents.map((p) => [p.title, p.relation])).toEqual([
    ['Harder, Better, Faster, Stronger', 'samples'], ['Part 2', 'samples'], ['Melody', 'interpolates'],
  ]);
  // "sampled_in" is the other direction and is ignored; the song's own demo and the cycle back to the root are dropped.
  expect(tree.parents[0].parents.map((p) => p.title)).toEqual(['Cola Bottle Baby']);
  // grandparents come from the listing, without their own song reads
  expect(calls).not.toContain('/songs/3');
});

test('a parent whose page fails is kept as a leaf instead of failing the tree', async () => {
  const tree = await buildSampleTree(1, 't');
  expect(tree.parents[1]).toMatchObject({ title: 'Part 2', parents: [] });
});

test('a failing root raises GeniusError', async () => {
  await expect(buildSampleTree(404, 't')).rejects.toBeInstanceOf(GeniusError);
});
