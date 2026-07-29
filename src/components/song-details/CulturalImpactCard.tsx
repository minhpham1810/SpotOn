import React from 'react';
import type { SongInfoCulturalContext } from '../../types/song-info';

interface CulturalImpactCardProps {
  culturalContext?: SongInfoCulturalContext;
}

const CulturalImpactCard: React.FC<CulturalImpactCardProps> = ({ culturalContext }) => {
  if (!culturalContext) return null;
  const era = typeof culturalContext.era === 'string' ? culturalContext.era.trim() : '';
  const influence = typeof culturalContext.influence === 'string' ? culturalContext.influence.trim() : '';
  const connections = Array.isArray(culturalContext.connections)
    ? culturalContext.connections
        .filter((connection): connection is string => typeof connection === 'string')
        .map((connection) => connection.trim())
        .filter(Boolean)
    : [];
  if (!era && !influence && connections.length === 0) return null;

  return (
    <article
      className="song-card song-reveal"
      style={{ '--song-index': 4 } as React.CSSProperties}
      aria-labelledby="song-cultural-heading"
    >
      <h2 id="song-cultural-heading" className="song-eyebrow">Cultural Impact</h2>
      <div className="space-y-5">
        {era && <div>
          <p className="mb-1 text-[10px] uppercase tracking-widest text-white/30">
            Era
          </p>
          <p className="text-sm leading-relaxed text-white/70">
            {era}
          </p>
        </div>}
        {influence && <div className="border-t border-white/[0.08] pt-4">
          <p className="mb-1 text-[10px] uppercase tracking-widest text-white/30">
            Influence
          </p>
          <p className="text-sm leading-relaxed text-white/70">
            {influence}
          </p>
        </div>}
        {connections.length > 0 && (
          <div className="border-t border-white/[0.08] pt-4">
            <p className="mb-2 text-[10px] uppercase tracking-widest text-white/30">
              Similar Artists
            </p>
            <div className="flex flex-wrap gap-2">
              {connections.map((c, i) => (
                <span key={i} className="song-chip">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
};

export default CulturalImpactCard;
