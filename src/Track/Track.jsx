// Track.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Track.module.css';

const Track = ({ track }) => {
    const navigate = useNavigate();
    
    const handleClick = () => {
        navigate(`/song/${track.id}`);
    };
    
    return (
        <div className={styles.Track} onClick={handleClick}>
            <img src={track.cover} alt={track.name} />
            <h3>{track.name}</h3>
            <p>{track.artist} | {track.album}</p>
        </div>
    );
};

export default Track;