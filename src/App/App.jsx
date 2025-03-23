// App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate, useLocation, Navigate } from 'react-router-dom';
import SearchBar from '../SearchBar/SearchBar';
import SearchResults from '../SearchResults/SearchResults';
import Playlist from '../Playlist/Playlist';
import SongDetails from '../SongDetails/SongDetails';
import Login from '../Login/Login';
import LoadingSpinner from '../components/LoadingSpinner/LoadingSpinner';
import { ToastProvider, useToast } from '../contexts/ToastContext';
import styles from './App.module.css';
import SpotifyAPI from '../api/SpotifyAPI';

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
            <div className={styles.LoadingContainer}>
                <LoadingSpinner size="large" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Login />;
    }

    return (
        <div className={styles.App}>
            {!isAuthenticated ? (
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/callback" element={
                        <div className={styles.LoadingContainer}>
                            <LoadingSpinner size="large" />
                        </div>
                    } />
                    <Route path="*" element={<Login />} />
                </Routes>
            ) : (
                <>
                    <header className={styles.Header}>
                        <h1>SpotOn</h1>
                        <button
                            className={styles.LogoutButton}
                            onClick={handleLogout}
                        >
                            Logout
                        </button>
                    </header>
                    <SearchBar onSearch={searchSpotify} />
                    <Routes>
                        <Route path="/" element={
                            <div className={styles.mainContainer}>
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