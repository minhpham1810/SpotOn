import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  FloppyDisk,
  MusicNotesPlus,
  PencilSimple,
  SpinnerGap,
  Trash,
  VinylRecord,
  X,
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './contexts/ToastContext';
import SpotifyAPI from './api/SpotifyAPI';
import { SpotifyTrack } from './types/spotify';

interface PlaylistProps {
  tracks: SpotifyTrack[];
  onRemoveTrack: (trackId: string) => void;
  name: string;
  onNameChange: (newName: string) => void;
  onClearPlaylist: () => void;
}

const Playlist: React.FC<PlaylistProps> = ({ tracks, onRemoveTrack, name, onNameChange, onClearPlaylist }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSavePlaylist = async () => {
    if (tracks.length === 0) return;
    try {
      setIsSaving(true);
      setSaveError(null);
      await SpotifyAPI.createPlaylist(name, tracks);
      showToast('Playlist saved to Spotify. Check your library.', 'success');
    } catch (error) {
      console.error('Error saving playlist:', error);
      setSaveError('Spotify could not save this playlist. Your local mix is unchanged.');
      showToast('Failed to save playlist', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearPlaylist = () => {
    if (window.confirm('Clear every track from this playlist?')) {
      onClearPlaylist();
      setSaveError(null);
    }
  };

  const startEditing = () => {
    setIsEditing(true);
    setEditValue(name);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditValue(name);
  };

  const submitName = () => {
    const newName = editValue.trim();
    if (newName && newName !== name) onNameChange(newName);
    setIsEditing(false);
  };

  const handleNameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') submitName();
    if (event.key === 'Escape') cancelEditing();
  };

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  return (
    <aside aria-labelledby="playlist-heading" className="search-playlist">
      <div className="search-section-heading items-start">
        <div className="min-w-0">
          <p className="search-eyebrow">Saved for later</p>
          <h2 id="playlist-heading" className="font-syne text-2xl font-bold tracking-[-0.025em] text-white">
            Your playlist
          </h2>
        </div>
        <span className="search-result-count">{tracks.length.toString().padStart(2, '0')}</span>
      </div>

      <div className="border-b border-white/[0.07] pb-5">
        {isEditing ? (
          <div className="space-y-2">
            <label htmlFor="playlist-name" className="text-[0.6875rem] uppercase tracking-[0.16em] text-white/40">
              Playlist name
            </label>
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
              <input
                id="playlist-name"
                ref={inputRef}
                className="search-playlist__name-input"
                value={editValue}
                onChange={(event) => setEditValue(event.target.value)}
                onKeyDown={handleNameKeyDown}
                maxLength={50}
              />
              <button type="button" onClick={submitName} className="search-icon-action" aria-label="Save playlist name">
                <Check size={16} weight="bold" aria-hidden="true" />
              </button>
              <button type="button" onClick={cancelEditing} className="search-icon-action" aria-label="Cancel playlist rename">
                <X size={16} weight="bold" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={startEditing} className="group flex w-full items-center justify-between gap-4 text-left">
            <span className="truncate text-sm font-medium text-white/70">{name}</span>
            <PencilSimple
              size={15}
              weight="bold"
              aria-hidden="true"
              className="shrink-0 text-white/30 transition-colors duration-300 group-hover:text-primary"
            />
            <span className="sr-only">Rename playlist</span>
          </button>
        )}
      </div>

      {tracks.length === 0 ? (
        <div className="search-playlist__empty" role="status">
          <div className="relative">
            <VinylRecord size={54} weight="thin" aria-hidden="true" className="search-vinyl text-white/20" />
            <MusicNotesPlus size={18} weight="bold" aria-hidden="true" className="absolute -bottom-1 -right-2 text-primary" />
          </div>
          <p className="font-syne text-base font-bold text-white/75">Build a listening queue</p>
          <p className="max-w-[28ch] text-center text-xs leading-relaxed text-white/40">
            Add tracks from search results. Your mix stays here while you open song reports.
          </p>
        </div>
      ) : (
        <ol className="m-0 max-h-[30rem] list-none divide-y divide-white/[0.07] overflow-y-auto p-0" aria-label={`${name} tracks`}>
          {tracks.map((track, index) => (
            <li key={track.id} className="search-playlist__track">
              <span className="w-6 shrink-0 text-[0.6875rem] font-bold tabular-nums text-primary">
                {String(index + 1).padStart(2, '0')}
              </span>
              <button type="button" onClick={() => navigate(`/song/${track.id}`)} className="min-w-0 flex-1 text-left">
                <span className="block truncate font-syne text-sm font-bold text-white">{track.name}</span>
                <span className="mt-1 block truncate text-[0.6875rem] uppercase tracking-[0.11em] text-white/35">
                  {track.artist}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onRemoveTrack(track.id)}
                className="search-icon-action size-9 shrink-0"
                aria-label={`Remove ${track.name} from playlist`}
              >
                <X size={15} weight="bold" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      )}

      {saveError && (
        <p role="alert" className="mt-4 border-l-2 border-red-400/70 pl-3 text-xs leading-relaxed text-red-100/70">
          {saveError}
        </p>
      )}

      {tracks.length > 0 && (
        <div className="mt-auto grid gap-2 border-t border-white/[0.07] pt-5">
          <button
            type="button"
            className="search-primary-action w-full"
            onClick={() => void handleSavePlaylist()}
            disabled={isSaving}
          >
            {isSaving ? (
              <SpinnerGap size={17} weight="bold" aria-hidden="true" className="animate-spin" />
            ) : (
              <FloppyDisk size={17} weight="bold" aria-hidden="true" />
            )}
            {isSaving ? 'Saving to Spotify' : 'Save to Spotify'}
          </button>
          <button type="button" className="search-text-action justify-center" onClick={handleClearPlaylist}>
            <Trash size={15} weight="bold" aria-hidden="true" />
            Clear playlist
          </button>
        </div>
      )}
    </aside>
  );
};

export default Playlist;
