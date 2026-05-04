import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './contexts/ToastContext';

const Track = ({ track, onAdd, onRemove, isInPlaylist = false }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasAudioSupport, setHasAudioSupport] = useState(true);
    const audioRef = useRef(null);
    const navigate = useNavigate();
    const { showToast } = useToast();

    useEffect(() => {
        setHasAudioSupport(typeof Audio !== 'undefined');
    }, []);

    useEffect(() => {
        if (!track.preview_url || !hasAudioSupport) return;

        const handleEnded = () => setIsPlaying(false);
        const handleError = () => {
            setIsPlaying(false);
            setIsLoading(false);
            showToast('Failed to load audio preview', 'error');
        };

        const audio = new Audio(track.preview_url);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);
        audioRef.current = audio;

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.removeEventListener('ended', handleEnded);
                audioRef.current.removeEventListener('error', handleError);
                audioRef.current = null;
            }
        };
    }, [track.preview_url, hasAudioSupport, showToast]);

    const handlePlayPause = async (e) => {
        e.stopPropagation();

        if (!track.preview_url) {
            showToast('No preview available for this song', 'error');
            return;
        }

        try {
            setIsLoading(true);
            document.querySelectorAll('audio').forEach(audio => {
                if (audio !== audioRef.current) {
                    audio.pause();
                }
            });

            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                await audioRef.current.play();
                setIsPlaying(true);
            }
        } catch (error) {
            console.error('Playback error:', error);
            showToast('Failed to play preview', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTrackClick = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
        navigate(`/song/${track.id}`);
    };

    const handleAction = (e) => {
        e.stopPropagation();
        if (isInPlaylist) {
            onRemove(track.id);
        } else {
            onAdd(track);
        }
    };

    const baseButtonClasses = `
        w-8 h-8 md:w-7 md:h-7 rounded-full flex items-center justify-center
        cursor-pointer transition-all duration-200 text-lg md:text-base
        border border-white/20 text-white disabled:opacity-50 disabled:cursor-wait
        enabled:hover:scale-110 enabled:hover:shadow-lg enabled:hover:shadow-white/10
        enabled:active:scale-95 enabled:active:shadow-md
        backdrop-blur-sm bg-black/20
    `;

    return (
        <div
            onClick={handleTrackClick}
            className="p-3 rounded-lg bg-white/[0.04] mb-2.5 flex items-center gap-4
                     transition-all duration-300 cursor-pointer relative overflow-hidden
                     hover:-translate-y-0.5 hover:bg-white/[0.07]
                     hover:shadow-[0_6px_20px_rgba(0,0,0,0.3)]
                     animate-fadeIn active:translate-y-0
                     before:content-[''] before:absolute before:inset-0
                     before:bg-gradient-to-r before:from-transparent before:to-primary/8
                     before:opacity-0 before:transition-all before:duration-300
                     hover:before:opacity-100
                     group"
        >
            {/* Album art with ambient glow */}
            <div className="relative flex-shrink-0">
                <img
                    src={track.cover}
                    alt={`${track.name} cover`}
                    className="w-16 h-16 rounded-md object-cover
                              shadow-lg transition-all duration-300
                              group-hover:scale-105 relative z-10"
                />
                <div className="absolute inset-0 rounded-md bg-primary/0 group-hover:bg-primary/10
                               blur-md scale-110 transition-all duration-300 group-hover:blur-lg" />
            </div>

            <div className="flex-grow text-left flex flex-col gap-0.5 min-w-0">
                <h3 className="m-0 text-white font-semibold text-sm transition-colors duration-300
                              group-hover:text-primary truncate"
                    style={{ fontFamily: 'Syne, sans-serif' }}>
                    {track.name}
                </h3>
                <p className="m-0 text-white/40 transition-colors duration-300
                              group-hover:text-white/60 truncate"
                   style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    {track.artist}
                </p>
                {!track.preview_url && (
                    <span className="inline-block text-[10px] text-white/30 italic mt-0.5">
                        No preview
                    </span>
                )}
            </div>

            <div className="flex gap-2 flex-shrink-0 opacity-0 translate-x-2 transition-all duration-300
                          group-hover:opacity-100 group-hover:translate-x-0 md:opacity-100 md:translate-x-0">
                {track.preview_url && hasAudioSupport && (
                    <button
                        className={`${baseButtonClasses} bg-primary/10 border-primary/50
                                   enabled:hover:bg-primary enabled:hover:border-primary`}
                        onClick={handlePlayPause}
                        disabled={isLoading}
                        title={isPlaying ? 'Pause preview' : 'Play preview'}
                    >
                        {isLoading ? '⌛' : isPlaying ? '⏸' : '▶'}
                    </button>
                )}
                <button
                    className={`${baseButtonClasses} text-base
                              ${isInPlaylist
                                ? 'border-white/20 enabled:hover:bg-red-500/80 enabled:hover:border-red-500 enabled:hover:rotate-45'
                                : 'border-white/20 enabled:hover:bg-primary/80 enabled:hover:border-primary'}`}
                    onClick={handleAction}
                    title={isInPlaylist ? 'Remove from playlist' : 'Add to playlist'}
                >
                    {isInPlaylist ? '−' : '+'}
                </button>
            </div>
        </div>
    );
};

export default Track;