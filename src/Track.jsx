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
            className="p-4 md:p-3 rounded-lg bg-white/5 mb-3 flex items-center gap-4
                     transition-all duration-300 cursor-pointer relative overflow-hidden
                     hover:-translate-y-1 hover:bg-white/[0.08]
                     hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]
                     animate-fadeIn
                     before:content-[''] before:absolute before:inset-0
                     before:bg-gradient-to-r before:from-transparent before:to-primary/10
                     before:opacity-0 before:transition-all before:duration-300
                     hover:before:opacity-100 active:translate-y-0
                     after:absolute after:inset-0 after:bg-shimmer after:animate-shimmer
                     after:opacity-0 hover:after:opacity-20
                     group backdrop-blur-[2px]"
        >
            <img 
                src={track.cover} 
                alt={`${track.name} cover`} 
                className="w-[50px] h-[50px] md:w-10 md:h-10 rounded-lg object-cover
                          shadow-lg transition-all duration-300 group-hover:scale-105
                          group-hover:shadow-xl group-hover:shadow-primary/10
                          group-hover:rotate-2 relative z-10
                          animate-fadeIn [animation-delay:200ms]"
            />
            <div className="flex-grow text-left flex flex-col gap-0.5">
                <h3 className="m-0 text-white text-lg font-semibold transition-all duration-300
                              group-hover:text-primary group-hover:translate-x-1">
                    {track.name}
                </h3>
                <p className="m-0 text-white/70 text-sm transition-all duration-300
                              group-hover:text-white/90 group-hover:translate-x-1">
                    {track.artist} • {track.album}
                </p>
                {!track.preview_url && (
                    <span className="inline-block text-xs text-white/50 italic bg-white/5 
                                   px-2 py-0.5 rounded mt-0.5 md:text-[0.75rem] md:px-1.5 md:py-0.5">
                        No preview available
                    </span>
                )}
            </div>
            <div className="flex gap-2 opacity-0 translate-x-2.5 transition-all duration-300 
                          group-hover:opacity-100 group-hover:translate-x-0 md:opacity-100 md:translate-x-0">
                {track.preview_url && hasAudioSupport && (
                    <button
                        className={`${baseButtonClasses} bg-primary/10 border-primary/60
                                   enabled:hover:bg-primary enabled:hover:border-primary
                                   enabled:hover:text-white/90 relative
                                   before:content-[''] before:w-3.5 before:h-3.5
                                   before:border-2 before:border-white/20 before:border-t-white
                                   before:rounded-full before:animate-spin disabled:before:block
                                   group-hover:enabled:translate-x-0.5
                                   after:absolute after:inset-0 after:bg-shimmer
                                   after:animate-shimmer after:opacity-0
                                   enabled:hover:after:opacity-30`}
                        onClick={handlePlayPause}
                        disabled={isLoading}
                        title={isPlaying ? 'Pause preview' : 'Play preview'}
                    >
                        {isLoading ? '⌛' : isPlaying ? '⏸' : '▶'}
                    </button>
                )}
                <button
                    className={`${baseButtonClasses} 
                              ${isInPlaylist
                                ? 'enabled:hover:bg-red-500/90 enabled:hover:border-red-500 enabled:hover:rotate-90'
                                : 'enabled:hover:bg-primary/90 enabled:hover:border-primary enabled:hover:-rotate-12'}
                              relative after:absolute after:inset-0 after:bg-shimmer
                              after:animate-shimmer after:opacity-0 enabled:hover:after:opacity-30`}
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