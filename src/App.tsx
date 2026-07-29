import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ArrowUpRight, BookOpenText, Headphones, Waveform } from '@phosphor-icons/react';
import SearchBar from './SearchBar';
import SearchResults, { SearchStatus } from './SearchResults';
import Playlist from './Playlist';
import SongDetails from './SongDetails';
import Login from './Login';
import LoadingSpinner from './LoadingSpinner';
import { ToastProvider, useToast } from './contexts/ToastContext';
import SpotifyAPI from './api/SpotifyAPI';
import { SpotifyTrack } from './types/spotify';

const MainContent: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();
    const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
    const [playlist, setPlaylist] = useState<SpotifyTrack[]>([]);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [playlistName, setPlaylistName] = useState("My Playlist");
    const [searchQuery, setSearchQuery] = useState('');
    const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle');
    const [searchError, setSearchError] = useState<string | null>(null);
    const searchRequestId = useRef(0);

    useEffect(() => {
        const checkAuth = async () => {
            if (SpotifyAPI.isAuthenticated()) {
                setIsAuthenticated(true);
                setIsLoading(false);
                return;
            } else {
                try {
                    await SpotifyAPI.refreshAccessToken();
                    setIsAuthenticated(true);
                    setIsLoading(false);
                    return;
                } catch {
                    console.warn("Could not refresh token, redirecting to login");
                }
            }

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

            if (!isAuthenticated && location.pathname !== '/login') {
                navigate('/login', { replace: true });
            }
            setIsLoading(false);
        };

        checkAuth();
    }, [location, navigate, isAuthenticated, showToast]);

    const searchSpotify = async (query: string) => {
        const trimmedQuery = query.trim();
        const requestId = searchRequestId.current + 1;
        searchRequestId.current = requestId;

        if (!trimmedQuery) {
            setSearchResults([]);
            setSearchQuery('');
            setSearchError(null);
            setSearchStatus('idle');
            return;
        }

        setSearchQuery(trimmedQuery);
        setSearchStatus('loading');
        setSearchError(null);
        try {
            const results = await SpotifyAPI.searchTracks(trimmedQuery);
            if (requestId !== searchRequestId.current) return;
            setSearchResults(results);
            setSearchStatus(results.length > 0 ? 'success' : 'empty');
        } catch (error) {
            if (requestId !== searchRequestId.current) return;
            console.error('Search error:', error);
            setSearchResults([]);
            setSearchStatus('error');
            setSearchError('The Spotify catalog is temporarily unavailable. Try the same search again.');
            if (error instanceof Error && error.message === 'User not authenticated') {
                setIsAuthenticated(false);
                navigate('/login', { replace: true });
            }
        }
    };

    const addToPlaylist = (track: SpotifyTrack) => {
        if (!playlist.find(item => item.id === track.id)) {
            setPlaylist([...playlist, track]);
            showToast(`Added "${track.name}" to ${playlistName}`, 'success');
        } else {
            showToast('Song is already in playlist', 'error');
        }
    };

    const removeFromPlaylist = (trackId: string) => {
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
        setSearchQuery('');
        setSearchStatus('idle');
        setSearchError(null);
        setPlaylist([]);
        showToast('Logged out successfully', 'success');
        navigate('/login', { replace: true });
    };

    const updatePlaylistName = (newName: string) => {
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

    const isSongRoute = location.pathname.startsWith('/song/');
    const hasSearch = searchStatus !== 'idle';

    return (
        <div
            data-testid="authenticated-shell"
            data-route-shell={isSongRoute ? 'song' : 'search'}
            data-search-view={isSongRoute ? undefined : hasSearch ? 'results' : 'home'}
            className={
                isSongRoute
                    ? 'min-h-[100dvh] bg-background text-white'
                    : 'search-page'
            }
        >
            {!isSongRoute && (
                <>
                    <header className="search-shell search-topbar">
                        <div
                            className="font-syne text-[1.625rem] font-extrabold uppercase tracking-[0.04em]"
                            aria-label="SpotOn Music App"
                        >
                            <span>Spot</span>
                            <span className="text-primary">On</span>
                        </div>
                        <div className="flex items-center gap-5 sm:gap-7">
                            <div className="hidden items-center gap-2 text-[0.6875rem] uppercase tracking-[0.13em] text-white/35 sm:flex">
                                <span className="search-status-dot" aria-hidden="true" />
                                Spotify connected
                            </div>
                            <button type="button" className="search-text-action" onClick={handleLogout}>
                                Logout
                            </button>
                        </div>
                    </header>

                    <section className={`search-shell search-hero ${hasSearch ? 'search-hero--active' : ''}`}>
                        <div className="search-hero__copy">
                            <p className="search-eyebrow">Music, researched in context</p>
                            <h1 className={`${hasSearch ? 'max-w-none lg:text-5xl' : 'max-w-[13ch] lg:text-6xl'} font-syne text-4xl font-extrabold leading-[0.98] tracking-[-0.04em] text-white sm:text-5xl`}>
                                {hasSearch ? 'Search the catalog.' : 'What do you want to understand?'}
                            </h1>
                            <p className="mt-5 max-w-[58ch] text-sm leading-relaxed text-white/50 sm:text-base">
                                {hasSearch
                                    ? `Explore matches for “${searchQuery}”, add a track to your playlist, or open its full research report.`
                                    : 'Find any track, hear the available preview, and open a sourced report on the sound, story, and people behind it.'}
                            </p>
                            <div className="mt-8 max-w-[46rem]">
                                <SearchBar onSearch={searchSpotify} isLoading={searchStatus === 'loading'} />
                            </div>
                        </div>

                        <div className="search-hero__signal" aria-label="SpotOn research path">
                            <div className="search-signal__orbit" aria-hidden="true">
                                <div className="search-signal__disc">
                                    <Waveform size={30} weight="bold" />
                                </div>
                            </div>
                            <ol className="search-signal__steps">
                                <li>
                                    <span>01</span>
                                    <div>
                                        <Headphones size={17} weight="bold" aria-hidden="true" />
                                        <p>Find the recording</p>
                                    </div>
                                </li>
                                <li>
                                    <span>02</span>
                                    <div>
                                        <Waveform size={17} weight="bold" aria-hidden="true" />
                                        <p>Read its sonic shape</p>
                                    </div>
                                </li>
                                <li>
                                    <span>03</span>
                                    <div>
                                        <BookOpenText size={17} weight="bold" aria-hidden="true" />
                                        <p>Trace the wider story</p>
                                    </div>
                                </li>
                            </ol>
                            <div className="search-signal__footer">
                                <span>Search to begin</span>
                                <ArrowUpRight size={15} weight="bold" aria-hidden="true" />
                            </div>
                        </div>
                    </section>
                </>
            )}
            <Routes>
                <Route path="/" element={
                    <main className="search-shell search-workspace">
                        <SearchResults
                            searchResults={searchResults}
                            onAddTrack={addToPlaylist}
                            status={searchStatus}
                            query={searchQuery}
                            error={searchError}
                            onRetry={() => void searchSpotify(searchQuery)}
                        />
                        <Playlist
                            name={playlistName}
                            onNameChange={updatePlaylistName}
                            tracks={playlist}
                            onRemoveTrack={removeFromPlaylist}
                            onClearPlaylist={clearPlaylist}
                        />
                    </main>
                } />
                <Route path="/song/:id" element={
                    <SongDetails onAddToPlaylist={addToPlaylist} onLogout={handleLogout} />
                } />
                <Route path="*" element={
                    <Navigate to="/" replace />
                } />
            </Routes>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <Router>
            <ToastProvider>
                <MainContent />
            </ToastProvider>
        </Router>
    );
};

export default App;
