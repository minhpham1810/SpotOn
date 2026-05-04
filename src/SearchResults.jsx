import React from 'react';
import Track from './Track';

const SoundbarsIcon = () => (
    <div className="flex items-end gap-1 h-10">
        {[1, 1.8, 1.3, 2, 1.5].map((delay, i) => (
            <div
                key={i}
                className="w-1.5 bg-primary/40 rounded-full"
                style={{
                    height: '100%',
                    animation: `soundbar ${delay}s ease-in-out infinite`,
                    animationDelay: `${i * 0.15}s`,
                    transformOrigin: 'bottom',
                }}
            />
        ))}
    </div>
);

const SearchResults = ({ searchResults, onAddTrack, isLoading }) => {
    return (
        <div className="p-6 rounded-xl bg-white/[0.03] border border-white/5 h-full flex flex-col
                      transition-all duration-300 hover:bg-white/[0.04] hover:border-white/8
                      backdrop-blur-sm">
            <div className="mb-5">
                <p className="m-0 mb-2 text-primary"
                   style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase' }}>
                    Discover
                </p>
                <h2 className="text-xl font-semibold text-white m-0 mb-3"
                    style={{ fontFamily: 'Syne, sans-serif' }}>
                    Search Results
                </h2>
                <div className="h-px bg-white/8" />
            </div>

            <div className="flex-grow overflow-y-auto min-h-[200px]">
                {isLoading ? (
                    <div className="flex justify-center items-center h-[200px]">
                        <div className="w-8 h-8 border-2 border-white/10 border-t-primary rounded-full animate-spin" />
                    </div>
                ) : searchResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[200px] text-white/30 text-center p-8 gap-4">
                        <SoundbarsIcon />
                        <p className="m-0 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                            Search for a song to begin
                        </p>
                    </div>
                ) : (
                    <ul className="list-none p-0 m-0">
                        {searchResults.map((track) => (
                            <li key={track.id}>
                                <Track
                                    track={track}
                                    onAdd={onAddTrack}
                                    isInPlaylist={false}
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default SearchResults;
