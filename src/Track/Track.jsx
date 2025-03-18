// Track.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Track.module.css';

const Track = ({ track, onRemoveTrack, isPlaylist }) => {
    const navigate = useNavigate();
    
    const handleClick = (e) => {
        // Don't navigate if clicking the remove button
        if (e.target.tagName.toLowerCase() === 'button') {
            return;
        }
        navigate(`/song/${track.id}`);
    };
    
    const handleRemove = (e) => {
        e.stopPropagation();
        onRemoveTrack(track.id);
    };
    
    return (
        <div className={`${styles.Track} ${isPlaylist ? styles.PlaylistTrack : ''}`} onClick={handleClick}>
            <div className={styles.TrackInfo}>
                <img
                    className={styles.Cover}
                    src={track.cover}
                    alt={track.name}
                />
                <div className={styles.Details}>
                    <h3>{track.name}</h3>
                    <p>{track.artist} | {track.album}</p>
                </div>
            </div>
            {isPlaylist && (
                <button
                    className={styles.RemoveButton}
                    onClick={handleRemove}
                    aria-label="Remove from playlist"
                >
                    ×
                </button>
            )}
        </div>
    );
};

export default Track;