// SearchResults.jsx
import React from 'react';
import Tracklist from '../Tracklist/Tracklist';
import styles from './SearchResults.module.css';

const SearchResults = ({ searchResults }) => {
    return (
        <div className={styles.SearchResults}>
            <h2>Search Results</h2>
            <Tracklist tracks={searchResults} />
        </div>
    );
};

export default SearchResults;