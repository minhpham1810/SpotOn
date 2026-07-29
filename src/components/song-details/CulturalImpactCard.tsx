import React from 'react';
import type { SongInfoCulturalContext } from '../../types/song-info';

interface CulturalImpactCardProps {
  culturalContext?: SongInfoCulturalContext;
}

const CulturalImpactCard: React.FC<CulturalImpactCardProps> = ({ culturalContext }) => {
  if (!culturalContext) return null;

  return (
    <div className="border-l-2 pl-5 py-1" style={{ borderColor: 'var(--song-border, rgba(29,185,84,0.3))' }}>
      <p
        className="m-0 mb-3"
        style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--song-accent, #1DB954)' }}
      >
        Cultural Impact
      </p>
      <div className="space-y-4">
        <div>
          <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Era
          </p>
          <p className="text-white/75 text-sm leading-relaxed" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            {culturalContext.era}
          </p>
        </div>
        <div>
          <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Influence
          </p>
          <p className="text-white/75 text-sm leading-relaxed" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            {culturalContext.influence}
          </p>
        </div>
        {culturalContext.connections && culturalContext.connections.length > 0 && (
          <div>
            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              Similar Artists
            </p>
            <div className="flex flex-wrap gap-2">
              {culturalContext.connections.map((c, i) => (
                <span key={i} className="text-xs px-3 py-1 rounded-full border border-white/10 text-white/60" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CulturalImpactCard;
