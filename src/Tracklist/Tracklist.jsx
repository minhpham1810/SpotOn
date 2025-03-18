// Tracklist.jsx
import React from 'react';
import Track from '../Track/Track';
import styles from './Tracklist.module.css';

const Tracklist = ({ tracks, onRemoveTrack, isPlaylist = false }) => {
    return (
        <div className={styles.Tracklist}>
            {tracks.map(track => (
                <Track
                    key={track.id}
                    track={track}
                    onRemoveTrack={onRemoveTrack}
                    isPlaylist={isPlaylist}
                />
            ))}
            {tracks.length === 0 && (
                <p className={styles.EmptyMessage}>
                    {isPlaylist
                        ? "No songs in playlist yet. Add songs from search results!"
                        : "No songs found. Try searching for something else!"}
                </p>
            )}
        </div>
    );
};

export default Tracklist;