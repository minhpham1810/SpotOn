import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import styles from './SearchResults.module.css';

const SearchResults = ({ searchResults, onAddTrack, isLoading }) => {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const handleTrackClick = (trackId) => {
        navigate(`/song/${trackId}`);
    };

    const handleAddTrack = (e, track) => {
        e.stopPropagation(); // Prevent navigation when clicking add button
        try {
            onAddTrack(track);
        } catch (error) {
            showToast('Failed to add song to playlist', 'error');
        }
    };

    if (isLoading) {
        return (
            <div className={styles.SearchResults}>
                <div className={styles.Header}>
                    <h2 className={styles.Title}>Search Results</h2>
                </div>
                <div className={styles.Loading}>
                    <div className={styles.LoadingSpinner} />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.SearchResults}>
            <div className={styles.Header}>
                <h2 className={styles.Title}>Search Results</h2>
            </div>
            <div className={styles.Content}>
                {searchResults.length === 0 ? (
                    <div className={styles.EmptyState}>
                        <span className={styles.EmptyIcon}>🎵</span>
                        <p>No songs found</p>
                        <p>Try searching for a song, artist, or album</p>
                    </div>
                ) : (
                    <ul className={styles.TrackList}>
                        {searchResults.map((track) => (
                            <li 
                                key={track.id} 
                                className={styles.Track}
                                onClick={() => handleTrackClick(track.id)}
                            >
                                <img 
                                    src={track.cover} 
                                    alt={`${track.name} cover`} 
                                    className={styles.TrackCover}
                                />
                                <div className={styles.TrackInfo}>
                                    <h3 className={styles.TrackTitle}>{track.name}</h3>
                                    <p className={styles.TrackArtist}>
                                        {track.artist} • {track.album}
                                    </p>
                                </div>
                                <button
                                    className={styles.AddButton}
                                    onClick={(e) => handleAddTrack(e, track)}
                                    title="Add to playlist"
                                >
                                    +
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default SearchResults;