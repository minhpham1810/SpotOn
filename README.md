
# SpotOn - Music Discovery App 🎵

## Overview

SpotOn is a **React-based** web application that allows users to **search for songs**, **view song details**, and **listen to previews** using the **Spotify API**. Users can browse songs, view detailed information, and save tracks to their playlist.

## Features

* **Search Songs** – Enter a song name in the search bar and fetch results from Spotify.
* **Song Details Page** – Click on a song to view its details, including:
  * Song name
  * Album
  * Genre
  * Cover Art
  * Artist
  * Song Credits
  * Music Preview
* **Play & Pause Music** – Embedded music player to play 30-second previews from Spotify.
* **Save to Album** – Allows users to store favorite songs.
* **Navigation** – Easily return to the homepage for further searches.

## Tech Stack

* **Frontend:** React.js, React Router, CSS Modules
* **API:** Spotify Web API
* **State Management:** useState, useEffect, useRef

## Setup & Installation

### 1️⃣ Clone the Repository

```
 git clone https://github.com/yourusername/spoton.git
 cd spoton
```

### 2️⃣ Install Dependencies

```
npm install
```

### 3️⃣ Set Up Spotify API Credentials

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create an app and get **Client ID** and **Client Secret**.
3. Add them to an `<span>.env</span>` file in the root directory:

```
REACT_APP_SPOTIFY_CLIENT_ID=your_client_id
REACT_APP_SPOTIFY_CLIENT_SECRET=your_client_secret
```

### 4️⃣ Start the Application

```
npm start
```



## How It Works

1. **Search for a song** → The app fetches results from the Spotify API.
2. **Click on a song** → Redirects to a detailed song page.
3. **Play the song preview** → Users can listen to the 30-second sample.
4. **Navigate back** → The search bar remains available for further searches.

## Future Improvements 

*  User authentication for personalized playlists.
* Full song playback using OAuth and Spotify Premium.
* Improved UI with animations and theming.
