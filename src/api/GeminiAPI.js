import { GoogleGenerativeAI } from "@google/generative-ai";

const GeminiAPI = {
  getApiKey() {
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("REACT_APP_GEMINI_API_KEY is not set in environment");
      return null;
    }
    return apiKey;
  },

  async generateSongInfo({ name, artist, album }) {
    try {
      console.log("Generating summary for:", name, "by", artist);
      const apiKey = this.getApiKey();

      if (!apiKey) {
        throw new Error("Gemini API key is not configured");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const prompt = `As a passionate music historian and critic with deep expertise in musical analysis, provide an engaging deep-dive into "${name}" by ${artist} from the album "${
        album || "Unknown"
      }". Structure your response in this JSON format:

{
  "summary": "Write an engaging 4-5 sentence narrative that captures the song's essence, emotional impact, and cultural significance. Use vivid language and specific details to paint a picture of the song's unique character.",
  
  "musicalAnalysis": {
    "mood": "Describe the emotional atmosphere using 2-3 evocative adjectives",
    "keyElements": ["List 3-4 standout musical elements like memorable riffs, vocal harmonies, or production techniques"],
    "soundscape": "One sentence describing the overall sonic texture and production style"
  },
  
  "genre": ["List primary and secondary genres, including any innovative fusion elements"],
  
  "culturalContext": {
    "era": "Identify the musical era and cultural moment",
    "influence": "Briefly describe the song's impact on music or popular culture",
    "connections": ["List 2-3 songs or artists that share similar styles or themes"]
  },
  
  "credits": [
    {
      "name": "Name of contributor",
      "role": "Their specific role with additional context about their contribution",
      "knownFor": "A notable fact about this contributor's career or other significant work"
    }
  ],
  
  "highlights": ["List 3-4 most memorable or distinctive aspects of the song that make it stand out"]
}

Be bold and specific in your analysis. Focus on what makes this song unique and memorable. Include interesting details that would engage music enthusiasts while remaining accessible to casual listeners.`;

      console.log("Making request to Gemini API...");

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to parse Gemini API response");
      }

      const jsonString = jsonMatch[0];

      // Validate JSON before parsing
      try {
        const songInfo = JSON.parse(jsonString);
        console.log("Generated song info:", songInfo);
        return songInfo;
      } catch (jsonError) {
        console.error("Error parsing JSON:", jsonError);
        throw new Error(
          `Invalid JSON format in Gemini API response: ${jsonError.message}`
        );
      }
    } catch (error) {
      console.error("Error generating summary:", error);
      return `Unable to generate song summary: ${error.message}`;
    }
  },
};

export default GeminiAPI;
