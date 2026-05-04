import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from './contexts/ToastContext';
import LoadingSpinner from './LoadingSpinner';
import SpotifyAPI from './api/SpotifyAPI';
import GeminiAPI from './api/GeminiAPI';

const SongDetails = ({ onAddToPlaylist }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [song, setSong] = useState(null);
    const [songInfo, setSongInfo] = useState(null);
    const [isLoadingInfo, setIsLoadingInfo] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSongDetails = async () => {
            try {
                const data = await SpotifyAPI.getTrackDetails(id);
                setSong(data);
                
                // Generate song info
                setIsLoadingInfo(true);
                try {
                    const info = await GeminiAPI.generateSongInfo(data);
                    setSongInfo(info);
                } catch (error) {
                    console.error('Error generating song info:', error);
                    showToast('Unable to load song details at this time', 'error');
                } finally {
                    setIsLoadingInfo(false);
                }
            } catch (error) {
                console.error('Error fetching song details:', error);
                setError('Failed to load song details');
                showToast('Failed to load song details', 'error');
            }
        };

        fetchSongDetails();
    }, [id, showToast]);

    const handleSaveToPlaylist = () => {
        try {
            onAddToPlaylist(song);
            //showToast(`Added "${song.name}" to playlist`, 'success');
        } catch (error) {
            showToast('Failed to add song to playlist', 'error');
        }
    };

    if (error) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-500 mb-4">{error}</p>
                <button
                    onClick={() => navigate('/')}
                    className="px-4 py-2 bg-spotify-green text-white rounded-full hover:bg-spotify-green-light transition-all duration-300"
                >
                    Back to Homepage
                </button>
            </div>
        );
    }

    if (!song) {
        return <div className="p-8 text-center text-white/70">Loading...</div>;
    }

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="max-w-[1200px] mx-auto p-6 md:p-8 min-h-screen flex flex-col">
            {/* Back button */}
            <button
                className="text-white/40 text-sm cursor-pointer transition-all duration-300 mb-8 flex items-center
                          gap-2 w-fit hover:text-white group"
                style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.05em' }}
                onClick={() => navigate('/')}
            >
                <span className="transition-transform duration-300 group-hover:-translate-x-1">←</span>
                <span>Back</span>
            </button>

            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8 mb-8 animate-fadeIn">
                {/* Left column: Hero */}
                <div className="flex flex-col gap-6 md:items-start items-center">
                    {/* Album art with ambient glow */}
                    <div className="relative w-full max-w-[280px] md:max-w-none">
                        <img
                            className="w-full aspect-square rounded-lg object-cover shadow-2xl relative z-10"
                            src={song.cover}
                            alt={song.name}
                        />
                        {/* Ambient glow — blurred duplicate */}
                        <img
                            className="absolute inset-0 w-full h-full object-cover rounded-lg blur-3xl opacity-25 scale-110 -z-0"
                            src={song.cover}
                            alt=""
                            aria-hidden="true"
                        />
                    </div>

                    {/* Song info card */}
                    <div className="w-full text-left">
                        <h2 className="text-2xl font-bold text-white m-0 mb-1 leading-tight"
                            style={{ fontFamily: 'Syne, sans-serif' }}>
                            {song.name}
                        </h2>
                        <p className="m-0 mb-4 text-white/40"
                           style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                            {song.artist}
                        </p>
                        <div className="space-y-1.5 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                            <p className="text-white/50 m-0">
                                <span className="text-white/20 text-[10px] uppercase tracking-widest mr-2">Album</span>
                                {song.album}
                            </p>
                            <p className="text-white/50 m-0">
                                <span className="text-white/20 text-[10px] uppercase tracking-widest mr-2">Released</span>
                                {formatDate(song.releaseDate)}
                            </p>
                        </div>
                    </div>

                    {/* Add to Playlist button */}
                    <button
                        className="w-full py-3.5 rounded-lg text-white text-sm font-semibold
                                  cursor-pointer transition-all duration-300 relative overflow-hidden
                                  hover:-translate-y-0.5 active:translate-y-0 group"
                        style={{
                            fontFamily: 'Syne, sans-serif',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            fontSize: '12px',
                            background: '#1DB954',
                        }}
                        onClick={handleSaveToPlaylist}
                    >
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent
                                         -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        <span className="relative">+ Add to Playlist</span>
                    </button>
                </div>

                {/* Right column: AI Insights */}
                <div className="overflow-y-auto pr-1 flex flex-col gap-5">
                    {isLoadingInfo ? (
                        <div className="my-4 flex flex-col items-center gap-4 animate-fadeIn py-12">
                            <LoadingSpinner size="small" />
                            <p className="text-white/40 text-sm italic animate-pulse"
                               style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                Gathering song info...
                            </p>
                        </div>
                    ) : songInfo ? (
                        <div className="space-y-5">
                            {/* Section helper */}
                            {[
                                {
                                    label: 'About this Song',
                                    content: <p className="text-white/75 leading-relaxed text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>{songInfo.summary}</p>
                                },
                                songInfo.musicalAnalysis && {
                                    label: 'Musical Elements',
                                    content: (
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>Mood</p>
                                                <p className="text-white/75 text-sm leading-relaxed" style={{ fontFamily: 'DM Sans, sans-serif' }}>{songInfo.musicalAnalysis.mood}</p>
                                            </div>
                                            <div>
                                                <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>Key Elements</p>
                                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                                    {songInfo.musicalAnalysis.keyElements.map((el, i) => (
                                                        <li key={i} className="flex items-start gap-2 text-white/70 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                                            <span className="text-primary mt-1 flex-shrink-0">·</span>{el}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>Soundscape</p>
                                                <p className="text-white/75 text-sm leading-relaxed" style={{ fontFamily: 'DM Sans, sans-serif' }}>{songInfo.musicalAnalysis.soundscape}</p>
                                            </div>
                                        </div>
                                    )
                                },
                                songInfo.culturalContext && {
                                    label: 'Cultural Impact',
                                    content: (
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>Era</p>
                                                <p className="text-white/75 text-sm leading-relaxed" style={{ fontFamily: 'DM Sans, sans-serif' }}>{songInfo.culturalContext.era}</p>
                                            </div>
                                            <div>
                                                <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>Influence</p>
                                                <p className="text-white/75 text-sm leading-relaxed" style={{ fontFamily: 'DM Sans, sans-serif' }}>{songInfo.culturalContext.influence}</p>
                                            </div>
                                            {songInfo.culturalContext.connections?.length > 0 && (
                                                <div>
                                                    <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>Similar Artists</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {songInfo.culturalContext.connections.map((c, i) => (
                                                            <span key={i} className="text-xs px-3 py-1 rounded-full border border-white/10 text-white/60"
                                                                  style={{ fontFamily: 'DM Sans, sans-serif' }}>{c}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                },
                                {
                                    label: 'Song Credits',
                                    content: (
                                        <div className="space-y-4">
                                            {Array.isArray(songInfo.genre) && songInfo.genre.length > 0 && (
                                                <div>
                                                    <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>Genre</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {songInfo.genre.map((g, i) => (
                                                            <span key={i} className="text-xs px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary"
                                                                  style={{ fontFamily: 'DM Sans, sans-serif' }}>{g}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {songInfo.credits?.map((credit, i) => (
                                                <div key={i} className="flex flex-col gap-0.5">
                                                    <p className="text-white font-medium text-sm m-0" style={{ fontFamily: 'DM Sans, sans-serif' }}>{credit.name}</p>
                                                    <p className="text-primary/80 text-xs m-0" style={{ fontFamily: 'DM Sans, sans-serif' }}>{credit.role}</p>
                                                    {credit.knownFor && (
                                                        <p className="text-white/40 text-xs m-0 mt-0.5 pl-2 border-l border-primary/20 italic" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                                            {credit.knownFor}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )
                                },
                                songInfo.highlights?.length > 0 && {
                                    label: 'Key Highlights',
                                    content: (
                                        <div className="space-y-3">
                                            {songInfo.highlights.map((h, i) => (
                                                <div key={i} className="flex items-start gap-3">
                                                    <span className="text-primary text-xs font-semibold w-5 flex-shrink-0 mt-0.5"
                                                          style={{ fontFamily: 'DM Sans, sans-serif', fontVariantNumeric: 'tabular-nums' }}>
                                                        {String(i + 1).padStart(2, '0')}
                                                    </span>
                                                    <p className="text-white/75 text-sm leading-relaxed flex-1 m-0" style={{ fontFamily: 'DM Sans, sans-serif' }}>{h}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                }
                            ].filter(Boolean).map((section, i) => (
                                <div key={i} className="border-l-2 border-primary/30 pl-5 py-1 transition-all duration-300 hover:border-primary/60">
                                    <p className="text-primary m-0 mb-3"
                                       style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                                        {section.label}
                                    </p>
                                    {section.content}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="border-l-2 border-white/10 pl-5 py-1">
                            <p className="text-white/30 m-0 mb-2"
                               style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                                Info
                            </p>
                            <p className="text-white/60 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                Additional song information is currently unavailable.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SongDetails;