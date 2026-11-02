import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, test, expect, beforeEach } from 'vitest';
import SampleTreeCard from './SampleTreeCard';
import type { SampleMatch, SampleNode } from '../../types/samples';

const findSnippetUrl = vi.fn();
vi.mock('../../lib/itunesPreview', () => ({ findSnippetUrl: (...a: unknown[]) => findSnippetUrl(...a) }));

const leaf = (geniusId: number, title: string, relation: 'samples' | 'interpolates' = 'samples'): SampleNode => ({
  geniusId, title, artist: `${title} Artist`, url: `https://genius.com/${geniusId}`, image: null, year: '1979', relation, parents: [],
});
const TREE: SampleNode = {
  ...leaf(1, 'Stronger'), relation: undefined,
  parents: [{ ...leaf(2, 'Harder Better Faster Stronger'), parents: [leaf(3, 'Cola Bottle Baby')] }, leaf(4, 'A Melody', 'interpolates')],
};
const FOUND: SampleMatch = { found: true, score: 21, votes: 90, semitones: 1, speed: 1.06, mode: 'turntable',
  child_start_s: 7.2, child_end_s: 15, parent_start_s: 41.5, version: 'fp1' };
const CHILD = 'https://audio-ssl.itunes.apple.com/stronger.m4a';
const PARENT = 'https://audio-ssl.itunes.apple.com/hbfs.m4a';

let routes: Record<string, () => Response>;
beforeEach(() => {
  findSnippetUrl.mockReset().mockResolvedValue(PARENT);
  routes = { '/api/sample-tree': () => Response.json(TREE, { headers: { 'X-Audio-Check': 'on' } }), '/api/sample-match': () => Response.json(FOUND) };
  vi.stubGlobal('fetch', vi.fn(async (input: string) => routes[new URL(input, 'http://x').pathname]()));
});

test('shows what the song samples, two generations deep, marking re-played parts', async () => {
  render(<SampleTreeCard title="Stronger" artist="Kanye West" previewUrl={CHILD} />);
  expect(await screen.findByText('Harder Better Faster Stronger')).toBeInTheDocument();
  expect(screen.getByText('Cola Bottle Baby')).toBeInTheDocument();
  expect(screen.getByText('re-played')).toBeInTheDocument();
  // only sampled parents get an audio check; interpolations are re-played, so audio won't match
  expect(screen.getAllByRole('button', { name: /check the audio/i })).toHaveLength(2);
});

test('checking a sample uses the song preview, then describes where and how it was changed', async () => {
  render(<SampleTreeCard title="Stronger" artist="Kanye West" previewUrl={CHILD} />);
  fireEvent.click((await screen.findAllByRole('button', { name: /check the audio/i }))[0]);
  expect(await screen.findByText(/Heard Harder Better Faster Stronger at 0:41 inside Stronger at 0:07/)).toBeInTheDocument();
  expect(screen.getByText(/\+1 semitones, 1\.06× speed, sped up like a record/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /hear both/i })).toBeInTheDocument();
  const matchCall = vi.mocked(fetch).mock.calls.find(([u]) => String(u).startsWith('/api/sample-match'))!;
  const params = new URL(String(matchCall[0]), 'http://x').searchParams;
  expect([params.get('child'), params.get('parent')]).toEqual([CHILD, PARENT]);
  expect(findSnippetUrl).toHaveBeenCalledTimes(1);   // the root's preview is reused
});

test('a non-iTunes page preview is not sent to the matcher; the iTunes one is looked up instead', async () => {
  render(<SampleTreeCard title="Stronger" artist="Kanye West" previewUrl="https://p.scdn.co/mp3-preview/abc" />);
  fireEvent.click((await screen.findAllByRole('button', { name: /check the audio/i }))[0]);
  await screen.findByText(/Heard/);
  expect(findSnippetUrl).toHaveBeenCalledWith('Stronger Artist', 'Stronger');
});

test('a sample used unchanged is described that way', async () => {
  routes['/api/sample-match'] = () => Response.json({ ...FOUND, semitones: 0, speed: 1, mode: 'unchanged' });
  render(<SampleTreeCard title="Stronger" artist="Kanye West" previewUrl={CHILD} />);
  fireEvent.click((await screen.findAllByRole('button', { name: /check the audio/i }))[0]);
  expect(await screen.findByText(/inside Stronger at 0:07, used as is\./)).toBeInTheDocument();
});

test('a sample that is not heard says so honestly', async () => {
  routes['/api/sample-match'] = () => Response.json({ ...FOUND, found: false, mode: 'none' });
  render(<SampleTreeCard title="Stronger" artist="Kanye West" previewUrl={CHILD} />);
  fireEvent.click((await screen.findAllByRole('button', { name: /check the audio/i }))[0]);
  expect(await screen.findByText(/Not confirmed in these 30-second previews/)).toBeInTheDocument();
});

test('missing previews and a disabled matcher are explained', async () => {
  findSnippetUrl.mockResolvedValue(null);
  render(<SampleTreeCard title="Stronger" artist="Kanye West" previewUrl={CHILD} />);
  fireEvent.click((await screen.findAllByRole('button', { name: /check the audio/i }))[0]);
  expect(await screen.findByText(/iTunes has no preview for Harder Better Faster Stronger/)).toBeInTheDocument();

  findSnippetUrl.mockResolvedValue(PARENT);
  routes['/api/sample-match'] = () => Response.json({ error: 'Audio matching is not running on this deployment.' }, { status: 503 });
  fireEvent.click(screen.getAllByRole('button', { name: /check the audio/i })[0]);
  expect(await screen.findByText('Audio matching is not running on this deployment.')).toBeInTheDocument();
});

test('renders nothing for a song that is not on Genius, and a note when it samples nothing', async () => {
  routes['/api/sample-tree'] = () => Response.json({ error: 'This song is not on Genius.' }, { status: 404 });
  const { container, unmount } = render(<SampleTreeCard title="x" artist="y" />);
  await waitFor(() => expect(container).toBeEmptyDOMElement());
  unmount();
  routes['/api/sample-tree'] = () => Response.json({ ...TREE, parents: [] }, { headers: { 'X-Audio-Check': 'on' } });
  render(<SampleTreeCard title="x" artist="y" />);
  expect(await screen.findByText(/lists no samples/)).toBeInTheDocument();
});

test('without a matcher the tree still shows, with no dead audio buttons', async () => {
  routes['/api/sample-tree'] = () => Response.json(TREE, { headers: { 'X-Audio-Check': 'off' } });
  render(<SampleTreeCard title="Stronger" artist="Kanye West" previewUrl={CHILD} />);
  expect(await screen.findByText('Harder Better Faster Stronger')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /check the audio/i })).toBeNull();
  expect(screen.getByText(/Audio checks are off on this deployment/)).toBeInTheDocument();
});
