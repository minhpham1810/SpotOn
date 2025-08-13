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
        <div className="max-w-[1200px] mx-auto p-8 min-h-screen flex flex-col">
            <button
                className="bg-transparent border-2 border-spotify-green text-spotify-green px-6 py-3
                          rounded-full font-semibold transition-all duration-300 mb-8 flex items-center
                          gap-2 w-fit hover:bg-spotify-green hover:text-white transform
                          hover:-translate-x-2 hover:shadow-lg hover:shadow-spotify-green/20
                          active:translate-x-0 active:shadow-md
                          before:content-['←'] before:transition-transform before:duration-300
                          hover:before:-translate-x-1 group"
                onClick={() => navigate('/')}
            >
                <span className="transition-transform duration-300 group-hover:translate-x-1">
                    Back to Homepage
                </span>
            </button>
            <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] gap-8 mb-8 animate-fadeIn h-[calc(100vh-160px)]">
                <div className="flex flex-col gap-6 md:items-start items-center">
                    <div className="relative group">
                        <img
                            className="w-full max-w-[300px] md:max-w-none aspect-square rounded-lg
                                     object-cover shadow-xl transition-all duration-300
                                     group-hover:scale-[1.02] group-hover:shadow-2xl
                                     group-hover:shadow-spotify-green/20 z-10 relative"
                            src={song.cover}
                            alt={song.name}
                        />
                        <div className="absolute inset-0 bg-spotify-green/20 rounded-lg blur-xl
                                     transition-all duration-300 opacity-0 group-hover:opacity-100
                                     transform group-hover:scale-110" />
                    </div>
                    <div className="text-white bg-white/5 rounded-xl border border-white/10 p-6 w-full
                                  transition-all duration-300 hover:bg-white/10 hover:border-white/20
                                  hover:shadow-lg hover:shadow-spotify-green/10">
                        <h2 className="text-2xl font-bold mb-4">{song.name}</h2>
                        <p className="my-2 text-lg text-white/80"><strong>Artist:</strong> {song.artist}</p>
                        <p className="my-2 text-lg text-white/80"><strong>Album:</strong> {song.album}</p>
                        <p className="my-2 text-lg text-white/80"><strong>Release Date:</strong> {formatDate(song.releaseDate)}</p>
                    </div>
                </div>
                <div className="overflow-y-auto pr-4 flex flex-col gap-6">
                    {isLoadingInfo ? (
                        <div className="my-8 p-8 bg-white/5 rounded-xl border border-white/10 flex flex-col items-center gap-4 animate-fadeIn">
                            <LoadingSpinner size="small" />
                            <p className="text-white/70 text-lg italic text-center animate-pulse">Gathering song info...</p>
                        </div>
                    ) : (
                        <>
                            {songInfo ? (
                                <div className="space-y-6">
                                    {/* About Section */}
                                    <div className="p-6 bg-white/5 rounded-xl border border-white/10
                                                  hover:bg-white/10 hover:border-spotify-green/30
                                                  hover:shadow-lg hover:shadow-spotify-green/10
                                                  transition-all duration-300 group">
                                        <h3 className="text-spotify-green text-xl mb-4 flex items-center gap-2
                                                     before:content-['✨'] before:transition-transform
                                                     before:duration-300 group-hover:before:rotate-[15deg]">
                                            About this Song
                                        </h3>
                                        <p className="text-white/90 leading-relaxed">{songInfo.summary}</p>
                                    </div>

                                    {/* Musical Analysis */}
                                    {songInfo.musicalAnalysis && (
                                        <div className="p-6 bg-white/5 rounded-xl border border-white/10
                                                      hover:bg-white/10 hover:border-spotify-green/30
                                                      hover:shadow-lg hover:shadow-spotify-green/10
                                                      transition-all duration-300 group animate-fadeIn">
                                            <h3 className="text-spotify-green text-xl mb-6 flex items-center gap-2
                                                         before:content-['🎼'] before:transition-transform
                                                         before:duration-300 group-hover:before:rotate-[15deg]">
                                                Musical Elements
                                            </h3>
                                            <div className="space-y-6">
                                                <div className="bg-black/20 p-4 rounded-lg hover:bg-black/30
                                                             transition-all duration-300">
                                                    <h4 className="text-primary font-medium mb-2">Mood</h4>
                                                    <p className="text-white/90">{songInfo.musicalAnalysis.mood}</p>
                                                </div>

                                                <div className="bg-black/20 p-4 rounded-lg hover:bg-black/30
                                                             transition-all duration-300">
                                                    <h4 className="text-primary font-medium mb-3">Key Elements</h4>
                                                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {songInfo.musicalAnalysis.keyElements.map((element, idx) => (
                                                            <li key={idx}
                                                                className="flex items-center gap-2 text-white/90 pl-2
                                                                         before:content-['•'] before:text-primary">
                                                                {element}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                <div className="bg-black/20 p-4 rounded-lg hover:bg-black/30
                                                             transition-all duration-300">
                                                    <h4 className="text-primary font-medium mb-2">Soundscape</h4>
                                                    <p className="text-white/90">{songInfo.musicalAnalysis.soundscape}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Cultural Context */}
                                    {songInfo.culturalContext && (
                                        <div className="p-6 bg-white/5 rounded-xl border border-white/10
                                                      hover:bg-white/10 hover:border-spotify-green/30
                                                      hover:shadow-lg hover:shadow-spotify-green/10
                                                      transition-all duration-300 group animate-fadeIn
                                                      [animation-delay:200ms]">
                                            <h3 className="text-spotify-green text-xl mb-6 flex items-center gap-2
                                                         before:content-['🌟'] before:transition-transform
                                                         before:duration-300 group-hover:before:rotate-[15deg]">
                                                Cultural Impact
                                            </h3>
                                            <div className="space-y-4">
                                                <div className="flex flex-col gap-4">
                                                    <div className="bg-black/20 p-4 rounded-lg hover:bg-black/30
                                                                 transition-all duration-300">
                                                        <h4 className="text-primary font-medium mb-2">Musical Era</h4>
                                                        <p className="text-white/90">{songInfo.culturalContext.era}</p>
                                                    </div>
                                                    <div className="bg-black/20 p-4 rounded-lg hover:bg-black/30
                                                                 transition-all duration-300">
                                                        <h4 className="text-primary font-medium mb-2">Cultural Influence</h4>
                                                        <p className="text-white/90">{songInfo.culturalContext.influence}</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="bg-black/20 p-4 rounded-lg hover:bg-black/30
                                                             transition-all duration-300">
                                                    <h4 className="text-primary font-medium mb-3">Similar Artists & Songs</h4>
                                                    <ul className="space-y-2">
                                                        {songInfo.culturalContext.connections.map((connection, idx) => (
                                                            <li key={idx}
                                                                className="text-white/90 flex items-center gap-2 pl-2
                                                                         before:content-['•'] before:text-primary">
                                                                {connection}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Credits Section */}
                                    <div className="p-6 bg-white/5 rounded-xl border border-white/10
                                                  hover:bg-white/10 hover:border-spotify-green/30
                                                  hover:shadow-lg hover:shadow-spotify-green/10
                                                  transition-all duration-300 group animate-fadeIn
                                                  [animation-delay:400ms]">
                                        <h3 className="text-spotify-green text-xl mb-6 flex items-center gap-2
                                                     before:content-['🎵'] before:transition-transform
                                                     before:duration-300 group-hover:before:rotate-[15deg]">
                                            Song Credits
                                        </h3>
                                        <div className="space-y-6">
                                            <div className="bg-black/20 p-4 rounded-lg hover:bg-black/30
                                                         transition-all duration-300">
                                                <h4 className="text-primary font-medium mb-2">Genre</h4>
                                                <p className="text-white/90">
                                                    {Array.isArray(songInfo.genre) ? songInfo.genre.join(', ') : 'N/A'}
                                                </p>
                                            </div>

                                            {songInfo.credits && (
                                                <div className="space-y-3">
                                                    {songInfo.credits.map((credit, index) => (
                                                        <div key={index}
                                                             className="bg-black/20 p-4 rounded-lg group/item
                                                                      hover:bg-black/30 transition-all duration-300">
                                                            <div className="font-medium text-white mb-1 flex items-center
                                                                          gap-2 transition-transform duration-300
                                                                          group-hover/item:translate-x-1">
                                                                {credit.name}
                                                            </div>
                                                            <div className="text-primary/90 text-sm">
                                                                {credit.role}
                                                            </div>
                                                            {credit.knownFor && (
                                                                <div className="text-white/60 text-sm mt-2 italic pl-2
                                                                              border-l-2 border-primary/30">
                                                                    {credit.knownFor}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Highlights */}
                                    {songInfo.highlights && (
                                        <div className="p-6 bg-white/5 rounded-xl border border-white/10
                                                      hover:bg-white/10 hover:border-spotify-green/30
                                                      hover:shadow-lg hover:shadow-spotify-green/10
                                                      transition-all duration-300 group animate-fadeIn
                                                      [animation-delay:600ms]">
                                            <h3 className="text-spotify-green text-xl mb-6 flex items-center gap-2
                                                         before:content-['💫'] before:transition-transform
                                                         before:duration-300 group-hover:before:rotate-[15deg]">
                                                Key Highlights
                                            </h3>
                                            <div className="grid gap-3">
                                                {songInfo.highlights.map((highlight, idx) => (
                                                    <div key={idx}
                                                         className="flex items-center gap-4 p-4 bg-black/20
                                                                  rounded-lg hover:bg-black/30 transition-all
                                                                  duration-300 group/item">
                                                        <span className="text-primary font-medium w-6 h-6 flex
                                                                     items-center justify-center rounded-full
                                                                     bg-primary/10">
                                                            {idx + 1}
                                                        </span>
                                                        <p className="text-white/90 flex-1">{highlight}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-6 bg-white/5 rounded-xl border border-white/10 transition-all duration-300">
                                    <h3 className="text-spotify-green text-xl mb-4 flex items-center gap-2 before:content-['ℹ️']">Information Unavailable</h3>
                                    <p className="text-white/90">Additional song information is currently unavailable. Please try again later.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            
            <div className="flex justify-center mt-auto pt-8 animate-slideUp md:flex-row flex-col items-stretch">
                <button
                    className="px-8 py-4 rounded-full font-semibold cursor-pointer transition-all
                              duration-300 min-w-[180px] flex items-center justify-center gap-3
                              bg-spotify-green text-white hover:bg-spotify-green-light
                              hover:-translate-y-1 hover:shadow-xl hover:shadow-spotify-green/30
                              active:translate-y-0 active:shadow-md
                              disabled:bg-spotify-green/50 disabled:border-spotify-green/50
                              disabled:cursor-not-allowed disabled:transform-none
                              before:content-['+'] before:text-2xl before:transition-transform
                              before:duration-300 hover:before:rotate-[90deg] group"
                    onClick={handleSaveToPlaylist}
                >
                    Add to Playlist
                </button>
            </div>
        </div>
    );
};

export default SongDetails;