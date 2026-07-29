import React from 'react';
import type { SongInfoMusicalAnalysis } from '../../types/song-info';

interface MusicalElementsCardProps {
  musicalAnalysis?: SongInfoMusicalAnalysis;
}

const MusicalElementsCard: React.FC<MusicalElementsCardProps> = ({ musicalAnalysis }) => {
  if (!musicalAnalysis) return null;

  return (
    <div className="song-card song-reveal" style={{ '--song-index': 3 } as React.CSSProperties}>
      <p className="song-eyebrow">Musical Elements</p>
      <div className="space-y-5">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-widest text-white/30">
            Mood
          </p>
          <p className="text-sm leading-relaxed text-white/70">
            {musicalAnalysis.mood}
          </p>
        </div>
        <div className="border-t border-white/[0.08] pt-4">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-white/30">
            Key Elements
          </p>
          <ul className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
            {Array.isArray(musicalAnalysis.keyElements) && musicalAnalysis.keyElements.map((el, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-white/70">
                <span className="mt-1 flex-shrink-0" style={{ color: 'var(--song-accent, #1DB954)' }}>
                  ·
                </span>
                {el}
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-white/[0.08] pt-4">
          <p className="mb-1 text-[10px] uppercase tracking-widest text-white/30">
            Soundscape
          </p>
          <p className="text-sm leading-relaxed text-white/70">
            {musicalAnalysis.soundscape}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MusicalElementsCard;
