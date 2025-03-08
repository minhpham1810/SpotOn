// SearchBar.jsx
import React, { useState } from 'react';
import styles from './SearchBar.module.css';

const SearchBar = ({ onSearch }) => {
    const [query, setQuery] = useState('');

    const handleSearch = () => {
        if (query) {
            onSearch(query);
        }
    };

    return (
        <div className={styles.SearchBar}>
            <input type="text" placeholder="Enter a song name" value={query} onChange={(e) => setQuery(e.target.value)} />
            <button onClick={handleSearch}>Search</button>
        </div>
    );
};

export default SearchBar;