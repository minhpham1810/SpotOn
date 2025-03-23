import React, { useState, useCallback, useRef } from 'react';
import { debounce } from 'lodash';
import styles from './SearchBar.module.css';

const SearchBar = ({ onSearch }) => {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [recentSearches, setRecentSearches] = useState(() => {
        const saved = localStorage.getItem('recentSearches');
        return saved ? JSON.parse(saved) : [];
    });

    // Debounced search function
    const debouncedSearch = useCallback(
        debounce(async (searchQuery) => {
            if (searchQuery.trim()) {
                setIsLoading(true);
                try {
                    await onSearch(searchQuery);
                    // Add to recent searches
                    const updatedSearches = [
                        searchQuery,
                        ...recentSearches.filter(s => s !== searchQuery)
                    ].slice(0, 5);
                    setRecentSearches(updatedSearches);
                    localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
                } catch (error) {
                    console.error('Search error:', error);
                }
                setIsLoading(false);
            }
        }, 500),
        [onSearch, recentSearches]
    );

    const handleInputChange = (e) => {
        const value = e.target.value;
        setQuery(value);
        debouncedSearch(value);
    };

    const handleRecentSearch = (searchQuery) => {
        setQuery(searchQuery);
        onSearch(searchQuery);
    };

    return (
        <div className={styles.SearchBar}>
            <div className={styles.SearchContainer}>
                <input
                    type="text"
                    className={styles.SearchInput}
                    placeholder="Search for songs..."
                    value={query}
                    onChange={handleInputChange}
                />
                <span className={styles.SearchIcon}>🔍</span>
                {isLoading && <div className={styles.Loading} />}
            </div>

            {recentSearches.length > 0 && !query && (
                <div className={styles.RecentSearches}>
                    <h3>Recent Searches</h3>
                    <div>
                        {recentSearches.map((search, index) => (
                            <button
                                key={index}
                                className={styles.RecentSearch}
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