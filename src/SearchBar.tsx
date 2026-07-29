import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ClockCounterClockwise,
  MagnifyingGlass,
  SpinnerGap,
  X,
} from '@phosphor-icons/react';

interface SearchBarProps {
  onSearch: (query: string) => void | Promise<void>;
  isLoading?: boolean;
}

const getSavedSearches = (): string[] => {
  try {
    const saved = localStorage.getItem('recentSearches');
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string' && Boolean(value.trim())).slice(0, 5)
      : [];
  } catch {
    return [];
  }
};

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading = false }) => {
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(getSavedSearches);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingSearch = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  }, []);

  useEffect(() => clearPendingSearch, [clearPendingSearch]);

  const updateRecentSearches = useCallback((searchQuery: string) => {
    setRecentSearches((previous) => {
      const updated = [
        searchQuery,
        ...previous.filter((savedQuery) => savedQuery.toLocaleLowerCase() !== searchQuery.toLocaleLowerCase()),
      ].slice(0, 5);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const runSearch = useCallback((searchQuery: string, saveToHistory = false) => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      void onSearch('');
      return;
    }
    if (saveToHistory) updateRecentSearches(trimmedQuery);
    void onSearch(trimmedQuery);
  }, [onSearch, updateRecentSearches]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextQuery = event.target.value;
    setQuery(nextQuery);
    clearPendingSearch();

    if (!nextQuery.trim()) {
      runSearch('');
      return;
    }

    debounceTimer.current = setTimeout(() => {
      runSearch(nextQuery);
      debounceTimer.current = null;
    }, 500);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearPendingSearch();
    runSearch(query, true);
  };

  const handleRecentSearch = (searchQuery: string) => {
    clearPendingSearch();
    setQuery(searchQuery);
    runSearch(searchQuery, true);
  };

  const handleClear = () => {
    clearPendingSearch();
    setQuery('');
    runSearch('');
  };

  const clearHistory = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  return (
    <div className="search-composer">
      <form onSubmit={handleSubmit} role="search" className="space-y-3">
        <label htmlFor="catalog-search" className="search-eyebrow mb-0 block">
          Find a song
        </label>
        <div className="search-composer__field">
          <MagnifyingGlass size={21} weight="bold" aria-hidden="true" className="search-composer__icon" />
          <input
            id="catalog-search"
            type="search"
            className="search-composer__input"
            placeholder="Song, artist, or album"
            value={query}
            onChange={handleInputChange}
            aria-label="Search the Spotify catalog"
            aria-describedby="catalog-search-help"
            autoComplete="off"
          />
          {query && (
            <button type="button" onClick={handleClear} className="search-composer__clear" aria-label="Clear search">
              <X size={16} weight="bold" aria-hidden="true" />
            </button>
          )}
          <button type="submit" className="search-composer__submit" disabled={!query.trim() || isLoading}>
            {isLoading ? (
              <SpinnerGap size={18} weight="bold" aria-hidden="true" className="animate-spin" />
            ) : (
              <ArrowRight size={18} weight="bold" aria-hidden="true" />
            )}
            <span className="sr-only">{isLoading ? 'Searching' : 'Search'}</span>
          </button>
        </div>
        <p id="catalog-search-help" className="text-xs leading-relaxed text-white/35">
          Results update as you type. Press Enter to keep a search in your history.
        </p>
      </form>

      {recentSearches.length > 0 && !query && (
        <section aria-labelledby="recent-searches-heading" className="mt-7">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 id="recent-searches-heading" className="flex items-center gap-2 text-xs font-medium text-white/55">
              <ClockCounterClockwise size={15} weight="bold" aria-hidden="true" />
              Recent searches
            </h2>
            <button type="button" onClick={clearHistory} className="search-text-action min-h-8">
              Clear history
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search) => (
              <button
                key={search}
                type="button"
                className="search-chip"
                onClick={() => handleRecentSearch(search)}
              >
                {search}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default SearchBar;
