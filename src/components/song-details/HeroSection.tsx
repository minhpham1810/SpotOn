import React from 'react';
import { Pause, Play, SpeakerSlash } from '@phosphor-icons/react';
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
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8 mb-8 animate-fadeIn">
      <div className="relative w-full max-w-[280px] md:max-w-none mx-auto md:mx-0">
        <img
          className="w-full aspect-square rounded-lg object-cover shadow-2xl relative z-10"
          src={song.cover}
          alt={song.name}
        />
        <img
          className="absolute inset-0 w-full h-full object-cover rounded-lg blur-3xl opacity-25 scale-110 -z-0"
          src={song.cover}
          alt=""
          aria-hidden="true"
        />
      </div>

      <div className="flex flex-col justify-center gap-4">
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--song-accent, #1DB954)', boxShadow: '0 0 10px var(--song-glow, rgba(29,185,84,0.5))' }}
          />
          <span className="text-[11px] uppercase tracking-[0.28em]" style={{ color: 'var(--song-accent, #1DB954)' }}>
            AI Deep Research
          </span>
        </div>
        <h2 className="text-4xl md:text-5xl font-extrabold text-white m-0 leading-[0.98]" style={{ fontFamily: 'Syne, sans-serif' }}>
          {song.name}
        </h2>
        <p
          className="m-0 text-white/60"
          style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', letterSpacing: '0.16em', textTransform: 'uppercase' }}
        >
          {song.artist}
        </p>
        <p className="m-0 text-white/40 text-sm">
          {releaseYear ? `${song.album} · ${releaseYear}` : song.album}
        </p>

        <div className="flex flex-wrap items-center gap-3 mt-2">
          <button
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-[#0a0a0a] font-bold text-xs uppercase tracking-wider cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
            style={{ fontFamily: 'Syne, sans-serif', background: 'var(--song-accent, #1DB954)' }}
            onClick={onAddToPlaylist}
          >
            <span className="text-base leading-none">+</span> Add to Playlist
          </button>
          <button
            type="button"
            disabled={previewUnavailable}
            aria-pressed={previewUnavailable ? undefined : previewPlaying}
            aria-label={previewLabel}
            onClick={onTogglePreview}
            className="song-secondary-action inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/5 border border-white/15 text-white text-xs font-medium cursor-pointer hover:bg-white/10 transition-colors disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-white/5"
          >
            {previewUnavailable ? <SpeakerSlash /> : previewPlaying ? <Pause /> : <Play />}
            <span>{previewLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
