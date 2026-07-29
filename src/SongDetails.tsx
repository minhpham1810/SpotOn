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
    const [researchError, setResearchError] = useState<string | null>(null);
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
            setResearchError(null);
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
                    if (controller.signal.aborted) return;
                    setAccent(result);
                });

                setIsLoadingInfo(true);
                try {
                    const info = await ResearchAgentAPI.researchSong(
                        { id, name: data.name, artist: data.artist, album: data.album },
                        (step) => {
                            if (controller.signal.aborted) return;
                            setResearchSteps((prev) => [...prev, step]);
                        },
                        controller.signal
                    );
                    if (controller.signal.aborted) return;
                    setSongInfo(info);
                } catch (error) {
                    if (controller.signal.aborted) return;
                    console.error('Error generating song info:', error);
                    setResearchError('Unable to load additional song information.');
                    showToast('Unable to load song details at this time', 'error');
                } finally {
                    if (!controller.signal.aborted) {
                        setIsLoadingInfo(false);
                    }
                }
            } catch (error) {
                if (controller.signal.aborted) return;
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
        <main aria-label="Song details" className="song-page" style={cssVars}>
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
                    <HeroSection
                        song={song}
                        onAddToPlaylist={handleSaveToPlaylist}
                        previewState={preview.state}
                        onTogglePreview={() => void preview.toggle()}
                    />
                    <section aria-label="Song research report" className="song-shell pb-20">
                        {isLoadingInfo ? <ResearchProgress steps={researchSteps} /> : researchError ? (
                            <article className="song-card song-card--wide text-center" role="alert">
                                <p className="font-syne text-lg font-semibold text-white">Research is unavailable right now</p>
                                <p className="mt-2 text-sm text-white/60">{researchError}</p>
                                <button
                                    type="button"
                                    onClick={() => setRetryKey((value) => value + 1)}
                                    className="song-secondary-action mt-5"
                                >
                                    Try again
                                </button>
                            </article>
                        ) : songInfo && typeof songInfo !== 'string' ? (
                            <div className="song-report-grid">
                                <EmotionalFingerprintCard emotionalFingerprint={songInfo.emotionalFingerprint} />
                                <SonicFingerprintCard sonicRead={songInfo.sonicRead} audioFeatures={songInfo.audioFeatures} />
                                <article
                                    className="song-card song-card--wide song-reveal"
                                    style={{ '--song-index': 2 } as React.CSSProperties}
                                >
                                    <p className="song-eyebrow">About this Song</p>
                                    <p className="max-w-[65ch] text-sm leading-relaxed text-white/70">{songInfo.summary}</p>
                                </article>
                                <MusicalElementsCard musicalAnalysis={songInfo.musicalAnalysis} />
                                <CulturalImpactCard culturalContext={songInfo.culturalContext} />
                                <CreditsCard credits={songInfo.credits} />
                                <KeyFindingsCard findings={songInfo.findings} />
                                <GenreSourcesFooter genre={songInfo.genre} sources={songInfo.sources} />
                            </div>
                        ) : (
                            <article className="song-card song-card--wide" role="status">
                                <p className="song-eyebrow">Info</p>
                                <p className="max-w-[65ch] text-sm leading-relaxed text-white/60">
                                    {typeof songInfo === 'string'
                                        ? songInfo
                                        : 'Additional song information is currently unavailable. The album theme is already applied from the cover art.'}
                                </p>
                            </article>
                        )}
                    </section>
                </>
            ) : null}
        </main>
    );
};

export default SongDetails;
