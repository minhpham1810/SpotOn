// App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import SearchBar from '../SearchBar/SearchBar';
import SearchResults from '../SearchResults/SearchResults';
import Playlist from '../Playlist/Playlist';
import SongDetails from '../SongDetails/SongDetails';
import styles from './App.module.css';
import SpotifyAPI from '../api/SpotifyAPI';

const App = () => {
    const [searchResults, setSearchResults] = useState([]);

    const searchSpotify = async (query) => {
        const results = await SpotifyAPI.searchTracks(query);
        setSearchResults(results);
    };

    return (
        <Router>
            <div className={styles.App}>
                <h1>SpotOn</h1>
                <SearchBar onSearch={searchSpotify} />
                <Routes>
                    <Route path="/" element={
                        <div className={styles.mainContainer}>
                            <SearchResults searchResults={searchResults} />
                            <Playlist />
                        </div>
                    } />
                    <Route path="/song/:id" element={<SongDetails />} />
                </Routes>
            </div>
        </Router>
    );
};

export default App;