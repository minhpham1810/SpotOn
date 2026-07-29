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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {hasGenre && (
        <div className="border-l-2 pl-5 py-1" style={{ borderColor: 'var(--song-border, rgba(29,185,84,0.3))' }}>
          <p
            className="m-0 mb-3"
            style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--song-accent, #1DB954)' }}
          >
            Genre
          </p>
          <div className="flex flex-wrap gap-2">
            {genre.map((g, i) => (
              <span
                key={i}
                className="text-xs px-3 py-1 rounded-full border"
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  color: 'var(--song-accent, #1DB954)',
                  borderColor: 'var(--song-border, rgba(29,185,84,0.25))',
                  background: 'var(--song-chip, rgba(29,185,84,0.12))',
                }}
              >
                {g}
              </span>
            ))}
          </div>
        </div>
      )}
      {hasSources && (
        <div className="border-l-2 pl-5 py-1" style={{ borderColor: 'var(--song-border, rgba(29,185,84,0.3))' }}>
          <p
            className="m-0 mb-3"
            style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--song-accent, #1DB954)' }}
          >
            Sources
          </p>
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
                  className="text-xs px-3 py-1 rounded-full border border-white/10 text-white/60 transition-colors"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
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
