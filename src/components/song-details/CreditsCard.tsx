import React from 'react';
import type { SongInfoCredit } from '../../types/song-info';

interface CreditsCardProps {
  credits: SongInfoCredit[];
}

const CreditsCard: React.FC<CreditsCardProps> = ({ credits }) => {
  if (!Array.isArray(credits) || credits.length === 0) return null;

  return (
    <div className="border-l-2 pl-5 py-1" style={{ borderColor: 'var(--song-border, rgba(29,185,84,0.3))' }}>
      <p
        className="m-0 mb-3"
        style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--song-accent, #1DB954)' }}
      >
        Credits
      </p>
      <div className="flex flex-col gap-4">
        {credits.map((credit, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <p className="text-white font-medium text-sm m-0" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              {credit.name}
            </p>
            <p className="text-sm m-0" style={{ fontFamily: 'DM Sans, sans-serif', color: 'var(--song-accent, #1DB954)' }}>
              {credit.role}
            </p>
            {credit.knownFor && (
              <p className="text-white/40 text-xs m-0 mt-0.5 pl-2 border-l border-white/15 italic" style={{ fontFamily: 'DM Sans, sans-serif' }}>
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
