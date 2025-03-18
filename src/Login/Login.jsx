// Login.jsx
import React from 'react';
import styles from './Login.module.css';
import SpotifyAPI from '../api/SpotifyAPI';

const Login = () => {
    const handleLogin = () => {
        window.location.href = SpotifyAPI.getLoginUrl();
    };

    return (
        <div className={styles.Login}>
            <h1>Welcome to SpotOn</h1>
            <p>Connect with your Spotify account to:</p>
            <ul>
                <li>Save songs to your library</li>
                <li>Create and manage playlists</li>
                <li>Get personalized recommendations</li>
            </ul>
            <button onClick={handleLogin}>
                Connect with Spotify
            </button>
        </div>
    );
};

export default Login;