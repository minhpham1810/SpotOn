import React, { useState, useRef, useEffect } from 'react';
import { useToast } from './contexts/ToastContext';
import SpotifyAPI from './api/SpotifyAPI';

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

    const handleNameChange = (e) => {
        setEditValue(e.target.value);
    };

    const handleNameSubmit = () => {
        const newName = editValue.trim();
        if (newName && newName !== name) {
            onNameChange(newName);
        }
        setIsEditing(false);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleNameSubmit();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setEditValue(name);
        }
    };

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    return (
        <div className="p-6 rounded-xl bg-white/[0.03] border border-white/5 h-full flex flex-col
                      transition-all duration-300 hover:bg-white/[0.04] hover:border-white/10
                      backdrop-blur-sm">
            <div className="mb-6 pb-4 border-b border-white/10 flex justify-between items-center md:flex-row md:gap-0 flex-col gap-4">
                {isEditing ? (
                    <input
                        ref={inputRef}
                        className="text-2xl font-semibold text-white bg-white/10 border-none rounded-lg
                                  py-2 px-4 w-full max-w-[300px] outline-none transition-all duration-200
                                  focus:bg-white/15 focus:shadow-[0_0_0_2px_rgba(29,185,84,0.5)]
                                  md:text-left text-center backdrop-blur-sm
                                  placeholder:text-white/30"
                        value={editValue}
                        onChange={handleNameChange}
                        onBlur={handleNameSubmit}
                        onKeyDown={handleKeyPress}
                        maxLength={50}
                    />
                ) : (
                    <h2 
                        className="text-2xl font-semibold text-white m-0 flex items-center gap-2 cursor-pointer
                                  transition-all duration-200 hover:text-primary group
                                  before:content-['📝'] before:text-[1.4rem] before:transition-transform
                                  before:duration-300 hover:before:rotate-[-10deg]
                                  md:text-left text-center justify-center md:justify-start"
                        onClick={handleNameClick}
                        title="Click to edit playlist name"
                    >
                        {name}
                    </h2>
                )}
                <div className="flex gap-4 md:w-auto w-full justify-center">
                    {tracks.length > 0 && (
                        <>
                            <button
                                className={`px-5 py-2.5 rounded-full text-sm font-medium border-2 text-white
                                           flex items-center gap-2 cursor-pointer transition-all duration-300
                                           hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20
                                           active:translate-y-0 active:shadow-md
                                           bg-primary border-primary hover:bg-primary-light disabled:bg-primary/50
                                           disabled:border-primary/50 disabled:cursor-not-allowed disabled:transform-none
                                           md:flex-initial flex-1 justify-center`}
                                onClick={handleSavePlaylist}
                                disabled={isSaving}
                                title="Save to Spotify"
                            >
                                {isSaving ? 'Saving...' : 'Save to Spotify'}
                            </button>
                            <button 
                                className="px-5 py-2.5 rounded-full text-sm font-medium border-2 border-white/20
                                          text-white flex items-center gap-2 cursor-pointer transition-all
                                          duration-300 hover:-translate-y-1 hover:shadow-lg hover:bg-white/10
                                          hover:border-white/30 active:translate-y-0 active:shadow-md
                                          md:flex-initial flex-1 justify-center backdrop-blur-sm
                                          before:content-['🗑'] before:text-sm before:transition-transform
                                          before:duration-300 hover:before:rotate-12"
                                onClick={handleClearPlaylist}
                                title="Clear playlist"
                            >
                                Clear All
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="flex-grow overflow-y-auto min-h-[200px]">
                {tracks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[200px] text-white/50 text-center p-8
                                  transition-all duration-300 rounded-xl hover:bg-white/[0.02]">
                        <span className="text-6xl mb-6 opacity-70 animate-bounce">🎵</span>
                        <p className="m-2 text-lg font-medium">Your playlist is empty</p>
                        <p className="text-base text-white/40">Search for songs and add them to your playlist</p>
                    </div>
                ) : (
                    <ul className="list-none p-0 m-0">
                        {tracks.map((track) => (
                            <li key={track.id} 
                                className="p-4 rounded-lg mb-2.5 bg-white/5 transition-all duration-300
                                          flex items-center gap-4 hover:bg-white/[0.08] hover:translate-x-1
                                          hover:shadow-lg hover:shadow-black/5 group cursor-pointer">
                                <div className="flex-grow text-left">
                                    <h3 className="font-semibold text-white m-0 transition-colors duration-300
                                               group-hover:text-primary">{track.name}</h3>
                                    <p className="text-white/70 text-sm mt-1 m-0 transition-colors duration-300
                                               group-hover:text-white/90">
                                        {track.artist} • {track.album}
                                    </p>
                                </div>
                                <button
                                    className="bg-transparent border-2 border-white/10 text-white/50 cursor-pointer
                                              p-2.5 rounded-full transition-all duration-300 flex items-center
                                              justify-center opacity-0 hover:text-red-500 hover:border-red-500/50
                                              hover:bg-red-500/10 hover:scale-110 hover:rotate-90
                                              group-hover:opacity-100 md:opacity-100 backdrop-blur-sm"
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
        </div>
    );
};

export default Playlist;