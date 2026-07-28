export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  cover: string;
  preview_url?: string | null;
}

export interface TrackDetails extends SpotifyTrack {
  releaseDate: string;
}

export interface SpotifyTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  [key: string]: unknown;
}

export interface SpotifyPlaylist {
  id: string;
  [key: string]: unknown;
}
