import React from 'react';
import { ArrowClockwise, MagnifyingGlass, Waveform } from '@phosphor-icons/react';
import Track from './Track';
import { SpotifyTrack } from './types/spotify';

export type SearchStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

interface SearchResultsProps {
  searchResults: SpotifyTrack[];
  onAddTrack: (track: SpotifyTrack) => void;
  status: SearchStatus;
  query: string;
  error?: string | null;
  onRetry: () => void;
}

const SearchResultsSkeleton = () => (
  <div aria-label="Loading search results" role="status" className="divide-y divide-white/[0.07]">
    {Array.from({ length: 5 }, (_, index) => (
      <div key={index} className="grid grid-cols-[3.75rem_1fr_5rem] items-center gap-4 py-4">
        <div className="search-skeleton aspect-square rounded-xl" />
        <div className="space-y-2.5">
          <div className="search-skeleton h-3.5 w-2/3 rounded-full" />
          <div className="search-skeleton h-2.5 w-2/5 rounded-full" />
        </div>
        <div className="search-skeleton ml-auto h-9 w-20 rounded-full" />
      </div>
    ))}
    <span className="sr-only">Searching Spotify</span>
  </div>
);

const SearchResults: React.FC<SearchResultsProps> = ({
  searchResults,
  onAddTrack,
  status,
  query,
  error,
  onRetry,
}) => {
  const resultLabel = `${searchResults.length} ${searchResults.length === 1 ? 'track' : 'tracks'} found`;

  return (
    <section aria-labelledby="search-results-heading" className="search-results-panel">
      <div className="search-section-heading">
        <div>
          <p className="search-eyebrow">Spotify catalog</p>
          <h2 id="search-results-heading" className="font-syne text-2xl font-bold tracking-[-0.025em] text-white sm:text-3xl">
            {status === 'idle' ? 'Start with one song' : 'Search results'}
          </h2>
        </div>
        {status !== 'idle' && status !== 'loading' && (
          <p className="search-result-count" aria-live="polite">{resultLabel}</p>
        )}
      </div>

      <div className="min-h-[22rem]">
        {status === 'loading' ? (
          <SearchResultsSkeleton />
        ) : status === 'error' ? (
          <div className="search-empty-state" role="alert">
            <div className="search-empty-state__mark">
              <ArrowClockwise size={24} weight="bold" aria-hidden="true" />
            </div>
            <h3 className="font-syne text-xl font-bold text-white">Couldn’t search Spotify</h3>
            <p className="max-w-[38ch] text-sm leading-relaxed text-white/50">
              {error || 'The catalog did not respond. Your playlist is still here.'}
            </p>
            <button type="button" onClick={onRetry} className="search-secondary-action mt-2">
              <ArrowClockwise size={17} weight="bold" aria-hidden="true" />
              Try again
            </button>
          </div>
        ) : status === 'empty' ? (
          <div className="search-empty-state" role="status">
            <div className="search-empty-state__mark">
              <MagnifyingGlass size={25} weight="bold" aria-hidden="true" />
            </div>
            <h3 className="font-syne text-xl font-bold text-white">No close matches</h3>
            <p className="max-w-[38ch] text-sm leading-relaxed text-white/50">
              Nothing surfaced for “{query}”. Try the artist name, a shorter title, or another spelling.
            </p>
          </div>
        ) : status === 'idle' ? (
          <div className="search-empty-state search-empty-state--idle" role="status">
            <div className="search-empty-state__mark search-empty-state__mark--signal">
              <Waveform size={26} weight="bold" aria-hidden="true" />
            </div>
            <h3 className="font-syne text-xl font-bold text-white">A track is the beginning</h3>
            <p className="max-w-[42ch] text-sm leading-relaxed text-white/50">
              Search the catalog, preview a recording, then open its full report for credits, context, and musical fingerprints.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[0.6875rem] uppercase tracking-[0.15em] text-white/30">
              <span>Search</span>
              <span aria-hidden="true" className="text-primary">/</span>
              <span>Listen</span>
              <span aria-hidden="true" className="text-primary">/</span>
              <span>Research</span>
            </div>
          </div>
        ) : (
          <ol className="m-0 list-none divide-y divide-white/[0.07] p-0">
            {searchResults.map((track, index) => (
              <li
                key={track.id}
                className="search-result-reveal"
                style={{ '--search-index': index } as React.CSSProperties}
              >
                <Track track={track} onAdd={onAddTrack} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
};

export default SearchResults;
