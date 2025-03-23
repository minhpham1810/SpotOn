import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import styles from './Track.module.css';

const Track = ({ track, onAdd, onRemove, isInPlaylist = false }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasAudioSupport, setHasAudioSupport] = useState(true);
    const audioRef = useRef(null);
    const navigate = useNavigate();
    const { showToast } = useToast();

    // Check audio support on mount
    useEffect(() => {
        setHasAudioSupport(typeof Audio !== 'undefined');
    }, []);

    // Initialize audio when track changes
    useEffect(() => {
        if (!track.preview_url || !hasAudioSupport) return;

        const handleEnded = () => setIsPlaying(false);
        const handleError = () => {
            setIsPlaying(false);
            setIsLoading(false);
            showToast('Failed to load audio preview', 'error');
        };

        const audio = new Audio(track.preview_url);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);
        audioRef.current = audio;

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.removeEventListener('ended', handleEnded);
                audioRef.current.removeEventListener('error', handleError);
                audioRef.current = null;
            }
        };
    }, [track.preview_url, hasAudioSupport, showToast]);

    const handlePlayPause = async (e) => {
        e.stopPropagation();

        if (!track.preview_url) {
            showToast('No preview available for this song', 'error');
            return;
        }

        try {
            setIsLoading(true);

            // Stop any other playing audio
            document.querySelectorAll('audio').forEach(audio => {
                if (audio !== audioRef.current) {
                    audio.pause();
                }
            });

            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                await audioRef.current.play();
                setIsPlaying(true);
            }
        } catch (error) {
            console.error('Playback error:', error);
            showToast('Failed to play preview', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTrackClick = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
        navigate(`/song/${track.id}`);
    };

    const handleAction = (e) => {
        e.stopPropagation();
        if (isInPlaylist) {
            onRemove(track.id);
        } else {
            onAdd(track);
        }
    };

    return (
        <div className={styles.Track} onClick={handleTrackClick}>
            <img 
                src={track.cover} 
                alt={`${track.name} cover`} 
                className={styles.Cover}
            />
            <div className={styles.Info}>
                <h3 className={styles.Title}>{track.name}</h3>
                <p className={styles.Artist}>
                    {track.artist} • {track.album}
                </p>
                {!track.preview_url && (
                    <span className={styles.NoPreviewLabel}>
                        No preview available
                    </span>
                )}
            </div>
            <div className={styles.Controls}>
                {track.preview_url && hasAudioSupport && (
                    <button
                        className={`${styles.Button} ${styles.PlayButton}`}
                        onClick={handlePlayPause}
                        disabled={isLoading}
                        title={isPlaying ? 'Pause preview' : 'Play preview'}
                    >
                        {isLoading ? '⌛' : isPlaying ? '⏸' : '▶'}
                    </button>
                )}
                <button
                    className={`${styles.Button} ${isInPlaylist ? styles.RemoveButton : styles.AddButton}`}
                    onClick={handleAction}
                    title={isInPlaylist ? 'Remove from playlist' : 'Add to playlist'}
                >
                    {isInPlaylist ? '−' : '+'}
                </button>
            </div>
        </div>
    );
};

export default Track;