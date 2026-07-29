import React from 'react';
import type { EmotionalFingerprint } from '../../types/song-info';

interface EmotionalFingerprintCardProps {
  emotionalFingerprint?: EmotionalFingerprint;
}

const EmotionalFingerprintCard: React.FC<EmotionalFingerprintCardProps> = ({ emotionalFingerprint }) => {
  if (!emotionalFingerprint || !Array.isArray(emotionalFingerprint.arc)) return null;

  const signatureMove =
    typeof emotionalFingerprint.signatureMove === 'string'
      ? emotionalFingerprint.signatureMove.trim()
      : '';
  const reachForThisWhen =
    typeof emotionalFingerprint.reachForThisWhen === 'string'
      ? emotionalFingerprint.reachForThisWhen.trim()
      : '';
  const journey = emotionalFingerprint.arc
    .filter((beat): beat is string => typeof beat === 'string')
    .map((beat) => beat.trim())
    .filter(Boolean);

  if (!signatureMove || !reachForThisWhen || journey.length === 0) return null;

  return (
    <article className="song-card song-card--wide song-reveal" style={{ '--song-index': 0 } as React.CSSProperties}>
      <p className="song-eyebrow">Emotional Fingerprint</p>
      <blockquote className="max-w-[24ch] font-syne text-xl font-semibold italic leading-snug text-white sm:text-2xl lg:text-3xl">
        <span className="text-[var(--song-accent)]" aria-hidden="true">
          “
        </span>
        {signatureMove}
      </blockquote>
      <p className="mt-8 text-[0.625rem] uppercase tracking-[0.24em] text-white/35">
        The journey
      </p>
      <ol
        aria-label="Emotional journey"
        className="song-journey mt-4"
        style={{ '--journey-steps': journey.length } as React.CSSProperties}
      >
        {journey.map((beat, index) => (
          <li key={`${index}-${beat}`} data-testid="journey-step" className="song-journey__step">
            <span className="song-journey__dot" aria-hidden="true" />
            <span className="font-syne text-xs text-[var(--song-accent)]">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="text-sm leading-relaxed text-white/70">{beat}</span>
          </li>
        ))}
      </ol>
      <div className="mt-8 flex flex-wrap items-baseline gap-2 border-t border-white/[0.08] pt-5">
        <span className="text-[0.625rem] uppercase tracking-[0.22em] text-white/35">Reach for this when</span>
        <span className="text-sm text-white/80">{reachForThisWhen}</span>
      </div>
    </article>
  );
};

export default EmotionalFingerprintCard;
