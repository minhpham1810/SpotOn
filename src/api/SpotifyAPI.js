const clientId = "de8bb872f3b64eed937fabdeb092c834"; // Replace with your actual Client ID
const clientSecret = {{ secrets.SPOTIFY_API_KEY }}; // Replace with your actual Client Secret
const redirectUri = "http://localhost:3000"; // Ensure this matches your Spotify App settings
let accessToken = "";

const SpotifyAPI = {
    async getAccessToken() {
        if (accessToken) return accessToken;

        const authParams = new URLSearchParams();
        authParams.append("grant_type", "client_credentials");

        const response = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`
            },
            body: authParams
        });

        if (!response.ok) {
            throw new Error("Failed to fetch access token");
        }

        const data = await response.json();
        accessToken = data.access_token;
        return accessToken;
    },

    async searchTracks(query) {
        const token = await this.getAccessToken();
        const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

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
        const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

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
            credits: "N/A",
            preview_url: track.preview_url
        };
    }
};

export default SpotifyAPI;
