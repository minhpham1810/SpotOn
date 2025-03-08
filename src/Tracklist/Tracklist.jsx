// Tracklist.jsx
import React from 'react';
import Track from '../Track/Track';
import styles from './Tracklist.module.css';

const Tracklist = ({ tracks }) => {
    return (
        <div className={styles.Tracklist}>
            {tracks.map(track => (
                <Track key={track.id} track={track} />
            ))}
        </div>
    );
};

export default Tracklist;