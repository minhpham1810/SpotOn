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
