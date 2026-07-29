import React from 'react';
import type { SongInfoCredit } from '../../types/song-info';

interface CreditsCardProps {
  credits: SongInfoCredit[];
}

const CreditsCard: React.FC<CreditsCardProps> = ({ credits }) => {
  if (!Array.isArray(credits) || credits.length === 0) return null;

  return (
    <div className="song-card song-reveal" style={{ '--song-index': 5 } as React.CSSProperties}>
      <p className="song-eyebrow">Credits</p>
      <div className="divide-y divide-white/[0.08]">
        {credits.map((credit, i) => (
          <div key={i} className="flex flex-col gap-0.5 py-4 first:pt-0 last:pb-0">
            <p className="text-sm font-medium text-white">
              {credit.name}
            </p>
            <p className="text-sm" style={{ color: 'var(--song-accent, #1DB954)' }}>
              {credit.role}
            </p>
            {credit.knownFor && (
              <p className="mt-1 text-sm leading-relaxed text-white/70">
                {credit.knownFor}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CreditsCard;
