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
- **🤖 Deep Research Agent** – Uses a multi-step AI agent (Llama 3.3 70B) to search Spotify, Genius, and the live web before generating a cited report on song themes, artist background, cultural context, and related music
- **🧭 Intuitive Navigation** – Smooth transitions between views using React Router

---
https://github.com/user-attachments/assets/16891384-79aa-47c3-94ad-b066b5e50ccd
## 🛠 Tech Stack

### 🚀 Deployment

- **Vercel** – Full-stack deployment of the Vite frontend and serverless research agent

### 🧱 Frontend

- **React.js**
- **React Router**
- Tailwind CSS

### 🧠 AI & APIs

- **Spotify Web API**
- **Groq** (Llama 3.3 70B, tool-calling)
- **Genius API**
- **Tavily API**

### 🔐 Backend Architecture

- **Vercel deployment**: Includes the **Deep Research Agent Edge Function** (`api/research-song.ts`) that:
  - Runs the multi-step research agent (Llama 3.3 70B) with tool-calling
  - Manages server-only API credentials (Groq, Tavily, Genius, Spotify, Upstash Redis)
  - Searches Spotify, Genius, and the live web for song information
  - Returns a cited research report to the client

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

3. **To test the deep research agent locally**, use `vercel dev` instead of `npm run dev`. This runs both the Vite development server and the Vercel Edge Functions (where the research agent lives) alongside each other:
   ```
   vercel dev
   ```
   Set the server-only env vars (listed in `.env.example`'s comment — `GROQ_API_KEY`, `TAVILY_API_KEY`, `GENIUS_ACCESS_TOKEN`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) via `vercel env pull` or manually in the Vercel dashboard.

4. **For plain client-side testing** (without the research agent), start the dev server:
   ```
   npm run dev
   ```

> **Note for deployments (e.g. Vercel):** this project was migrated from Create React App to Vite, so env vars must use the `VITE_` prefix instead of the old `REACT_APP_` prefix. If your hosting dashboard still has `REACT_APP_SPOTIFY_CLIENT_ID` or `REACT_APP_SPOTIFY_REDIRECT_URI` configured, you must manually rename them to `VITE_SPOTIFY_CLIENT_ID` and `VITE_SPOTIFY_REDIRECT_URI` respectively in the dashboard — this cannot be changed from the codebase.

---

## 🚀 Deployment

SpotOn is deployed on **Vercel** for the full feature set (including the deep research agent). Configure the server-only environment variables in your Vercel project settings to enable the research agent.

---

## 🔮 Future Improvements

- 🔊 **Spotify Premium Playback** support
- 💬 **User reviews & social features**
- 🎨 **Advanced UI theming and animations**
- ☁️ **Persistent playlist storage** with MongoDB/PostgreSQL

---

Deployed and live on **AWS** 🚀
Explore the intersection of music and machine intelligence with SpotOn.
