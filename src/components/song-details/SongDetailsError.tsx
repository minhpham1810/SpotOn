import { ArrowClockwise, ArrowLeft, WarningCircle } from '@phosphor-icons/react';

interface SongDetailsErrorProps {
  message: string;
  onRetry: () => void;
  onBack: () => void;
}

export default function SongDetailsError({ message, onRetry, onBack }: SongDetailsErrorProps) {
  return (
    <section className="song-shell py-10 sm:py-14">
      <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.035] p-8 text-center shadow-2xl sm:p-10">
        <WarningCircle className="mx-auto text-[var(--song-accent)]" size={42} weight="duotone" aria-hidden="true" />
        <h1 className="mt-5 font-syne text-2xl font-bold text-white">We couldn’t load this song</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/60">{message}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-full bg-[var(--song-accent)] px-5 py-3 font-syne text-sm font-bold text-black">
            <ArrowClockwise size={18} weight="bold" aria-hidden="true" />
            Try again
          </button>
          <button type="button" onClick={onBack} className="song-secondary-action inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm text-white/80">
            <ArrowLeft size={18} weight="bold" aria-hidden="true" />
            Back to search
          </button>
        </div>
      </div>
    </section>
  );
}
