import { test, expect, vi, beforeEach } from 'vitest';
import {
  spotifySearch,
  spotifyArtistTopTracks,
  _resetTokenCacheForTests,
} from './spotifyTools';

const creds = { clientId: 'id', clientSecret: 'secret' };

beforeEach(() => {
  _resetTokenCacheForTests();
  vi.stubGlobal('fetch', vi.fn());
});

test('spotifySearch returns a formatted track list', async () => {
  const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok', expires_in: 3600 }) })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tracks: { items: [{ name: 'Song A', artists: [{ name: 'Artist A' }] }] },
      }),
    });

  const result = await spotifySearch('song a', creds);

  expect(result).toBe('Song A by Artist A');
});

test('spotifyArtistTopTracks reports when no artist is found', async () => {
  const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok', expires_in: 3600 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ artists: { items: [] } }) });

  const result = await spotifyArtistTopTracks('Unknown Artist', creds);

  expect(result).toBe('No Spotify artist found for "Unknown Artist".');
});

test('spotifyArtistTopTracks returns formatted track names', async () => {
  const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok', expires_in: 3600 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ artists: { items: [{ id: 'artist1' }] } }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ tracks: [{ name: 'Hit 1' }, { name: 'Hit 2' }] }) });

  const result = await spotifyArtistTopTracks('Some Artist', creds);

  expect(result).toBe('Hit 1, Hit 2');
});
