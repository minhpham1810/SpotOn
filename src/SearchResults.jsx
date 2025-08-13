import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './contexts/ToastContext';

const SearchResults = ({ searchResults, onAddTrack, isLoading }) => {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const handleTrackClick = (trackId) => {
        navigate(`/song/${trackId}`);
    };

    const handleAddTrack = (e, track) => {
        e.stopPropagation(); // Prevent navigation when clicking add button
        try {
            onAddTrack(track);
        } catch (error) {
            showToast('Failed to add song to playlist', 'error');
        }
    };

    if (isLoading) {
        return (
            <div className="p-6 rounded-xl bg-white/[0.03] border border-white/5 h-full flex flex-col">
                <div className="mb-6 pb-4 border-b border-white/10">
                    <h2 className="text-2xl font-semibold text-white m-0 flex items-center gap-2 before:content-['🔍'] before:text-[1.4rem]">
                        Search Results
                    </h2>
                </div>
                <div className="flex justify-center items-center h-[200px]">
                    <div className="w-10 h-10 border-3 border-white/10 border-t-primary rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 rounded-xl bg-white/[0.03] border border-white/5 h-full flex flex-col">
            <div className="mb-6 pb-4 border-b border-white/10">
                <h2 className="text-2xl font-semibold text-white m-0 flex items-center gap-2 before:content-['🔍'] before:text-[1.4rem]">
                    Search Results
                </h2>
            </div>
            <div className="flex-grow overflow-y-auto min-h-[200px] scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/20 hover:scrollbar-thumb-white/30">
                {searchResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[200px] text-white/50 text-center p-8">
                        <span className="text-5xl mb-4 opacity-70">🎵</span>
                        <p className="my-4 text-lg">No songs found</p>
                        <p className="text-lg">Try searching for a song, artist, or album</p>
                    </div>
                ) : (
                    <ul className="list-none p-0 m-0">
                        {searchResults.map((track) => (
                            <li 
                                key={track.id} 
                                className="p-4 rounded-lg mb-3 bg-white/5 transition-all duration-300 cursor-pointer 
                                         hover:bg-white/[0.08] hover:-translate-y-0.5 hover:shadow-lg
                                         flex items-center gap-4 md:p-3"
                                onClick={() => handleTrackClick(track.id)}
                            >
                                <img 
                                    src={track.cover} 
                                    alt={`${track.name} cover`} 
                                    className="w-[50px] h-[50px] rounded md:w-10 md:h-10 object-cover"
                                />
                                <div className="flex-grow text-left">
                                    <h3 className="font-semibold text-white m-0">{track.name}</h3>
                                    <p className="text-white/70 text-sm mt-0.5 m-0">
                                        {track.artist} • {track.album}
                                    </p>
                                </div>
                                <button
                                    className="bg-transparent border border-white/20 text-white p-2 rounded-full cursor-pointer 
                                             transition-all duration-200 w-8 h-8 flex items-center justify-center opacity-0 
                                             hover:bg-primary hover:border-primary hover:scale-110 group-hover:opacity-100
                                             md:opacity-100"
                                    onClick={(e) => handleAddTrack(e, track)}
                                    title="Add to playlist"
                                >
                                    +
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default SearchResults;