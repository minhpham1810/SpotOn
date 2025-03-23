import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import styles from './Playlist.module.css';

const Playlist = ({ tracks, onRemoveTrack, name, onNameChange }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(name);
    const inputRef = useRef(null);
    const { showToast } = useToast();

    const handleSavePlaylist = () => {
        // TODO: Implement save to Spotify functionality
        showToast('Playlist saving coming soon!', 'success');
    };

    const handleClearPlaylist = () => {
        if (window.confirm('Are you sure you want to clear the playlist?')) {
            tracks.forEach(track => onRemoveTrack(track.id));
            showToast('Playlist cleared', 'success');
        }
    };

    const handleNameClick = () => {
        setIsEditing(true);
        setEditValue(name);
    };

    const handleNameChange = (e) => {
        setEditValue(e.target.value);
    };

    const handleNameSubmit = () => {
        const newName = editValue.trim();
        if (newName && newName !== name) {
            onNameChange(newName);
        }
        setIsEditing(false);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleNameSubmit();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setEditValue(name);
        }
    };

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    return (
        <div className={styles.Playlist}>
            <div className={styles.Header}>
                {isEditing ? (
                    <input
                        ref={inputRef}
                        className={styles.NameInput}
                        value={editValue}
                        onChange={handleNameChange}
                        onBlur={handleNameSubmit}
                        onKeyDown={handleKeyPress}
                        maxLength={50}
                    />
                ) : (
                    <h2 
                        className={styles.Title} 
                        onClick={handleNameClick}
                        title="Click to edit playlist name"
                    >
                        {name}
                    </h2>
                )}
                <div className={styles.Controls}>
                    {tracks.length > 0 && (
                        <>
                            <button 
                                className={`${styles.Button} ${styles.SaveButton}`}
                                onClick={handleSavePlaylist}
                                title="Save to Spotify"
                            >
                                Save to Spotify
                            </button>
                            <button 
                                className={styles.Button}
                                onClick={handleClearPlaylist}
                                title="Clear playlist"
                            >
                                Clear All
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className={styles.Content}>
                {tracks.length === 0 ? (
                    <div className={styles.EmptyState}>
                        <span className={styles.EmptyIcon}>🎵</span>
                        <p>Your playlist is empty</p>
                        <p>Search for songs and add them to your playlist</p>
                    </div>
                ) : (
                    <ul className={styles.TrackList}>
                        {tracks.map((track) => (
                            <li key={track.id} className={styles.Track}>
                                <div className={styles.TrackInfo}>
                                    <h3 className={styles.TrackTitle}>{track.name}</h3>
                                    <p className={styles.TrackArtist}>
                                        {track.artist} • {track.album}
                                    </p>
                                </div>
                                <button
                                    className={styles.RemoveButton}
                                    onClick={() => onRemoveTrack(track.id)}
                                    title="Remove from playlist"
                                >
                                    ✕
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default Playlist;