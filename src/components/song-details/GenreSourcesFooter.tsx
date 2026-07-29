import React from 'react';
import type { SongInfoSource } from '../../types/song-info';
import { safeUrl } from '../../lib/safeUrl';

interface GenreSourcesFooterProps {
  genre: string[];
  sources: SongInfoSource[];
}

const GenreSourcesFooter: React.FC<GenreSourcesFooterProps> = ({ genre, sources }) => {
  const hasGenre = Array.isArray(genre) && genre.length > 0;
  const hasSources = Array.isArray(sources) && sources.length > 0;
  if (!hasGenre && !hasSources) return null;

  return (
    <div className="song-card--wide grid grid-cols-1 gap-5 md:grid-cols-2">
      {hasGenre && (
        <div className="song-card song-reveal" style={{ '--song-index': 7 } as React.CSSProperties}>
          <p className="song-eyebrow">Genre</p>
          <div className="flex flex-wrap gap-2">
            {genre.map((g, i) => (
              <span key={i} className="song-chip">
                {g}
              </span>
            ))}
          </div>
        </div>
      )}
      {hasSources && (
        <div className="song-card song-reveal" style={{ '--song-index': 8 } as React.CSSProperties}>
          <p className="song-eyebrow">Sources</p>
          <div className="flex flex-wrap gap-2">
            {sources.map((source, i) => {
              const href = safeUrl(source.url);
              if (!href) return null;
              return (
                <a
                  key={i}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="song-chip transition-colors"
                >
                  {source.label}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default GenreSourcesFooter;
