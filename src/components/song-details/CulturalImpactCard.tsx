import React from 'react';
import type { SongInfoCulturalContext } from '../../types/song-info';

interface CulturalImpactCardProps {
  culturalContext?: SongInfoCulturalContext;
}

const CulturalImpactCard: React.FC<CulturalImpactCardProps> = ({ culturalContext }) => {
  if (!culturalContext) return null;

  return (
    <div className="song-card song-reveal" style={{ '--song-index': 4 } as React.CSSProperties}>
      <p className="song-eyebrow">Cultural Impact</p>
      <div className="space-y-5">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-widest text-white/30">
            Era
          </p>
          <p className="text-sm leading-relaxed text-white/70">
            {culturalContext.era}
          </p>
        </div>
        <div className="border-t border-white/[0.08] pt-4">
          <p className="mb-1 text-[10px] uppercase tracking-widest text-white/30">
            Influence
          </p>
          <p className="text-sm leading-relaxed text-white/70">
            {culturalContext.influence}
          </p>
        </div>
        {culturalContext.connections && culturalContext.connections.length > 0 && (
          <div className="border-t border-white/[0.08] pt-4">
            <p className="mb-2 text-[10px] uppercase tracking-widest text-white/30">
              Similar Artists
            </p>
            <div className="flex flex-wrap gap-2">
              {culturalContext.connections.map((c, i) => (
                <span key={i} className="song-chip">
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
