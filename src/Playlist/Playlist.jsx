// Playlist.jsx
import React from 'react';
import Tracklist from '../Tracklist/Tracklist';
import styles from './Playlist.module.css';

const mockPlaylist = [
    { id: 3, name: "My Favorite Song", artist: "Artist 3", album: "Album 3" }
];

const Playlist = () => {
    return (
        <div className={styles.Playlist}>
            <h2>My Playlist</h2>
            <input type="text" placeholder="New Playlist Name" />
            <Tracklist tracks={mockPlaylist} />
            <button>Save To Spotify</button>
        </div>
    );
};

export default Playlist;