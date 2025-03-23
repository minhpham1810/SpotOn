import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner/LoadingSpinner';
import styles from './SongDetails.module.css';
import SpotifyAPI from '../api/SpotifyAPI';
import GeminiAPI from '../api/GeminiAPI';

const SongDetails = ({ onAddToPlaylist }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [song, setSong] = useState(null);
    const [songInfo, setSongInfo] = useState(null);
    const [isLoadingInfo, setIsLoadingInfo] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSongDetails = async () => {
            try {
                const data = await SpotifyAPI.getTrackDetails(id);
                setSong(data);
                
                // Generate song info
                setIsLoadingInfo(true);
                const info = await GeminiAPI.generateSongInfo(data);
                setSongInfo(info);
                setIsLoadingInfo(false);
            } catch (error) {
                console.error('Error fetching song details:', error);
                setError('Failed to load song details');
                showToast('Failed to load song details', 'error');
            }
        };

        fetchSongDetails();
    }, [id, showToast]);

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

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className={styles.SongDetails}>
            <button 
                className={styles.BackButton}
                onClick={() => navigate('/')}
            >
                Back to Homepage
            </button>
            <div className={styles.Content}>
                <div className={styles.LeftColumn}>
                    <img
                        className={styles.Cover}
                        src={song.cover}
                        alt={song.name}
                    />
                    <div className={styles.BasicInfo}>
                        <h2>{song.name}</h2>
                        <p><strong>Artist:</strong> {song.artist}</p>
                        <p><strong>Album:</strong> {song.album}</p>
                        <p><strong>Release Date:</strong> {formatDate(song.releaseDate)}</p>
                    </div>
                </div>
                <div className={styles.RightColumn}>
                    {isLoadingInfo ? (
                        <div className={styles.LoadingContainer}>
                            <LoadingSpinner size="small" />
                            <p className={styles.LoadingText}>Gathering song info...</p>
                        </div>
                    ) : songInfo && (
                        <>
                            <div className={styles.Summary}>
                                <h3>About this Song</h3>
                                <p>{songInfo.summary}</p>
                            </div>
                            
                            <div className={styles.Credits}>
                                <h3>Song Credits</h3>
                                <p><strong>Genre:</strong> {songInfo.genre.join(', ')}</p>
                                <ul>
                                    {songInfo.credits.map((credit, index) => (
                                        <li key={index}>
                                            {credit.name} - {credit.role}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </>
                    )}
                </div>
            </div>
            
            <div className={styles.Controls}>
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
