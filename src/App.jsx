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
                    <header className="max-w-[1200px] mx-auto mb-0 px-4 pt-6 pb-4 flex justify-between items-center relative z-10 md:flex-row md:gap-0 flex-col gap-4">
                        <h1
                            className="m-0 flex items-baseline gap-0 tracking-tight"
                            aria-label="SpotOn Music App"
                            style={{ fontFamily: 'Syne, sans-serif' }}
                        >
                            <span className="text-3xl md:text-4xl font-extrabold text-white uppercase tracking-wide">
                                Spot
                            </span>
                            <span className="text-3xl md:text-4xl font-extrabold text-primary uppercase tracking-wide">
                                On
                            </span>
                        </h1>
                        <button
                            className="text-white/40 text-sm cursor-pointer transition-all duration-300 hover:text-white relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-px after:bg-white after:transition-all after:duration-300 hover:after:w-full md:w-auto w-full"
                            style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.05em' }}
                            onClick={handleLogout}
                        >
                            logout
                        </button>
                    </header>
                    <div className="max-w-[1200px] mx-auto mb-8 px-4">
                        <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                    </div>
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