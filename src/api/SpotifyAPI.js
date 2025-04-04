const SpotifyAPI = {
    clientId: process.env.REACT_APP_SPOTIFY_CLIENT_ID,
    clientSecret: process.env.REACT_APP_SPOTIFY_CLIENT_SECRET,
    redirectUri: window.location.origin + "/callback",
    markets: ['US', 'GB', 'ES', 'FR', 'DE'],

    init() {
        if (!this.clientId || !this.clientSecret) {
            console.error('Missing Spotify credentials');
            throw new Error('Spotify credentials not set in .env file');
        }

        this.accessToken = localStorage.getItem('spotify_access_token');
        this.refreshToken = localStorage.getItem('spotify_refresh_token');
        this.expiresAt = localStorage.getItem('spotify_expires_at');
    },

    isAuthenticated() {
        return this.accessToken && this.expiresAt && Date.now() < parseInt(this.expiresAt);
    },

    logout() {
        localStorage.removeItem('spotify_access_token');
        localStorage.removeItem('spotify_refresh_token');
        localStorage.removeItem('spotify_expires_at');
        localStorage.removeItem('spotify_auth_state');
        this.accessToken = null;
        this.refreshToken = null;
        this.expiresAt = null;
    },

    getLoginUrl() {
        const scope = [
            'streaming',
            'user-read-email',
            'user-read-private',
            'user-library-read',
            'user-library-modify',
            'playlist-modify-public',
            'playlist-modify-private',
            'user-read-playback-state',
            'user-modify-playback-state'
        ].join(' ');

        const state = Math.random().toString(36).substring(7);
        localStorage.setItem('spotify_auth_state', state);

        const params = new URLSearchParams({
            client_id: this.clientId,
            response_type: 'code',
            redirect_uri: this.redirectUri,
            state: state,
            scope: scope,
            show_dialog: true
        });

        return `https://accounts.spotify.com/authorize?${params.toString()}`;
    },

    async handleAuthCallback(code) {
        console.log('Handling auth callback...');

        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: this.redirectUri
        });

        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + btoa(this.clientId + ':' + this.clientSecret)
                },
                body: params
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
        if (!this.refreshToken) {
            throw new Error('No refresh token available');
        }

        const params = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: this.refreshToken
        });

        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + btoa(this.clientId + ':' + this.clientSecret)
                },
                body: params
            });

            if (!response.ok) {
                throw new Error('Failed to refresh token');
            }

            const data = await response.json();
            this.setTokens(data);
            return data;
        } catch (error) {
            console.error('Token refresh error:', error);
            throw error;
        }
    },

    setTokens(data) {
        this.accessToken = data.access_token;
        if (data.refresh_token) {
            this.refreshToken = data.refresh_token;
        }
        this.expiresAt = Date.now() + (data.expires_in * 1000);

        localStorage.setItem('spotify_access_token', this.accessToken);
        localStorage.setItem('spotify_refresh_token', this.refreshToken);
        localStorage.setItem('spotify_expires_at', this.expiresAt);

        console.log('Tokens updated successfully');
    },

    async getAccessToken() {
        if (!this.isAuthenticated()) {
            if (this.refreshToken) {
                await this.refreshAccessToken();
            } else {
                throw new Error('User not authenticated');
            }
        }
        return this.accessToken;
    },

    async searchTracks(query) {
        const token = await this.getAccessToken();
        
        try {
            // Search in US market first
            const response = await fetch(
                `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&market=US&limit=10`,
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
            console.log('Search results:', data.tracks.items.length, 'tracks found');

            return data.tracks.items.map(track => ({
                id: track.id,
                name: track.name,
                artist: track.artists[0].name,
                album: track.album.name,
                cover: track.album.images[0]?.url || "default-cover.jpg"
            }));
        } catch (error) {
            console.error('Search error:', error);
            throw error;
        }
    },

    async getTrackDetails(trackId) {
        const token = await this.getAccessToken();
        
        try {
            const response = await fetch(
                `https://api.spotify.com/v1/tracks/${trackId}?market=US`,
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
                releaseDate: track.album.release_date
            };
        } catch (error) {
            console.error('Track details error:', error);
            throw error;
        }
    },

    async createPlaylist(playlistName, tracks) {
        const token = await this.getAccessToken();

        try {
            // First, get the user's ID
            const userResponse = await fetch('https://api.spotify.com/v1/me', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!userResponse.ok) {
                throw new Error('Failed to get user information');
            }

            const userData = await userResponse.json();

            // Create a new playlist
            const createResponse = await fetch(
                `https://api.spotify.com/v1/users/${userData.id}/playlists`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: playlistName,
                        description: 'Created with SpotOn',
                        public: false
                    })
                }
            );

            if (!createResponse.ok) {
                throw new Error('Failed to create playlist');
            }

            const playlistData = await createResponse.json();

            // Add tracks to the playlist
            const addTracksResponse = await fetch(
                `https://api.spotify.com/v1/playlists/${playlistData.id}/tracks`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        uris: tracks.map(track => `spotify:track:${track.id}`)
                    })
                }
            );

            if (!addTracksResponse.ok) {
                throw new Error('Failed to add tracks to playlist');
            }

            return playlistData;
        } catch (error) {
            console.error('Error creating playlist:', error);
            throw error;
        }
    }
};

// Initialize the API when the module loads
SpotifyAPI.init();

export default SpotifyAPI;
