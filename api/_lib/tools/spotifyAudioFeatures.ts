import { getAppAccessToken, type SpotifyCredentials } from './spotifyTools';

export interface RawAudioFeatures {
  tempo: number;
  key: string;
  danceability: number;
  energy: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
}

const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function formatKey(key: number, mode: number): string {
  if (key < 0 || key > 11) return 'Unknown';
  return `${PITCH_CLASSES[key]} ${mode === 1 ? 'Major' : 'Minor'}`;
}

export async function spotifyAudioFeatures(
  trackId: string,
  creds: SpotifyCredentials
): Promise<RawAudioFeatures> {
  const token = await getAppAccessToken(creds);
  const response = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Spotify audio-features failed: ${response.status}`);
  }
  const data = await response.json();
  return {
    tempo: Math.round(data.tempo),
    key: formatKey(data.key, data.mode),
    danceability: data.danceability,
    energy: data.energy,
    valence: data.valence,
    acousticness: data.acousticness,
    instrumentalness: data.instrumentalness,
  };
}
