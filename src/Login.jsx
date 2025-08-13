import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SpotifyAPI from './api/SpotifyAPI';

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
    const navigate = useNavigate();

    useEffect(() => {
        try {
            SpotifyAPI.init();
        } catch (e) {
            console.error("Failed to initialize Spotify API", e);
        }

        if (SpotifyAPI.isAuthenticated()) {
            navigate('/', { replace: true });
        }
    }, [navigate]);

    const handleLogin = async (event) => {
        event.preventDefault();
        console.log('Starting Spotify login...');
        try {
            const loginUrl = await SpotifyAPI.getLoginUrl();
            console.log('Redirecting to:', loginUrl);
            window.location.href = loginUrl;
        } catch (error) {
            console.error('Failed to generate login URL:', error);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-background to-background-elevated relative overflow-hidden">

            {/* Header */}
            <div className="w-full text-[#b7a8a8] text-base font-semibold text-center tracking-wider z-10">
                Made by Minh Pham
            </div>

            {/* Main content container */}
            <div className="max-w-[500px] w-full text-center relative z-10 animate-fadeIn h-full box-border">
                {/* Logo */}
                <div className="text-5xl mb-4 animate-bounce">🎵</div>

                {/* Title and subtitle */}
                <h1 className="text-4xl text-white font-bold m-0 mb-4">Welcome to SpotOn</h1>
                <p className="text-text-secondary text-lg mb-8 leading-relaxed">
                    Your personal music companion powered by AI. 
                    Discover, organize, and enjoy your music in a whole new way.
                </p>

                {/* Features grid */}
                <ul className="list-none p-0 m-0 mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {FEATURES.map((feature, index) => (
                        <li key={index}
                            className="bg-surface-lighter p-6 rounded-xl border border-border
                                     transition-all duration-normal hover:-translate-y-1.5
                                     hover:bg-surface-light hover:shadow-[0_8px_16px_rgba(0,0,0,0.2)]
                                     hover:border-primary/30 group">
                            <div className="text-3xl mb-4 transform transition-transform duration-300 group-hover:scale-110">{feature.icon}</div>
                            <h3 className="text-white text-lg font-semibold m-0 mb-2 transition-colors duration-300 group-hover:text-primary">
                                {feature.title}
                            </h3>
                            <p className="text-text-secondary text-sm m-0 leading-relaxed transition-colors duration-300 group-hover:text-white/80">
                                {feature.description}
                            </p>
                        </li>
                    ))}
                </ul>

                {/* Login button */}
                <button 
                    onClick={handleLogin}
                    className="bg-primary text-white px-10 py-4 rounded-full text-lg font-semibold
                             cursor-pointer transition-all duration-normal inline-flex items-center
                             gap-3 hover:bg-primary-light hover:-translate-y-1
                             hover:shadow-[0_8px_32px_rgba(29,185,84,0.4)]
                             active:translate-y-0 active:shadow-[0_2px_8px_rgba(29,185,84,0.3)]
                             before:content-['🎵'] before:transition-transform before:duration-300
                             hover:before:rotate-[360deg] before:inline-block
                             md:w-auto w-full justify-center
                             animate-[fadeInUp_0.6s_ease-out]"
                >
                    Connect with Spotify
                </button>
            </div>
        </div>
    );
};

export default Login;