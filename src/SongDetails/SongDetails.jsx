import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { 
    isAudioPlaybackSupported, 
    createAudio, 
    stopOtherAudio, 
    attemptPlay 
} from '../utils/audioUtils';
import styles from './SongDetails.module.css';
import SpotifyAPI from '../api/SpotifyAPI';
import GeminiAPI from '../api/GeminiAPI';

const SongDetails = ({ onAddToPlaylist }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [song, setSong] = useState(null);
    const [songSummary, setSongSummary] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);
    const [hasAudioSupport, setHasAudioSupport] = useState(true);
    const [error, setError] = useState(null);
    const audioRef = useRef(null);

    // Check audio support on mount
    useEffect(() => {
        setHasAudioSupport(isAudioPlaybackSupported());
    }, []);

    useEffect(() => {
        const fetchSongDetails = async () => {
            try {
                const data = await SpotifyAPI.getTrackDetails(id);
                setSong(data);
                
                // Generate song summary
                setIsLoadingSummary(true);
                const summary = await GeminiAPI.generateSongSummary(data);
                setSongSummary(summary);
                setIsLoadingSummary(false);
            } catch (error) {
                console.error('Error fetching song details:', error);
                setError('Failed to load song details');
                showToast('Failed to load song details', 'error');
            }
        };

        fetchSongDetails();

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, [id, showToast]);

    // Initialize audio when song changes
    useEffect(() => {
        if (!song?.preview_url || !hasAudioSupport) return;

        const handleEnded = () => setIsPlaying(false);
        const handleError = () => {
            setIsPlaying(false);
            setIsLoading(false);
            showToast('Failed to load audio preview', 'error');
        };

        audioRef.current = createAudio(song.preview_url, handleEnded, handleError);

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, [song?.preview_url, hasAudioSupport, showToast]);

    const handlePlayPause = async () => {
        if (!song.preview_url) {
            showToast('No preview available for this song', 'error');
            return;
        }

        if (!hasAudioSupport) {
            showToast('Audio playback is not supported in your browser', 'error');
            return;
        }

        try {
            setIsLoading(true);
            stopOtherAudio(audioRef.current);

            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                const playSuccess = await attemptPlay(audioRef.current);
                if (playSuccess) {
                    setIsPlaying(true);
                } else {
                    showToast('Failed to play preview', 'error');
                }
            }
        } catch (error) {
            console.error('Playback error:', error);
            showToast('Failed to play preview', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveToPlaylist = () => {
        try {
            onAddToPlaylist(song);
            showToast(`Added "${song.name}" to playlist`, 'success');
        } catch (error) {
            showToast('Failed to add song to playlist', 'error');
        }
    };

    if (error) {
        return (
            <div className={styles.Error}>
                <p>{error}</p>
                <button onClick={() => navigate('/')}>Back to Homepage</button>
            </div>
        );
    }

    if (!song) {
        return <div className={styles.Loading}>Loading...</div>;
    }

    return (
        <div className={styles.SongDetails}>
            <button 
                className={styles.BackButton}
                onClick={() => {
                    if (isPlaying && audioRef.current) {
                        audioRef.current.pause();
                    }
                    navigate('/');
                }}
            >
                Back to Homepage
            </button>
            <div className={styles.Content}>
                <img 
                    className={styles.Cover} 
                    src={song.cover} 
                    alt={song.name} 
                />
                <div className={styles.Info}>
                    <h2>{song.name}</h2>
                    <p><strong>Artist:</strong> {song.artist}</p>
                    <p><strong>Album:</strong> {song.album}</p>
                    
                    <div className={styles.Summary}>
                        <h3>About this Song</h3>
                        {isLoadingSummary ? (
                            <p className={styles.LoadingText}>
                                Generating insights about this song...
                            </p>
                        ) : (
                            <p>{songSummary}</p>
                        )}
                    </div>
                </div>
            </div>
            
            <div className={styles.AudioControls}>
                {song.preview_url && hasAudioSupport ? (
                    <button 
                        className={styles.PlayButton}
                        onClick={handlePlayPause}
                        disabled={isLoading}
                    >
                        {isLoading ? '⌛' : isPlaying ? 'Pause Preview' : 'Play Preview'}
                    </button>
                ) : (
                    <p className={styles.NoPreview}>
                        {!hasAudioSupport 
                            ? 'Audio playback not supported in your browser' 
                            : 'No preview available'}
                    </p>
                )}
                <button 
                    className={styles.SaveButton}
                    onClick={handleSaveToPlaylist}
                >
                    Add to Playlist
                </button>
            </div>
        </div>
    );
};

export default SongDetails;
