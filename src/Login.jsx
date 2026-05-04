import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SpotifyAPI from './api/SpotifyAPI';

const DESCRIPTORS = [
    'Search millions of songs from Spotify',
    'Get AI-powered insights on every track',
    'Build and save playlists in seconds',
];

const COLOR_BLOCKS = [
    { color: '#1DB954', size: 180, top: '5%', left: '8%', delay: '0s', dur: '7s' },
    { color: '#6B21A8', size: 140, top: '20%', left: '55%', delay: '1.2s', dur: '9s' },
    { color: '#BE185D', size: 160, top: '55%', left: '15%', delay: '2.1s', dur: '8s' },
    { color: '#0284C7', size: 120, top: '70%', left: '60%', delay: '0.5s', dur: '11s' },
    { color: '#D97706', size: 100, top: '40%', left: '30%', delay: '3s', dur: '6s' },
    { color: '#1DB954', size: 90, top: '80%', left: '40%', delay: '1.8s', dur: '10s' },
    { color: '#7C3AED', size: 200, top: '-5%', left: '70%', delay: '0.9s', dur: '13s' },
    { color: '#DC2626', size: 80, top: '45%', left: '78%', delay: '2.5s', dur: '8s' },
];

const Login = () => {
    const navigate = useNavigate();

    useEffect(() => {
        try { SpotifyAPI.init(); } catch (e) { console.error("Failed to initialize Spotify API", e); }
        if (SpotifyAPI.isAuthenticated()) navigate('/', { replace: true });
    }, [navigate]);

    const handleLogin = async (event) => {
        event.preventDefault();
        try {
            const loginUrl = await SpotifyAPI.getLoginUrl();
            window.location.href = loginUrl;
        } catch (error) {
            console.error('Failed to generate login URL:', error);
        }
    };

    return (
        <div className="min-h-screen flex overflow-hidden" style={{ background: '#0D0C0E' }}>
            {/* Left panel — atmospheric visual */}
            <div className="hidden md:flex flex-[0_0_60%] relative overflow-hidden">
                {/* Blurred color blobs */}
                {COLOR_BLOCKS.map((block, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full"
                        style={{
                            width: block.size,
                            height: block.size,
                            background: block.color,
                            top: block.top,
                            left: block.left,
                            filter: 'blur(80px)',
                            opacity: 0.35,
                            animation: `drift ${block.dur} ease-in-out infinite`,
                            animationDelay: block.delay,
                        }}
                    />
                ))}

                {/* Dark overlay so blobs don't overwhelm */}
                <div className="absolute inset-0" style={{ background: 'rgba(13, 12, 14, 0.55)' }} />

                {/* Attribution */}
                <div
                    className="absolute bottom-8 left-8 text-white/30 text-xs"
                    style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.1em' }}
                >
                    Made by Minh Pham
                </div>

                {/* Large wordmark watermark */}
                <div
                    className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
                    style={{
                        fontFamily: 'Syne, sans-serif',
                        fontSize: 'clamp(80px, 15vw, 160px)',
                        fontWeight: 800,
                        color: 'rgba(255,255,255,0.04)',
                        letterSpacing: '-0.02em',
                        lineHeight: 1,
                    }}
                >
                    SPOT<br />ON
                </div>
            </div>

            {/* Right panel — login form */}
            <div className="flex-1 flex flex-col justify-center px-10 md:px-16 relative z-10">
                {/* Mobile watermark blobs */}
                <div className="md:hidden absolute inset-0 overflow-hidden pointer-events-none">
                    {COLOR_BLOCKS.slice(0, 3).map((block, i) => (
                        <div
                            key={i}
                            className="absolute rounded-full"
                            style={{
                                width: block.size * 0.7,
                                height: block.size * 0.7,
                                background: block.color,
                                top: block.top,
                                left: block.left,
                                filter: 'blur(60px)',
                                opacity: 0.25,
                            }}
                        />
                    ))}
                </div>

                <div className="max-w-[380px] w-full animate-fadeIn">
                    {/* Wordmark */}
                    <div
                        className="mb-12 flex items-baseline gap-0"
                        style={{ fontFamily: 'Syne, sans-serif' }}
                    >
                        <span className="text-2xl font-extrabold text-white uppercase tracking-wide">Spot</span>
                        <span className="text-2xl font-extrabold text-primary uppercase tracking-wide">On</span>
                    </div>

                    {/* Headline */}
                    <h1
                        className="mb-4 text-white leading-[1.1]"
                        style={{
                            fontFamily: 'Syne, sans-serif',
                            fontSize: 'clamp(36px, 5vw, 52px)',
                            fontWeight: 700,
                            letterSpacing: '-0.02em',
                        }}
                    >
                        Your music.<br />
                        <span className="text-primary">Deeper.</span>
                    </h1>

                    {/* Descriptors */}
                    <ul className="list-none p-0 m-0 mb-10 space-y-3">
                        {DESCRIPTORS.map((desc, i) => (
                            <li
                                key={i}
                                className="flex items-center gap-3 text-white/50 text-sm"
                                style={{ fontFamily: 'DM Sans, sans-serif', animationDelay: `${i * 0.1 + 0.2}s` }}
                            >
                                <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                                {desc}
                            </li>
                        ))}
                    </ul>

                    {/* Login button */}
                    <button
                        onClick={handleLogin}
                        className="w-full py-4 px-8 rounded-full text-white font-semibold text-base
                                   cursor-pointer transition-all duration-300 relative overflow-hidden
                                   hover:-translate-y-0.5 active:translate-y-0 group"
                        style={{
                            fontFamily: 'Syne, sans-serif',
                            letterSpacing: '0.05em',
                            background: '#1DB954',
                        }}
                    >
                        {/* shimmer sweep */}
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent
                                         -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        {/* glow ring */}
                        <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100
                                         transition-opacity duration-300 shadow-[0_0_30px_rgba(29,185,84,0.5)]" />
                        <span className="relative">Connect with Spotify</span>
                    </button>

                    {/* Mobile attribution */}
                    <p
                        className="md:hidden mt-10 text-white/20 text-xs text-center"
                        style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.1em' }}
                    >
                        Made by Minh Pham
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
