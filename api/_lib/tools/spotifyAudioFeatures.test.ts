import { test, expect, vi, beforeEach } from 'vitest';
import { spotifyAudioFeatures } from './spotifyAudioFeatures';
import { _resetTokenCacheForTests } from './spotifyTools';

const creds = { clientId: 'id', clientSecret: 'secret' };

beforeEach(() => {
  _resetTokenCacheForTests();
  vi.stubGlobal('fetch', vi.fn());
});

test('spotifyAudioFeatures returns mapped audio features on success', async () => {
  const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok', expires_in: 3600 }) })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tempo: 118.6,
        key: 1,
        mode: 1,
        danceability: 0.71,
        energy: 0.62,
        valence: 0.45,
        acousticness: 0.12,
        instrumentalness: 0.02,
      }),
    });

  const result = await spotifyAudioFeatures('track1', creds);

  expect(result).toEqual({
    tempo: 119,
    key: 'C# Major',
    danceability: 0.71,
    energy: 0.62,
    valence: 0.45,
    acousticness: 0.12,
    instrumentalness: 0.02,
  });
});

test('spotifyAudioFeatures throws on a non-2xx response (e.g. restricted endpoint)', async () => {
  const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok', expires_in: 3600 }) })
    .mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({}) });

  await expect(spotifyAudioFeatures('track1', creds)).rejects.toThrow('Spotify audio-features failed: 403');
});

test('spotifyAudioFeatures reports an unknown key when Spotify omits key/mode', async () => {
  const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok', expires_in: 3600 }) })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tempo: 90,
        key: -1,
        mode: 0,
        danceability: 0.5,
        energy: 0.5,
        valence: 0.5,
        acousticness: 0.5,
        instrumentalness: 0.5,
      }),
    });

  const result = await spotifyAudioFeatures('track1', creds);

  expect(result.key).toBe('Unknown');
});
