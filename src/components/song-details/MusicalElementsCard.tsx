import React from 'react';
import type { SongInfoMusicalAnalysis } from '../../types/song-info';

interface MusicalElementsCardProps {
  musicalAnalysis?: SongInfoMusicalAnalysis;
}

const MusicalElementsCard: React.FC<MusicalElementsCardProps> = ({ musicalAnalysis }) => {
  if (!musicalAnalysis) return null;

  return (
    <div className="border-l-2 pl-5 py-1" style={{ borderColor: 'var(--song-border, rgba(29,185,84,0.3))' }}>
      <p
        className="m-0 mb-3"
        style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--song-accent, #1DB954)' }}
      >
        Musical Elements
      </p>
      <div className="space-y-4">
        <div>
          <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Mood
          </p>
          <p className="text-white/75 text-sm leading-relaxed" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            {musicalAnalysis.mood}
          </p>
        </div>
        <div>
          <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Key Elements
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {Array.isArray(musicalAnalysis.keyElements) && musicalAnalysis.keyElements.map((el, i) => (
              <li key={i} className="flex items-start gap-2 text-white/70 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                <span className="mt-1 flex-shrink-0" style={{ color: 'var(--song-accent, #1DB954)' }}>
                  ·
                </span>
                {el}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Soundscape
          </p>
          <p className="text-white/75 text-sm leading-relaxed" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            {musicalAnalysis.soundscape}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MusicalElementsCard;
