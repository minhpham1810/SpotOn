// App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import SearchBar from '../SearchBar/SearchBar';
import SearchResults from '../SearchResults/SearchResults';
import Playlist from '../Playlist/Playlist';
import SongDetails from '../SongDetails/SongDetails';
import Login from '../Login/Login';
import styles from './App.module.css';
import SpotifyAPI from '../api/SpotifyAPI';

const AppContent = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchResults, setSearchResults] = useState([]);
    const [playlist, setPlaylist] = useState([]);
    const [isAuthenticated, setIsAuthenticated] = useState(SpotifyAPI.isAuthenticated());

    useEffect(() => {
        const code = new URLSearchParams(location.search).get('code');
        const state = new URLSearchParams(location.search).get('state');
        const storedState = localStorage.getItem('spotify_auth_state');

        const handleCallback = async () => {
            try {
                if (code) {
                    if (state === null || state !== storedState) {
                        console.error('State validation failed');
                        throw new Error('State validation failed');
                    }

                    localStorage.removeItem('spotify_auth_state');
                    await SpotifyAPI.handleAuthCallback(code);
                    setIsAuthenticated(true);
                    
                    // Clear the URL parameters and navigate to home
                    window.history.replaceState({}, document.title, '/');
                    navigate('/', { replace: true });
                }
            } catch (error) {
                console.error('Auth error:', error);
                SpotifyAPI.logout();
                setIsAuthenticated(false);
                navigate('/login', { replace: true });
            }
        };

        if (code) {
            handleCallback();
        }
    }, [location, navigate]);

    // Check authentication status regularly
    useEffect(() => {
        const checkAuth = () => {
            const isAuth = SpotifyAPI.isAuthenticated();
            if (isAuth !== isAuthenticated) {
                setIsAuthenticated(isAuth);
            }
            if (!isAuth && location.pathname !== '/login') {
                navigate('/login', { replace: true });
            }
        };

        checkAuth();
        const interval = setInterval(checkAuth, 1000);
        return () => clearInterval(interval);
    }, [location.pathname, navigate, isAuthenticated]);

    const searchSpotify = async (query) => {
        try {
            const results = await SpotifyAPI.searchTracks(query);
            setSearchResults(results);
        } catch (error) {
            if (error.message === 'User not authenticated') {
                setIsAuthenticated(false);
            }
            console.error('Search error:', error);
        }
    };

    const addToPlaylist = (track) => {
        if (!playlist.find(item => item.id === track.id)) {
            setPlaylist([...playlist, track]);
        }
    };

    const removeFromPlaylist = (trackId) => {
        setPlaylist(playlist.filter(track => track.id !== trackId));
    };

    const handleLogout = () => {
        SpotifyAPI.logout();
        setIsAuthenticated(false);
        navigate('/login', { replace: true });
    };

    if (!isAuthenticated) {
        return <Login />;
    }

    return (
        <div className={styles.App}>
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
                        <SearchResults searchResults={searchResults} />
                        <Playlist 
                            tracks={playlist} 
                            onRemoveTrack={removeFromPlaylist} 
                        />
                    </div>
                } />
                <Route path="/song/:id" element={
                    <SongDetails onAddToPlaylist={addToPlaylist} />
                } />
                <Route path="/login" element={<Login />} />
            </Routes>
        </div>
    );
};

const App = () => {
    return (
        <Router>
            <AppContent />
        </Router>
    );
};

export default App;