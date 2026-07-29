import React from 'react';
import { Circle } from '@phosphor-icons/react';
import type { SongInfoMusicalAnalysis } from '../../types/song-info';

interface MusicalElementsCardProps {
  musicalAnalysis?: SongInfoMusicalAnalysis;
}

const MusicalElementsCard: React.FC<MusicalElementsCardProps> = ({ musicalAnalysis }) => {
  if (!musicalAnalysis) return null;
  const mood = typeof musicalAnalysis.mood === 'string' ? musicalAnalysis.mood.trim() : '';
  const soundscape = typeof musicalAnalysis.soundscape === 'string' ? musicalAnalysis.soundscape.trim() : '';
  const keyElements = Array.isArray(musicalAnalysis.keyElements)
    ? musicalAnalysis.keyElements
        .filter((element): element is string => typeof element === 'string')
        .map((element) => element.trim())
        .filter(Boolean)
    : [];
  if (!mood && !soundscape && keyElements.length === 0) return null;

  return (
    <article
      className="song-card song-reveal"
      style={{ '--song-index': 3 } as React.CSSProperties}
      aria-labelledby="song-musical-heading"
    >
      <h2 id="song-musical-heading" className="song-eyebrow">Musical Elements</h2>
      <div className="space-y-5">
        {mood && <div>
          <p className="mb-1 text-[10px] uppercase tracking-widest text-white/30">
            Mood
          </p>
          <p className="text-sm leading-relaxed text-white/70">
            {mood}
          </p>
        </div>}
        {keyElements.length > 0 && <div className="border-t border-white/[0.08] pt-4">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-white/30">
            Key Elements
          </p>
          <ul className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
            {keyElements.map((el, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-white/70">
                <Circle
                  className="mt-1.5 flex-shrink-0 text-[var(--song-accent)]"
                  size={6}
                  weight="fill"
                  aria-hidden="true"
                />
                <span className="min-w-0 [overflow-wrap:anywhere]">{el}</span>
              </li>
            ))}
          </ul>
        </div>}
        {soundscape && <div className="border-t border-white/[0.08] pt-4">
          <p className="mb-1 text-[10px] uppercase tracking-widest text-white/30">
            Soundscape
          </p>
          <p className="text-sm leading-relaxed text-white/70">
            {soundscape}
          </p>
        </div>}
      </div>
    </article>
  );
};

export default MusicalElementsCard;
