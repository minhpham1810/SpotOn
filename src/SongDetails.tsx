import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from './contexts/ToastContext';
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
import SongDetailsHeader from './components/song-details/SongDetailsHeader';
import SongDetailsSkeleton from './components/song-details/SongDetailsSkeleton';
import ResearchProgress from './components/song-details/ResearchProgress';
import SongDetailsError from './components/song-details/SongDetailsError';
import { useAudioPreview } from './components/song-details/useAudioPreview';

const DEFAULT_ACCENT: CoverAccent = {
  accent: '#1DB954',
  glow: 'rgba(29,185,84,0.4)',
  chip: 'rgba(29,185,84,0.12)',
  border: 'rgba(29,185,84,0.25)',
};

interface SongDetailsProps {
  onAddToPlaylist: (track: TrackDetails) => void;
  onLogout: () => void;
}

const SongDetails: React.FC<SongDetailsProps> = ({ onAddToPlaylist, onLogout }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [song, setSong] = useState<TrackDetails | null>(null);
    const [songInfo, setSongInfo] = useState<SongInfo | string | null>(null);
    const [isLoadingInfo, setIsLoadingInfo] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [researchSteps, setResearchSteps] = useState<ResearchStepEvent[]>([]);
    const [accent, setAccent] = useState<CoverAccent>(DEFAULT_ACCENT);
    const [retryKey, setRetryKey] = useState(0);
    const handlePreviewError = useCallback(() => {
        showToast('Unable to play this preview', 'error');
    }, [showToast]);
    const preview = useAudioPreview(song?.preview_url, handlePreviewError);

    useEffect(() => {
        const controller = new AbortController();

        const fetchSongDetails = async () => {
            if (!id) return;
            setError(null);
            setSong(null);
            setSongInfo(null);
            setResearchSteps([]);
            setAccent(DEFAULT_ACCENT);
            setIsLoadingInfo(false);
            try {
                const data = await SpotifyAPI.getTrackDetails(id);
                if (controller.signal.aborted) return;
                setSong(data);
                extractCoverAccent(data.cover).then((result) => {
                    if (!controller.signal.aborted) setAccent(result);
                });

                setIsLoadingInfo(true);
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
                if (error instanceof Error && error.name === 'AbortError') {
                    return;
                }
                console.error('Error fetching song details:', error);
                setError('Failed to load song details');
                showToast('Failed to load song details', 'error');
            }
        };

        fetchSongDetails();

        return () => {
            controller.abort();
        };
    }, [id, retryKey, showToast]);

    const handleSaveToPlaylist = () => {
        if (!song) return;
        try {
            onAddToPlaylist(song);
        } catch {
            showToast('Failed to add song to playlist', 'error');
        }
    };

    const cssVars = {
        '--song-accent': accent.accent,
        '--song-glow': accent.glow,
        '--song-chip': accent.chip,
        '--song-border': accent.border,
    } as React.CSSProperties;

    return (
        <main aria-label="Song details" className="song-page min-h-[100dvh]" style={cssVars}>
            <SongDetailsHeader onBack={() => navigate('/')} onLogout={onLogout} />
            {!song && !error ? (
                <SongDetailsSkeleton />
            ) : error ? (
                <SongDetailsError
                    message={error}
                    onRetry={() => setRetryKey((value) => value + 1)}
                    onBack={() => navigate('/')}
                />
            ) : song ? (
                <>
                    <section className="song-shell py-10 sm:py-14">
                        <HeroSection
                            song={song}
                            onAddToPlaylist={handleSaveToPlaylist}
                            previewState={preview.state}
                            onTogglePreview={() => void preview.toggle()}
                        />
                    </section>
                    <section aria-label="Song research report" className="song-shell pb-20">
                        {isLoadingInfo ? <ResearchProgress steps={researchSteps} /> : typeof songInfo === 'string' ? (
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
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-7 text-center sm:p-9">
                    <p className="text-white/30 m-0 mb-2"
                       style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                        Info
                    </p>
                    <p className="text-white/60 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        Additional song information is currently unavailable.
                    </p>
                </div>
                        )}
                    </section>
                </>
            ) : null}
        </main>
    );
};

export default SongDetails;
