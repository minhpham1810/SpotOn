export interface SpotifyCredentials {
  clientId: string;
  clientSecret: string;
}

interface CachedToken {
  value: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

export function _resetTokenCacheForTests(): void {
  cachedToken = null;
}

async function getAppAccessToken(creds: SpotifyCredentials): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  const basic = btoa(`${creds.clientId}:${creds.clientSecret}`);
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Spotify token request failed: ${response.status}`);
  }

  const data = await response.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

async function resolveArtistId(name: string, token: string): Promise<string | null> {
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) return null;
  const data = await response.json();
  return data.artists?.items?.[0]?.id ?? null;
}

export async function spotifySearch(query: string, creds: SpotifyCredentials): Promise<string> {
  const token = await getAppAccessToken(creds);
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error(`Spotify search failed: ${response.status}`);
  const data = await response.json();
  const tracks = (data.tracks?.items ?? []).map(
    (t: { name: string; artists: { name: string }[] }) =>
      `${t.name} by ${t.artists.map((a) => a.name).join(', ')}`
  );
  return tracks.length > 0 ? tracks.join('; ') : 'No results found.';
}

export async function spotifyArtistTopTracks(
  artistName: string,
  creds: SpotifyCredentials
): Promise<string> {
  const token = await getAppAccessToken(creds);
  const artistId = await resolveArtistId(artistName, token);
  if (!artistId) return `No Spotify artist found for "${artistName}".`;

  const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Spotify top-tracks failed: ${response.status}`);
  const data = await response.json();
  const names = (data.tracks ?? []).slice(0, 5).map((t: { name: string }) => t.name);
  return names.length > 0 ? names.join(', ') : 'No top tracks found.';
}
