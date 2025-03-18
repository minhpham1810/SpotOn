// Playlist.jsx
import React, { useState } from 'react';
import Tracklist from '../Tracklist/Tracklist';
import styles from './Playlist.module.css';

const Playlist = ({ tracks, onRemoveTrack }) => {
    const [playlistName, setPlaylistName] = useState('My Playlist');

    return (
        <div className={styles.Playlist}>
            <h2>{playlistName}</h2>
            <input
                type="text"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                placeholder="Playlist Name"
            />
            <Tracklist
                tracks={tracks}
                onRemoveTrack={onRemoveTrack}
                isPlaylist={true}
            />
            <button className={styles.SaveButton}>
                Save To Spotify
            </button>
        </div>
    );
};

export default Playlist;