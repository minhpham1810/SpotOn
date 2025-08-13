// Tracklist.jsx
import React from 'react';
import Track from './Track';

const Tracklist = ({ tracks, onRemoveTrack, isPlaylist = false }) => {
    return (
        <div className="flex flex-col gap-3 animate-[fadeIn_0.3s_ease-out]">
            {tracks.map(track => (
                <Track
                    key={track.id}
                    track={track}
                    onRemoveTrack={onRemoveTrack}
                    isPlaylist={isPlaylist}
                />
            ))}
            {tracks.length === 0 && (
                <div className="text-center py-8 px-4 bg-white/[0.02] rounded-xl border border-white/5
                             transition-all duration-300 hover:bg-white/[0.04] hover:border-white/10">
                    <div className="text-4xl mb-4 opacity-60 animate-bounce">
                        {isPlaylist ? '📝' : '🔍'}
                    </div>
                    <p className="text-white/70 text-lg font-medium mb-2">
                    {isPlaylist
                        ? "No songs in playlist yet. Add songs from search results!"
                        : "No songs found. Try searching for something else!"}
                    </p>
                    <p className="text-white/40 text-sm">
                        {isPlaylist
                            ? "Start building your perfect playlist!"
                            : "Try different keywords or artists"}
                    </p>
                </div>
            )}
        </div>
    );
};

export default Tracklist;