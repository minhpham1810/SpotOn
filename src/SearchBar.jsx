import React, { useState, useCallback } from "react";
import { debounce } from "lodash";

const SearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    const saved = localStorage.getItem("recentSearches");
    return saved ? JSON.parse(saved) : [];
  });

  // Update recent searches with function updater pattern
  const updateRecentSearches = useCallback((searchQuery) => {
    setRecentSearches((prevSearches) => {
      const updatedSearches = [
        searchQuery,
        ...prevSearches.filter((s) => s !== searchQuery),
      ].slice(0, 5);
      localStorage.setItem("recentSearches", JSON.stringify(updatedSearches));
      return updatedSearches;
    });
  }, []);

  // Create debounced search function
  const debouncedSearch = useCallback(
    async (searchQuery) => {
      if (searchQuery.trim()) {
        setIsLoading(true);
        try {
          await onSearch(searchQuery);
        } catch (error) {
          console.error("Search error:", error);
        }
        setIsLoading(false);
      }
    },
    [onSearch, updateRecentSearches]
  );

  // Memoize the debounced version
  const debouncedSearchHandler = debounce(debouncedSearch, 500);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearchHandler(value);
  };

  const handleRecentSearch = (searchQuery) => {
    setQuery(searchQuery);
    onSearch(searchQuery);
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && query.trim()) {
      onSearch(query);
      updateRecentSearches(query);
    }
  };
  return (
    <div className="max-w-[700px] mx-auto px-4 md:px-4 relative">
      <div className="relative flex items-center">
        <input
          type="text"
          className="w-full py-5 px-12 md:px-14 border-2 border-white/10 rounded-full
                             bg-white/5 text-white text-lg backdrop-blur-md transition-all duration-normal
                             focus:outline-none focus:border-primary focus:bg-white/10
                             focus:shadow-[0_0_32px_rgba(29,185,84,0.15)]
                             hover:border-white/20 hover:bg-white/[0.07]
                             placeholder:text-white/30 placeholder:transition-colors
                             focus:placeholder:text-white/50
                             md:text-base md:py-4
                             animate-[fadeIn_0.3s_ease-out]"
          placeholder="Search for songs..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
        <span
          className="absolute left-5 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none
                                transition-all duration-normal group-focus-within:text-primary md:left-4
                                transform group-focus-within:scale-110"
        >
          🔍
        </span>
        {isLoading && (
          <div
            className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 
                                  border-2 border-white/10 border-t-primary rounded-full 
                                  animate-spin md:right-4"
          ></div>
        )}
      </div>

      {recentSearches.length > 0 && !query && (
        <div className="mt-4 text-left px-4">
          <h3 className="text-white/60 text-sm mb-2">Recent Searches</h3>
          <div>
            {recentSearches.map((search, index) => (
              <button
                key={index}
                className="inline-flex items-center m-1 px-4 py-2 bg-white/10
                                          rounded-full text-white text-sm cursor-pointer
                                          transition-all duration-fast hover:bg-white/20
                                          hover:-translate-y-0.5 hover:shadow-lg
                                          hover:shadow-primary/10 hover:border-primary/30
                                          active:translate-y-0 active:shadow-md
                                          border border-transparent"
                onClick={() => handleRecentSearch(search)}
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
