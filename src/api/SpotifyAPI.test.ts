import { afterEach, beforeEach, expect, test, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('VITE_SPOTIFY_CLIENT_ID', 'test-client');
  localStorage.clear();
  localStorage.setItem('spotify_access_token', 'test-token');
  localStorage.setItem('spotify_expires_at', String(Date.now() + 60_000));
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

test('maps the Spotify preview URL into track details', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
    id: 'track-1',
    name: 'Test Song',
    artists: [{ name: 'Test Artist' }],
    album: {
      name: 'Test Album',
      images: [{ url: 'https://cdn.example/cover.jpg' }],
      release_date: '2026-07-29',
    },
    preview_url: 'https://cdn.example/preview.mp3',
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }));
  const { default: SpotifyAPI } = await import('./SpotifyAPI');

  const track = await SpotifyAPI.getTrackDetails('track-1');

  expect(track.preview_url).toBe('https://cdn.example/preview.mp3');
});

test('falls back to a matching iTunes snippet when Spotify has no preview', async () => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(new Response(JSON.stringify({
      id: 'track-1',
      name: 'Déjà Vu - 2011 Remaster',
      artists: [{ name: 'Test Artist' }],
      album: { name: 'Test Album', images: [], release_date: '2026-07-29' },
      preview_url: null,
    })))
    .mockResolvedValueOnce(new Response(JSON.stringify({
      results: [
        { artistName: 'Cover Band', trackName: 'Deja Vu', previewUrl: 'https://cdn.example/cover.m4a' },
        { artistName: 'Test Artist & Friends', trackName: 'Deja Vu (Live)', previewUrl: 'https://cdn.example/right.m4a' },
      ],
    })));
  const { default: SpotifyAPI } = await import('./SpotifyAPI');

  const track = await SpotifyAPI.getTrackDetails('track-1');

  expect(track.preview_url).toBe('https://cdn.example/right.m4a');
  expect(String(vi.mocked(fetch).mock.calls[1][0])).toContain('term=Test%20Artist%20D%C3%A9j%C3%A0%20Vu');
});

test('reports no preview when the snippet lookup fails', async () => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(new Response(JSON.stringify({
      id: 'track-1',
      name: 'Test Song',
      artists: [{ name: 'Test Artist' }],
      album: { name: 'Test Album', images: [], release_date: '2026-07-29' },
    })))
    .mockRejectedValueOnce(new Error('offline'));
  const { default: SpotifyAPI } = await import('./SpotifyAPI');

  expect((await SpotifyAPI.getTrackDetails('track-1')).preview_url).toBeNull();
});

test('maps preview URLs into search results', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
    tracks: {
      items: [{
        id: 'track-2',
        name: 'Search Song',
        artists: [{ name: 'Search Artist' }],
        album: {
          name: 'Search Album',
          images: [{ url: 'https://cdn.example/search-cover.jpg' }],
        },
        preview_url: 'https://cdn.example/search-preview.mp3',
      }],
    },
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }));
  const { default: SpotifyAPI } = await import('./SpotifyAPI');

  const [track] = await SpotifyAPI.searchTracks('Search Song');

  expect(track.preview_url).toBe('https://cdn.example/search-preview.mp3');
});
