# 🎶 SpotOn: AI-Powered Music Discovery

> **“Don’t just hear the music—connect with it.”**

## 🎯 Why SpotOn?

In today’s streaming era, finding music is easy. But finding music that **truly connects**—to your mood, your moment, your story—is something else.

**SpotOn** blends the power of AI and Spotify’s massive catalog to deliver **emotionally intelligent** song discovery. Whether you're building a vibe-based playlist, diving into new genres, or exploring an artist’s catalog, SpotOn makes the experience meaningful **even before you actually hear the song**.

No more generic recommendations. Just music that feels **SpotOn**.

---

## ✨ Features

- **📲 Spotify Login** – Authenticate with your own Spotify account for personalized access and song saving
- **🔍 Smart Song Search** – Enter a song name and get real-time Spotify results
- **📄 Song Details View** – Get rich song metadata, including:
  - Title
  - Album
  - Artist
  - Genre
  - Cover Art
  - Credits
- **💾 Save to Album** – Save tracks to your Spotify library directly
- **🤖 AI-Powered Summaries** – Uses **Google Gemini** to generate tailored descriptions of song themes, moods, and context
- **🧭 Intuitive Navigation** – Smooth transitions between views using React Router

---
https://github.com/user-attachments/assets/16891384-79aa-47c3-94ad-b066b5e50ccd
## 🛠 Tech Stack

### 🚀 Deployment

- **AWS Elastic Beanstalk** – Full-stack deployment of Dockerized application
- **Docker** – Containerized frontend with secure environment variable injection
- **GitHub Actions** – CI/CD workflow for automated build and deployment

### 🧱 Frontend

- **React.js**
- **React Router**
- Tailwind CSS

### 🧠 AI & APIs

- **Spotify Web API**
- **Google Gemini API**

### 🔐 Backend Architecture

*(Bundled within Docker container)*

- Handles Spotify token management
- Hides API keys from client
- Sends requests to Gemini API and returns AI summaries
- Manages CORS and routing

---

## 🧑‍💻 Local development

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in the values:
   ```
   cp .env.example .env
   ```
   - `VITE_SPOTIFY_CLIENT_ID` – your Spotify app's client ID
   - `VITE_SPOTIFY_REDIRECT_URI` – the OAuth redirect URI registered with your Spotify app (e.g. `http://127.0.0.1:3000`)
   - `VITE_GROQ_API_KEY` – your Groq API key
3. Start the dev server (runs on port 3000, matching the Spotify redirect URI logic):
   ```
   npm run dev
   ```

> **Note for deployments (e.g. Vercel):** this project was migrated from Create React App to Vite, so env vars must use the `VITE_` prefix instead of the old `REACT_APP_` prefix. If your hosting dashboard still has `REACT_APP_SPOTIFY_CLIENT_ID`, `REACT_APP_SPOTIFY_REDIRECT_URI`, or `REACT_APP_GEMINI_API_KEY` configured, you must manually rename them to `VITE_SPOTIFY_CLIENT_ID`, `VITE_SPOTIFY_REDIRECT_URI`, and `VITE_GROQ_API_KEY` respectively in the dashboard — this cannot be changed from the codebase.

---

## 🔮 Future Improvements

- 🔊 **Spotify Premium Playback** support
- 💬 **User reviews & social features**
- 🎨 **Advanced UI theming and animations**
- ☁️ **Persistent playlist storage** with MongoDB/PostgreSQL

---

Deployed and live on **AWS** 🚀
Explore the intersection of music and machine intelligence with SpotOn.
