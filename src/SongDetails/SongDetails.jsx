// SongDetails.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './SongDetails.module.css';
import SpotifyAPI from '../api/SpotifyAPI';

const SongDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [song, setSong] = useState(null);
    const audioRef = useRef(null);

    useEffect(() => {
        const fetchSongDetails = async () => {
            const data = await SpotifyAPI.getTrackDetails(id);
            setSong(data);
        };
        fetchSongDetails();
    }, [id]);

    const playMusic = () => {
        if (audioRef.current) {
            audioRef.current.play();
        }
    };

    const pauseMusic = () => {
        if (audioRef.current) {
            audioRef.current.pause();
        }
    };

    if (!song) {
        return <h2>Loading...</h2>;
    }

    return (
        <div className={styles.SongDetails}>
            <button onClick={() => navigate('/')}>Back to Homepage</button>
            <h2>{song.name}</h2>
            <img src={song.cover} alt={song.name} />
            <p><strong>Artist:</strong> {song.artist}</p>
            <p><strong>Album:</strong> {song.album}</p>
            <p><strong>Genre:</strong> {song.genre}</p>
            <p><strong>Credits:</strong> {song.credits}</p>
            <div className={styles.AudioControls}>
                <audio ref={audioRef} controls>
                    <source src={song.preview_url} type="audio/mpeg" />
                    Your browser does not support the audio element.
                </audio>
                <button onClick={playMusic}>Play</button>
                <button onClick={pauseMusic}>Pause</button>
            </div>
            <button>Save to Album</button>
        </div>
    );
};

export default SongDetails;
