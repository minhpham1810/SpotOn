import React from 'react';
import styles from './Login.module.css';
import SpotifyAPI from '../api/SpotifyAPI';

const FEATURES = [
    {
        icon: '🎵',
        title: 'Music Discovery',
        description: "Search and discover millions of songs from Spotify's vast library"
    },
    {
        icon: '🤖',
        title: 'AI Insights',
        description: 'Get AI-powered insights and analysis for every song'
    },
    {
        icon: '📝',
        title: 'Playlist Creation',
        description: 'Create and manage your perfect playlists with ease'
    },
    {
        icon: '💫',
        title: 'Smart Features',
        description: 'Enjoy seamless playback and intelligent recommendations'
    }
];

const Login = () => {
    const handleLogin = (event) => {
        event.preventDefault();
        console.log('Starting Spotify login...');
        const loginUrl = SpotifyAPI.getLoginUrl();
        console.log('Redirecting to:', loginUrl);
        window.location.href = loginUrl;
    };

    return (
        <div className={styles.Login}>
            <div className={styles.Container}>
                <div className={styles.Logo}>🎵</div>
                <h1 className={styles.Title}>Welcome to SpotOn</h1>
                <p className={styles.Subtitle}>
                    Your personal music companion powered by AI. 
                    Discover, organize, and enjoy your music in a whole new way.
                </p>

                <ul className={styles.Features}>
                    {FEATURES.map((feature, index) => (
                        <li key={index} className={styles.Feature}>
                            <div className={styles.FeatureIcon}>{feature.icon}</div>
                            <h3 className={styles.FeatureTitle}>{feature.title}</h3>
                            <p className={styles.FeatureDescription}>
                                {feature.description}
                            </p>
                        </li>
                    ))}
                </ul>

                <button 
                    onClick={handleLogin}
                    className={styles.LoginButton}
                >
                    Connect with Spotify
                </button>
            </div>
        </div>
    );
};

export default Login;