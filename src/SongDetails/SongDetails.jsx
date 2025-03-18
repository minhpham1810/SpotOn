// SongDetails.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './SongDetails.module.css';
import SpotifyAPI from '../api/SpotifyAPI';

const SongDetails = ({ onAddToPlaylist }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [song, setSong] = useState(null);
    const [songSummary, setSongSummary] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const audioRef = useRef(null);

    useEffect(() => {
        const fetchSongDetails = async () => {
            try {
                setIsLoading(true);
                const data = await SpotifyAPI.getTrackDetails(id);
                setSong(data);

                // Generate song summary using Gemini
                const response = await fetch('/__mcp__/tool', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        server: 'gemini',
                        tool: 'generate_song_summary',
                        arguments: {
                            title: data.name,
                            artist: data.artist,
                            album: data.album
                        }
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result && !result.isError) {
                        setSongSummary(result.content[0].text);
                    }
                }
            } catch (error) {
                console.error('Error fetching song details:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSongDetails();
    }, [id]);

    const togglePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    useEffect(() => {
        const audioElement = audioRef.current;
        if (audioElement) {
            const handleEnded = () => setIsPlaying(false);
            audioElement.addEventListener('ended', handleEnded);
            return () => audioElement.removeEventListener('ended', handleEnded);
        }
    }, []);

    const handleSaveToPlaylist = () => {
        onAddToPlaylist(song);
    };

    if (isLoading) {
        return <div className={styles.Loading}>Loading...</div>;
    }

    if (!song) {
        return <div className={styles.Error}>Failed to load song details.</div>;
    }

    return (
        <div className={styles.SongDetails}>
            <button
                className={styles.BackButton}
                onClick={() => navigate('/')}
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
                    {songSummary && (
                        <div className={styles.Summary}>
                            <h3>Song Summary</h3>
                            <p>{songSummary}</p>
                        </div>
                    )}
                </div>
            </div>
            
            <div className={styles.AudioControls}>
                <audio
                    ref={audioRef}
                    src={song.preview_url}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                />
                <button
                    className={styles.PlayButton}
                    onClick={togglePlayPause}
                >
                    {isPlaying ? 'Pause' : 'Play Preview'}
                </button>
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
