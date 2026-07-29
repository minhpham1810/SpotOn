import { ArrowLeft } from '@phosphor-icons/react';

interface SongDetailsHeaderProps {
  onBack: () => void;
  onLogout: () => void;
}

export default function SongDetailsHeader({ onBack, onLogout }: SongDetailsHeaderProps) {
  return (
    <header className="song-shell relative flex flex-col gap-5 pt-5 sm:pt-7">
      <button type="button" onClick={onBack} className="song-text-action order-2 group w-fit">
        <ArrowLeft size={16} weight="bold" aria-hidden="true" />
        <span>Back to search</span>
      </button>
      <div className="order-1 flex items-center justify-between">
        <div className="font-syne text-[1.625rem] font-extrabold uppercase tracking-[0.04em]" aria-label="SpotOn">
          <span>Spot</span>
          <span className="text-[var(--song-accent)]">On</span>
        </div>
        <button type="button" onClick={onLogout} className="song-text-action">
          Logout
        </button>
      </div>
    </header>
  );
}
