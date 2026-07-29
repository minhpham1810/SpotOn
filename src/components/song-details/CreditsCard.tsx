import React from 'react';
import type { SongInfoCredit } from '../../types/song-info';

interface CreditsCardProps {
  credits: SongInfoCredit[];
}

const CreditsCard: React.FC<CreditsCardProps> = ({ credits }) => {
  const validCredits = Array.isArray(credits)
    ? credits.filter((credit) => (
        credit
        && typeof credit.name === 'string'
        && credit.name.trim()
        && typeof credit.role === 'string'
        && credit.role.trim()
      ))
    : [];
  if (validCredits.length === 0) return null;

  return (
    <article
      className="song-card song-reveal"
      style={{ '--song-index': 5 } as React.CSSProperties}
      aria-labelledby="song-credits-heading"
    >
      <h2 id="song-credits-heading" className="song-eyebrow">Credits</h2>
      <div className="divide-y divide-white/[0.08]">
        {validCredits.map((credit, i) => (
          <div key={i} className="flex min-w-0 flex-col gap-0.5 py-4 first:pt-0 last:pb-0">
            <p className="text-sm font-medium text-white [overflow-wrap:anywhere]">
              {credit.name}
            </p>
            <p className="text-sm [overflow-wrap:anywhere]" style={{ color: 'var(--song-accent, #1DB954)' }}>
              {credit.role}
            </p>
            {credit.knownFor && (
              <p className="mt-1 text-sm leading-relaxed text-white/70 [overflow-wrap:anywhere]">
                {credit.knownFor}
              </p>
            )}
          </div>
        ))}
      </div>
    </article>
  );
};

export default CreditsCard;
