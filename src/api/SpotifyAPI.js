<<<<<<< HEAD
const clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
const redirectUri = "http://localhost:3000";
const authEndpoint = "https://accounts.spotify.com/authorize";
const tokenEndpoint = "https://accounts.spotify.com/api/token";

console.log('Spotify Client ID:', clientId ? 'Present' : 'Missing');
console.log('Redirect URI:', redirectUri);

if (!clientId) {
    console.error('Missing Spotify Client ID');
    throw new Error('REACT_APP_SPOTIFY_CLIENT_ID is not set in .env file');
}

let accessToken = localStorage.getItem('spotify_access_token');
let refreshToken = localStorage.getItem('spotify_refresh_token');
let expiresAt = localStorage.getItem('spotify_expires_at');
=======
const clientId = "de8bb872f3b64eed937fabdeb092c834"; // Replace with your actual Client ID
const clientSecret = {{ secrets.SPOTIFY_API_KEY }}; // Replace with your actual Client Secret
const redirectUri = "http://localhost:3000"; // Ensure this matches your Spotify App settings
let accessToken = "";
>>>>>>> d0c94757642041acef51cbc24624497d7b8a2f0b

const SpotifyAPI = {
    isAuthenticated() {
        return accessToken && expiresAt && Date.now() < parseInt(expiresAt);
    },

    logout() {
        localStorage.removeItem('spotify_access_token');
        localStorage.removeItem('spotify_refresh_token');
        localStorage.removeItem('spotify_expires_at');
        localStorage.removeItem('spotify_auth_state');
        accessToken = null;
        refreshToken = null;
        expiresAt = null;
    },

    getLoginUrl() {
        const state = Math.random().toString(36).substring(7);
        localStorage.setItem('spotify_auth_state', state);

        const params = new URLSearchParams({
            client_id: clientId,
            response_type: 'code',
            redirect_uri: redirectUri,
            state: state,
            scope: 'user-library-read user-library-modify playlist-modify-public playlist-modify-private',
            show_dialog: true
        });

        const url = `${authEndpoint}?${params.toString()}`;
        console.log('Generated login URL:', url);
        return url;
    },

    async handleAuthCallback(code) {
        console.log('Handling auth callback with code:', code);

        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
            client_id: clientId,
        });

        try {
            console.log('Requesting access token...');
            const response = await fetch(tokenEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: body
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('Token exchange error:', data);
                throw new Error(data.error_description || 'Failed to exchange code for token');
            }

            console.log('Token exchange successful');
            this.setTokens(data);
            return data;
        } catch (error) {
            console.error('Auth callback error:', error);
            throw error;
        }
    },

    async refreshAccessToken() {
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        const body = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId,
        });

        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body
        });

        if (!response.ok) {
            throw new Error('Failed to refresh token');
        }

        const data = await response.json();
        this.setTokens({ ...data, refresh_token: refreshToken });
        return data;
    },

    setTokens(data) {
        accessToken = data.access_token;
        if (data.refresh_token) {
            refreshToken = data.refresh_token;
        }
        expiresAt = Date.now() + data.expires_in * 1000;

        localStorage.setItem('spotify_access_token', accessToken);
        localStorage.setItem('spotify_refresh_token', refreshToken);
        localStorage.setItem('spotify_expires_at', expiresAt);
    },

    async getAccessToken() {
        if (!this.isAuthenticated()) {
            if (refreshToken) {
                await this.refreshAccessToken();
            } else {
                throw new Error('User not authenticated');
            }
        }
        return accessToken;
    },

    async searchTracks(query) {
        const token = await this.getAccessToken();
        const response = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error("Failed to fetch search results");
        }

        const data = await response.json();
        return data.tracks.items.map(track => ({
            id: track.id,
            name: track.name,
            artist: track.artists[0].name,
            album: track.album.name,
            cover: track.album.images[0]?.url || "default-cover.jpg",
            preview_url: track.preview_url
        }));
    },

    async getTrackDetails(trackId) {
        const token = await this.getAccessToken();
        const response = await fetch(
            `https://api.spotify.com/v1/tracks/${trackId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error("Failed to fetch track details");
        }

        const track = await response.json();
        return {
            id: track.id,
            name: track.name,
            artist: track.artists[0].name,
            album: track.album.name,
            cover: track.album.images[0]?.url || "default-cover.jpg",
            preview_url: track.preview_url
        };
    }
};

export default SpotifyAPI;
