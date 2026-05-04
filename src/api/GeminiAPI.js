const GeminiAPI = {
  getApiKey() {
    return process.env.REACT_APP_GROQ_API_KEY || null;
  },

  async generateSongInfo({ name, artist, album }, retryCount = 0) {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error("Groq API key is not configured");

    const prompt = `As a passionate music historian and critic with deep expertise in musical analysis, provide an engaging deep-dive into "${name}" by ${artist} from the album "${
      album || "Unknown"
    }". Respond only with a JSON object in this exact structure:

{
  "summary": "4-5 sentence narrative capturing the song's essence, emotional impact, and cultural significance",
  "musicalAnalysis": {
    "mood": "2-3 evocative adjectives describing the emotional atmosphere",
    "keyElements": ["3-4 standout musical elements"],
    "soundscape": "One sentence describing the overall sonic texture and production style"
  },
  "genre": ["primary genre", "secondary genre"],
  "culturalContext": {
    "era": "musical era and cultural moment",
    "influence": "brief description of cultural impact",
    "connections": ["2-3 similar songs or artists"]
  },
  "credits": [
    {
      "name": "contributor name",
      "role": "their specific role",
      "knownFor": "notable fact about their career"
    }
  ],
  "highlights": ["3-4 most memorable aspects of the song"]
}`;

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 429 && retryCount < 2) {
          const retryAfter = parseInt(response.headers.get("retry-after") || "10") * 1000;
          console.log(`Rate limited. Retrying in ${retryAfter / 1000}s...`);
          await new Promise((res) => setTimeout(res, retryAfter));
          return this.generateSongInfo({ name, artist, album }, retryCount + 1);
        }
        throw new Error(err.error?.message || `Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const songInfo = JSON.parse(data.choices[0].message.content);
      return songInfo;
    } catch (error) {
      console.error("Error generating summary:", error);
      if (error.message?.includes("429")) {
        return "Groq API quota exceeded. Please wait a moment and try again.";
      }
      return `Unable to generate song summary: ${error.message}`;
    }
  },
};

export default GeminiAPI;
