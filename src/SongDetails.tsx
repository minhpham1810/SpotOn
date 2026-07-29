import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from './contexts/ToastContext';
import LoadingSpinner from './LoadingSpinner';
import SpotifyAPI from './api/SpotifyAPI';
import ResearchAgentAPI, { ResearchStepEvent } from './api/ResearchAgentAPI';
import { TrackDetails } from './types/spotify';
import { SongInfo } from './types/song-info';
import { extractCoverAccent, type CoverAccent } from './lib/coverAccentColor';
import HeroSection from './components/song-details/HeroSection';
import EmotionalFingerprintCard from './components/song-details/EmotionalFingerprintCard';
import SonicFingerprintCard from './components/song-details/SonicFingerprintCard';
import MusicalElementsCard from './components/song-details/MusicalElementsCard';
import CulturalImpactCard from './components/song-details/CulturalImpactCard';
import CreditsCard from './components/song-details/CreditsCard';
import KeyFindingsCard from './components/song-details/KeyFindingsCard';
import GenreSourcesFooter from './components/song-details/GenreSourcesFooter';

const DEFAULT_ACCENT: CoverAccent = {
  accent: '#1DB954',
  glow: 'rgba(29,185,84,0.4)',
  chip: 'rgba(29,185,84,0.12)',
  border: 'rgba(29,185,84,0.25)',
};

interface SongDetailsProps {
  onAddToPlaylist: (track: TrackDetails) => void;
}

const SongDetails: React.FC<SongDetailsProps> = ({ onAddToPlaylist }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [song, setSong] = useState<TrackDetails | null>(null);
    const [songInfo, setSongInfo] = useState<SongInfo | string | null>(null);
    const [isLoadingInfo, setIsLoadingInfo] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [researchSteps, setResearchSteps] = useState<ResearchStepEvent[]>([]);
    const [accent, setAccent] = useState<CoverAccent>(DEFAULT_ACCENT);

    useEffect(() => {
        const controller = new AbortController();

        const fetchSongDetails = async () => {
            if (!id) return;
            try {
                const data = await SpotifyAPI.getTrackDetails(id);
                setSong(data);
                setAccent(DEFAULT_ACCENT);
                extractCoverAccent(data.cover).then((result) => {
                    if (!controller.signal.aborted) setAccent(result);
                });

                setIsLoadingInfo(true);
                setResearchSteps([]);
                setSongInfo(null);
                try {
                    const info = await ResearchAgentAPI.researchSong(
                        { id, name: data.name, artist: data.artist, album: data.album },
                        (step) => setResearchSteps((prev) => [...prev, step]),
                        controller.signal
                    );
                    setSongInfo(info);
                } catch (error) {
                    if (error instanceof Error && error.name === 'AbortError') {
                        return;
                    }
                    console.error('Error generating song info:', error);
                    showToast('Unable to load song details at this time', 'error');
                } finally {
                    if (!controller.signal.aborted) {
                        setIsLoadingInfo(false);
                    }
                }
            } catch (error) {
                console.error('Error fetching song details:', error);
                setError('Failed to load song details');
                showToast('Failed to load song details', 'error');
            }
        };

        fetchSongDetails();

        return () => {
            controller.abort();
        };
    }, [id, showToast]);

    const handleSaveToPlaylist = () => {
        if (!song) return;
        try {
            onAddToPlaylist(song);
        } catch {
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

    const cssVars = {
        '--song-accent': accent.accent,
        '--song-glow': accent.glow,
        '--song-chip': accent.chip,
        '--song-border': accent.border,
    } as React.CSSProperties;

    return (
        <div className="max-w-[1200px] mx-auto p-6 md:p-8 min-h-screen flex flex-col" style={cssVars}>
            <button
                className="text-white/40 text-sm cursor-pointer transition-all duration-300 mb-8 flex items-center
                          gap-2 w-fit hover:text-white group"
                style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.05em' }}
                onClick={() => navigate('/')}
            >
                <span className="transition-transform duration-300 group-hover:-translate-x-1">←</span>
                <span>Back</span>
            </button>

            <HeroSection song={song} onAddToPlaylist={handleSaveToPlaylist} />

            {isLoadingInfo ? (
                <div className="my-4 flex flex-col items-center gap-4 animate-fadeIn py-12">
                    <LoadingSpinner size="small" />
                    {researchSteps.length > 0 ? (
                        <ul className="text-white/40 text-sm italic space-y-1 text-center list-none p-0 m-0"
                            style={{ fontFamily: 'DM Sans, sans-serif' }}>
                            {researchSteps.map((step, i) => (
                                <li key={i}>{step.status}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-white/40 text-sm italic animate-pulse" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                            Researching this song...
                        </p>
                    )}
                </div>
            ) : typeof songInfo === 'string' ? (
                <div className="border-l-2 border-white/10 pl-5 py-1">
                    <p className="text-white/30 m-0 mb-2"
                       style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                        Info
                    </p>
                    <p className="text-white/60 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        {songInfo}
                    </p>
                </div>
            ) : songInfo ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2"><EmotionalFingerprintCard emotionalFingerprint={songInfo.emotionalFingerprint} /></div>
                    <div className="md:col-span-2"><SonicFingerprintCard sonicRead={songInfo.sonicRead} audioFeatures={songInfo.audioFeatures} /></div>
                    <div className="border-l-2 pl-5 py-1" style={{ borderColor: 'var(--song-border, rgba(29,185,84,0.3))' }}>
                        <p className="m-0 mb-3"
                           style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--song-accent, #1DB954)' }}>
                            About this Song
                        </p>
                        <p className="text-white/75 leading-relaxed text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>{songInfo.summary}</p>
                    </div>
                    <MusicalElementsCard musicalAnalysis={songInfo.musicalAnalysis} />
                    <CulturalImpactCard culturalContext={songInfo.culturalContext} />
                    <CreditsCard credits={songInfo.credits} />
                    <div className="md:col-span-2"><KeyFindingsCard findings={songInfo.findings} /></div>
                    <div className="md:col-span-2"><GenreSourcesFooter genre={songInfo.genre} sources={songInfo.sources} /></div>
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
    );
};

export default SongDetails;
