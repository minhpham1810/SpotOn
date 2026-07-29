import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Minus,
  Pause,
  Play,
  Plus,
  SpeakerSlash,
} from '@phosphor-icons/react';
import { useToast } from './contexts/ToastContext';
import { SpotifyTrack } from './types/spotify';
import { useAudioPreview } from './components/song-details/useAudioPreview';

interface TrackProps {
  track: SpotifyTrack;
  onAdd?: (track: SpotifyTrack) => void;
  onRemove?: (trackId: string) => void;
  isInPlaylist?: boolean;
}

const Track: React.FC<TrackProps> = ({ track, onAdd, onRemove, isInPlaylist = false }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const handlePreviewError = useCallback(() => {
    showToast('Unable to play this preview', 'error');
  }, [showToast]);
  const preview = useAudioPreview(track.preview_url, handlePreviewError);
  const previewUnavailable = preview.state === 'unavailable';
  const previewPlaying = preview.state === 'playing';
  const previewLabel = previewUnavailable
    ? `Preview unavailable for ${track.name}`
    : previewPlaying
      ? `Pause preview for ${track.name}`
      : preview.state === 'paused'
        ? `Resume preview for ${track.name}`
        : `Play preview for ${track.name}`;

  const openTrack = () => {
    preview.stop();
    navigate(`/song/${track.id}`);
  };

  const handleAction = () => {
    if (isInPlaylist) {
      onRemove?.(track.id);
    } else {
      onAdd?.(track);
    }
  };

  return (
    <article className="search-track">
      <div className="search-track__identity">
        <button type="button" onClick={openTrack} className="search-track__cover-wrap" aria-label={`Open ${track.name} by ${track.artist}`}>
          <img
            src={track.cover}
            alt=""
            className="search-track__cover"
          />
          <span className="search-track__open-mark" aria-hidden="true">
              <ArrowUpRight size={15} weight="bold" />
            </span>
        </button>
        <div className="min-w-0 text-left">
          <h3 className="truncate font-syne text-base font-bold tracking-[-0.015em] text-white">
            <button type="button" onClick={openTrack} className="max-w-full truncate text-left transition-colors duration-300 hover:text-primary">
              {track.name}
            </button>
          </h3>
          <span className="mt-1 block truncate text-xs uppercase tracking-[0.13em] text-white/45">
            {track.artist}
          </span>
          <span className="mt-1 block truncate text-xs text-white/30">{track.album}</span>
        </div>
      </div>

      <div className="search-track__actions">
        <button
          type="button"
          onClick={() => void preview.toggle()}
          disabled={previewUnavailable}
          aria-label={previewLabel}
          aria-pressed={previewUnavailable ? undefined : previewPlaying}
          className="search-icon-action"
        >
          {previewUnavailable ? (
            <SpeakerSlash size={17} weight="bold" aria-hidden="true" />
          ) : previewPlaying ? (
            <Pause size={17} weight="bold" aria-hidden="true" />
          ) : (
            <Play size={17} weight="bold" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={handleAction}
          aria-label={isInPlaylist ? `Remove ${track.name} from playlist` : `Add ${track.name} to playlist`}
          className="search-icon-action search-icon-action--primary"
        >
          {isInPlaylist ? (
            <Minus size={17} weight="bold" aria-hidden="true" />
          ) : (
            <Plus size={17} weight="bold" aria-hidden="true" />
          )}
        </button>
      </div>
    </article>
  );
};

export default Track;
