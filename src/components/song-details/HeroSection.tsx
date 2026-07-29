import React from 'react';
import { Pause, Play, Plus, SpeakerSlash } from '@phosphor-icons/react';
import type { TrackDetails } from '../../types/spotify';
import type { AudioPreviewState } from './useAudioPreview';

interface HeroSectionProps {
  song: TrackDetails;
  onAddToPlaylist: () => void;
  previewState: AudioPreviewState;
  onTogglePreview: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ song, onAddToPlaylist, previewState, onTogglePreview }) => {
  const parsedYear = song.releaseDate ? new Date(song.releaseDate).getFullYear() : NaN;
  const releaseYear = Number.isFinite(parsedYear) ? parsedYear : '';
  const previewUnavailable = previewState === 'unavailable';
  const previewPlaying = previewState === 'playing';
  const previewLabel = previewUnavailable
    ? 'Preview unavailable'
    : previewPlaying
      ? 'Pause preview'
      : previewState === 'paused'
        ? 'Resume preview'
        : 'Preview';

  return (
    <section aria-label={`${song.name} overview`} className="song-shell song-hero">
      <div className="song-hero__content grid grid-cols-1 items-center gap-9 lg:grid-cols-[minmax(240px,320px)_1fr] lg:gap-12">
        <div className="relative mx-auto w-full max-w-72 lg:max-w-none">
          <div className="absolute inset-[-7%] rounded-[1.75rem] bg-[var(--song-glow)] opacity-70 blur-3xl" aria-hidden="true" />
          <img
            src={song.cover}
            alt={`${song.name} album cover`}
            className="relative aspect-square w-full rounded-2xl object-cover shadow-[0_2rem_4rem_-1.5rem_rgba(2,2,3,0.9),inset_0_1px_0_rgba(255,255,255,0.08)]"
          />
        </div>
        <div className="min-w-0">
          <p className="song-eyebrow">AI deep research</p>
          <h1 className="max-w-[14ch] font-syne text-4xl font-extrabold leading-[0.98] tracking-[-0.03em] text-balance [overflow-wrap:anywhere] sm:text-5xl lg:text-6xl">
            {song.name}
          </h1>
          <p className="mt-4 text-sm uppercase tracking-[0.16em] text-white/60 [overflow-wrap:anywhere]">{song.artist}</p>
          <p className="mt-2 text-sm text-white/40 [overflow-wrap:anywhere]">
            {releaseYear ? `${song.album} · ${releaseYear}` : song.album}
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button type="button" onClick={onAddToPlaylist} className="song-primary-action">
              <Plus size={18} weight="bold" aria-hidden="true" />
              <span>Add to playlist</span>
            </button>
            <button
              type="button"
              disabled={previewUnavailable}
              aria-pressed={previewUnavailable ? undefined : previewPlaying}
              aria-label={previewLabel}
              onClick={onTogglePreview}
              className="song-secondary-action"
            >
              {previewUnavailable ? (
                <SpeakerSlash size={18} weight="bold" aria-hidden="true" />
              ) : previewPlaying ? (
                <Pause size={18} weight="bold" aria-hidden="true" />
              ) : (
                <Play size={18} weight="bold" aria-hidden="true" />
              )}
              <span>{previewLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
