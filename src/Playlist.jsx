import React, { useState, useRef, useEffect } from 'react';
import { useToast } from './contexts/ToastContext';
import SpotifyAPI from './api/SpotifyAPI';

const VinylIcon = () => (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"
         style={{ animation: 'vinyl 4s linear infinite' }}>
        <circle cx="28" cy="28" r="27" stroke="rgba(255,255,255,0.08)" strokeWidth="2" fill="rgba(255,255,255,0.03)" />
        <circle cx="28" cy="28" r="18" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" fill="rgba(255,255,255,0.02)" />
        <circle cx="28" cy="28" r="10" stroke="rgba(29,185,84,0.15)" strokeWidth="1" fill="rgba(29,185,84,0.04)" />
        <circle cx="28" cy="28" r="3.5" fill="rgba(29,185,84,0.4)" />
        <circle cx="28" cy="28" r="1.5" fill="rgba(29,185,84,0.8)" />
    </svg>
);

const Playlist = ({ tracks, onRemoveTrack, name, onNameChange, onClearPlaylist }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(name);
    const [isSaving, setIsSaving] = useState(false);
    const inputRef = useRef(null);
    const { showToast } = useToast();

    const handleSavePlaylist = async () => {
        if (tracks.length === 0) {
            showToast('Cannot save empty playlist', 'error');
            return;
        }
        try {
            setIsSaving(true);
            await SpotifyAPI.createPlaylist(name, tracks);
            showToast('Playlist saved to Spotify successfully. Check your library!', 'success');
        } catch (error) {
            console.error('Error saving playlist:', error);
            showToast('Failed to save playlist: ' + error.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleClearPlaylist = () => {
        if (window.confirm('Are you sure you want to clear the playlist?')) {
            onClearPlaylist();
        }
    };

    const handleNameClick = () => {
        setIsEditing(true);
        setEditValue(name);
    };

    const handleNameChange = (e) => setEditValue(e.target.value);

    const handleNameSubmit = () => {
        const newName = editValue.trim();
        if (newName && newName !== name) onNameChange(newName);
        setIsEditing(false);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleNameSubmit();
        else if (e.key === 'Escape') { setIsEditing(false); setEditValue(name); }
    };

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    return (
        <div className="p-6 rounded-xl bg-white/[0.03] border border-white/5 h-full flex flex-col
                      transition-all duration-300 hover:bg-white/[0.04] hover:border-white/8
                      backdrop-blur-sm">
            {/* Panel header */}
            <div className="mb-5">
                <p className="m-0 mb-2 text-primary"
                   style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase' }}>
                    Your Mix
                </p>

                {isEditing ? (
                    <input
                        ref={inputRef}
                        className="text-xl font-semibold text-white bg-transparent border-b-2 border-primary
                                  w-full outline-none transition-all duration-200 py-1 px-0 mb-3
                                  placeholder:text-white/30"
                        style={{ fontFamily: 'Syne, sans-serif' }}
                        value={editValue}
                        onChange={handleNameChange}
                        onBlur={handleNameSubmit}
                        onKeyDown={handleKeyPress}
                        maxLength={50}
                    />
                ) : (
                    <h2
                        className="text-xl font-semibold text-white m-0 mb-3 cursor-pointer
                                  transition-colors duration-200 hover:text-primary inline-block border-b border-transparent hover:border-white/20 pb-1"
                        style={{ fontFamily: 'Syne, sans-serif' }}
                        onClick={handleNameClick}
                        title="Click to edit playlist name"
                    >
                        {name}
                    </h2>
                )}

                <div className="h-px bg-white/8" />
            </div>

            {/* Track list */}
            <div className="flex-grow overflow-y-auto min-h-[200px]">
                {tracks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[200px] text-white/30 text-center p-8">
                        <div className="mb-5 opacity-50">
                            <VinylIcon />
                        </div>
                        <p className="m-0 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>Add songs to begin</p>
                    </div>
                ) : (
                    <ul className="list-none p-0 m-0">
                        {tracks.map((track, index) => (
                            <li key={track.id}
                                className="py-3 px-3 rounded-lg mb-1.5 bg-transparent transition-all duration-300
                                          flex items-center gap-3 hover:bg-white/[0.05] hover:translate-x-0.5 group cursor-pointer border border-transparent hover:border-white/5">
                                <span className="text-primary flex-shrink-0 w-6 text-right"
                                      style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                                    {String(index + 1).padStart(2, '0')}
                                </span>
                                <div className="flex-grow text-left min-w-0">
                                    <h3 className="font-semibold text-white m-0 text-sm truncate transition-colors duration-300
                                               group-hover:text-primary"
                                        style={{ fontFamily: 'Syne, sans-serif' }}>
                                        {track.name}
                                    </h3>
                                    <p className="text-white/40 text-[10px] mt-0.5 m-0 truncate transition-colors duration-300
                                               group-hover:text-white/60 uppercase tracking-wider"
                                       style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                        {track.artist}
                                    </p>
                                </div>
                                <button
                                    className="bg-transparent border border-white/10 text-white/30 cursor-pointer
                                              w-6 h-6 rounded-full transition-all duration-300 flex items-center
                                              justify-center opacity-0 hover:text-red-400 hover:border-red-500/40
                                              hover:bg-red-500/10 hover:rotate-45
                                              group-hover:opacity-100 md:opacity-100 flex-shrink-0 text-sm"
                                    onClick={() => onRemoveTrack(track.id)}
                                    title="Remove from playlist"
                                >
                                    ✕
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Action buttons */}
            {tracks.length > 0 && (
                <div className="mt-5 pt-4 border-t border-white/8 flex flex-col gap-2.5">
                    <button
                        className="w-full py-3.5 rounded-lg text-white text-sm font-semibold
                                   cursor-pointer transition-all duration-300 relative overflow-hidden
                                   hover:-translate-y-0.5 active:translate-y-0 group
                                   disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
                        style={{
                            fontFamily: 'Syne, sans-serif',
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            fontSize: '12px',
                            background: '#1DB954',
                        }}
                        onClick={handleSavePlaylist}
                        disabled={isSaving}
                    >
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent
                                         -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        <span className="relative">{isSaving ? 'Saving...' : 'Save to Spotify'}</span>
                    </button>
                    <button
                        className="w-full py-2.5 rounded-lg text-white/40 text-xs font-medium
                                   cursor-pointer transition-all duration-300
                                   hover:text-white/70 hover:bg-white/[0.04]
                                   border border-transparent hover:border-white/8"
                        style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.05em' }}
                        onClick={handleClearPlaylist}
                    >
                        Clear all
                    </button>
                </div>
            )}
        </div>
    );
};

export default Playlist;
