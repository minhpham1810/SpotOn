# SpotOn - AI Music Companion 🎵

## Why SpotOn?

Finding new music is easy. *Finding music that resonates with you*—your mood, your vibe, your story—isn't.  
**SpotOn** tackles this real-world challenge by blending AI intelligence with Spotify’s massive music catalog, offering a smarter, more personal way to discover, explore, and save songs.

Whether you're a casual listener, a playlist perfectionist, or a curious music nerd, SpotOn gives you more than just track info—it helps you understand the song behind the sound.

## Features

- 🔍 **Search Songs** – Enter a song name in the search bar and fetch results from Spotify.
- 📄 **Song Details Page** – Click on a song to view its details, including:
  - Song name
  - Album
  - Genre
  - Cover Art
  - Artist
  - Song Credits
- 💾 **Save to Album** – Save your favorite songs to a personal album. Great for revisiting tracks or building themed playlists.
- 🤖 **AI-Generated Summaries** – SpotOn uses Google Gemini to generate insightful song descriptions tailored from metadata—offering context, themes, and mood that help you connect with the music on a deeper level.
- 🧭 **Navigation** – Easily return to the homepage for further searches.

## Tech Stack

### Frontend

- React.js
- React Router
- CSS Modules

### Backend

- Node.js

### APIs

- Spotify Web API
- Google Gemini API

### State Management

- React Hooks: `useState`, `useEffect`, `useRef`

---

## Backend Overview

The backend acts as a secure middleware between the frontend and third-party APIs. It handles authentication, token management, and Gemini AI integration.

### Key Responsibilities

- 🎫 **Spotify Token Handling** – Exchanges client credentials for access tokens.
- 🔐 **API Security** – Hides sensitive API keys and secrets.
- 🤖 **Gemini Summary Endpoint** – Receives song metadata and returns AI-generated summaries.
- 🔗 **CORS & Routing** – Enables communication between client and server.

---

## Setup & Installation

### 1️⃣ Clone the Repository

```
git clone https://github.com/yourusername/spoton.git  
cd SpotOn
```

### 2️⃣ Install Dependencies

```
npm install
```

### 3️⃣ Set Up API Credentials

Create a .env file in the directory:

```
REACT_APP_SPOTIFY_CLIENT_ID=your_spotify_client_id  
REACT_APP_SPOTIFY_CLIENT_SECRET=your_spotify_client_secret  
REACT_APP_GEMINI_API_KEY=your_gemini_api_key
```

### 4️⃣ Start the Application

```
npm start
```

How It Works

1. Search for a song → Frontend sends request to backend, which queries Spotify API.
2. Click on a song → Redirects to a detailed page showing song info.
3. AI-generated summary → Backend sends song metadata to Gemini and returns a tailored description.
4. Save to album → Users can save favorite songs locally (database optional).

Future Improvements

🔊 Full song playback via Spotify Premium OAuth

🎨 UI enhancements with animations and theming

💬 User reviews and comments on songs

☁️ Persistent playlist storage via MongoDB or PostgreSQL
