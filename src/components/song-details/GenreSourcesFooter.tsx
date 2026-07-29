import React from 'react';
import type { SongInfoSource } from '../../types/song-info';
import { safeUrl } from '../../lib/safeUrl';

interface GenreSourcesFooterProps {
  genre: string[];
  sources: SongInfoSource[];
}

const GenreSourcesFooter: React.FC<GenreSourcesFooterProps> = ({ genre, sources }) => {
  const validGenres = Array.isArray(genre)
    ? genre
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  const hasGenre = validGenres.length > 0;
  const validSources = Array.isArray(sources)
    ? sources.flatMap((source) => {
        if (!source || typeof source.label !== 'string' || typeof source.url !== 'string') return [];
        const href = safeUrl(source.url);
        const label = source.label.trim();
        return href && label ? [{ label, url: source.url, href }] : [];
      })
    : [];
  const hasSources = validSources.length > 0;
  const hasSingleSection = hasGenre !== hasSources;
  if (!hasGenre && !hasSources) return null;

  return (
    <div className="song-card--wide grid grid-cols-1 gap-5 lg:grid-cols-2">
      {hasGenre && (
        <article
          className={`song-card song-reveal${hasSingleSection ? ' song-card--wide' : ''}`}
          style={{ '--song-index': 7 } as React.CSSProperties}
          aria-labelledby="song-genre-heading"
        >
          <h2 id="song-genre-heading" className="song-eyebrow">Genre</h2>
          <div className="flex flex-wrap gap-2">
            {validGenres.map((g, i) => (
              <span key={i} className="song-chip">
                {g}
              </span>
            ))}
          </div>
        </article>
      )}
      {hasSources && (
        <article
          className={`song-card song-reveal${hasSingleSection ? ' song-card--wide' : ''}`}
          style={{ '--song-index': 8 } as React.CSSProperties}
          aria-labelledby="song-sources-heading"
        >
          <h2 id="song-sources-heading" className="song-eyebrow">Sources</h2>
          <div className="flex flex-wrap gap-2">
            {validSources.map((source, i) => (
              <a
                key={i}
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="song-chip"
              >
                {source.label}
              </a>
            ))}
          </div>
        </article>
      )}
    </div>
  );
};

export default GenreSourcesFooter;
