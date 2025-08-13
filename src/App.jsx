// App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate, useLocation, Navigate } from 'react-router-dom';
import SearchBar from './SearchBar';
import SearchResults from './SearchResults';
import Playlist from './Playlist';
import SongDetails from './SongDetails';
import Login from './Login';
import LoadingSpinner from './LoadingSpinner';
import { ToastProvider, useToast } from './contexts/ToastContext';
import SpotifyAPI from './api/SpotifyAPI';

const MainContent = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();
    const [searchResults, setSearchResults] = useState([]);
    const [playlist, setPlaylist] = useState([]);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [playlistName, setPlaylistName] = useState("My Playlist");

    // Handle authentication
    useEffect(() => {
        const checkAuth = async () => {
            // If we're already authenticated, skip the check
            if (SpotifyAPI.isAuthenticated()) {
                setIsAuthenticated(true);
                setIsLoading(false);
                return;
            } else {
                // try to refresh token
                try {
                    await SpotifyAPI.refreshAccessToken();
                    setIsAuthenticated(true);
                    setIsLoading(false);
                    return;
                } catch {
                    console.warn("Could not refresh token, redirecting to login");
                }
            }

            // Handle callback from Spotify
            if (location.pathname === '/callback') {
                const params = new URLSearchParams(location.search);
                const code = params.get('code');
                const state = params.get('state');
                const storedState = localStorage.getItem('spotify_auth_state');
                
                try {
                    if (!code) throw new Error('No code provided');
                    if (state !== storedState) throw new Error('State mismatch');

                    await SpotifyAPI.handleAuthCallback(code);
                    setIsAuthenticated(true);
                    showToast('Successfully connected to Spotify', 'success');
                    navigate('/', { replace: true });
                } catch (error) {
                    console.error('Authentication error:', error);
                    showToast('Failed to connect to Spotify', 'error');
                    navigate('/login', { replace: true });
                } finally {
                    setIsLoading(false);
                }
                return;
            }

            // Not authenticated and not on login or callback page
            if (!isAuthenticated && location.pathname !== '/login') {
                navigate('/login', { replace: true });
            }
            setIsLoading(false);
        };

        checkAuth();
    }, [location, navigate, isAuthenticated, showToast]);

    const searchSpotify = async (query) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            const results = await SpotifyAPI.searchTracks(query);
            setSearchResults(results);
            if (results.length === 0) {
                showToast('No songs found', 'error');
            }
        } catch (error) {
            console.error('Search error:', error);
            showToast('Failed to search songs', 'error');
            if (error.message === 'User not authenticated') {
                setIsAuthenticated(false);
                navigate('/login', { replace: true });
            }
        }
    };

    const addToPlaylist = (track) => {
        if (!playlist.find(item => item.id === track.id)) {
            setPlaylist([...playlist, track]);
            showToast(`Added "${track.name}" to ${playlistName}`, 'success');
        } else {
            showToast('Song is already in playlist', 'error');
        }
    };

    const removeFromPlaylist = (trackId) => {
        const track = playlist.find(t => t.id === trackId);
        if (track) {
            setPlaylist(playlist.filter(t => t.id !== trackId));
            showToast(`Removed "${track.name}" from playlist`, 'success');
        }
    };

    const handleLogout = () => {
        SpotifyAPI.logout();
        setIsAuthenticated(false);
        setSearchResults([]);
        setPlaylist([]);
        showToast('Logged out successfully', 'success');
        navigate('/login', { replace: true });
    };

    const updatePlaylistName = (newName) => {
        setPlaylistName(newName);
        showToast(`Playlist renamed to "${newName}"`, 'success');
    };

    const clearPlaylist = () => {
        setPlaylist([]);
        showToast('Playlist cleared', 'success');
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-background to-background-elevated z-50">
                <LoadingSpinner size="large" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Login />;
    }

    return (
        <div className="min-h-screen p-5 text-center font-sans text-white bg-gradient-to-b from-background to-background-elevated relative">
            <div className="absolute inset-x-0 top-0 h-[300px] bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
            {!isAuthenticated ? (
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/callback" element={
                        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-background to-background-elevated z-50">
                            <LoadingSpinner size="large" />
                        </div>
                    } />
                    <Route path="*" element={<Login />} />
                </Routes>
            ) : (
                <>
                    <header className="max-w-[1200px] mx-auto mb-8 p-4 flex justify-between items-center bg-surface-lighter backdrop-blur-md rounded-xl border border-border relative z-10 animate-slideDown md:flex-row md:text-left md:gap-0 flex-col gap-4 text-center">
                        <h1
                            className="m-0 text-4xl md:text-5xl font-extrabold flex items-center gap-3 tracking-tight"
                            aria-label="SpotOn Music App"
                        >
                            <span
                                className="text-[2rem] md:text-[2.2rem] animate-bounce"
                                aria-hidden="true"
                            >
                                🎵
                            </span>
                            <span className="bg-gradient-to-r from-white to-primary-light bg-clip-text text-transparent drop-shadow-lg">
                                SpotOn
                            </span>
                        </h1>
                        <button
                            className="border-2 border-white/20 text-white px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-all duration-normal flex items-center gap-2 hover:bg-white/10 hover:border-white/30 hover:-translate-y-0.5 before:content-['👋'] before:text-lg md:w-auto w-full justify-center"
                            onClick={handleLogout}
                        >
                            Logout
                        </button>
                    </header>
                    <SearchBar onSearch={searchSpotify} />
                    <Routes>
                        <Route path="/" element={
                            <div className="max-w-[1200px] mx-auto mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 px-4 animate-fadeIn">
                                <SearchResults
                                    searchResults={searchResults}
                                    onAddTrack={addToPlaylist}
                                />
                                <Playlist
                                    name={playlistName}
                                    onNameChange={updatePlaylistName}
                                    tracks={playlist}
                                    onRemoveTrack={removeFromPlaylist}
                                    onClearPlaylist={clearPlaylist}
                                />
                            </div>
                        } />
                        <Route path="/song/:id" element={
                            <SongDetails onAddToPlaylist={addToPlaylist} />
                        } />
                        <Route path="*" element={
                            <Navigate to="/" replace />
                        } />
                    </Routes>
                </>
            )}
        </div>
    );
};

const App = () => {
    return (
        <Router>
            <ToastProvider>
                <MainContent />
            </ToastProvider>
        </Router>
    );
};

export default App;