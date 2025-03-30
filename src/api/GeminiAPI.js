import { GoogleGenerativeAI } from "@google/generative-ai";

const GeminiAPI = {
    getApiKey() {
        const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
        if (!apiKey) {
            console.error('REACT_APP_GEMINI_API_KEY is not set in environment');
            return null;
        }
        return apiKey;
    },

    async generateSongInfo({ name, artist, album }) {
        try {
            console.log('Generating summary for:', name, 'by', artist);
            const apiKey = this.getApiKey();

            if (!apiKey) {
                throw new Error('Gemini API key is not configured');
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-pro-exp-02-05" });

            const prompt =
`You're an AI music expert helping users explore the deeper context of songs.
For the song "${name}" by ${artist} from the album "${album || 'Unknown'}", provide the following information in JSON format:

{
  "summary": "A concise 5-7 sentence overview highlighting the song’s theme, message, and any notable cultural or critical impact.",
  "genre": ["List of primary and secondary music genres"],
  "credits": [
    {
      "name": "Name of contributor",
      "role": "Their role (e.g., songwriter, producer, featured artist)"
    }
  ]
}

Focus on accuracy and be specific about genres and roles. Include at least the primary artist and any key contributors.`;

            console.log('Making request to Gemini API...');
            
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            
            // Extract JSON from the response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Failed to parse Gemini API response');
            }

            const songInfo = JSON.parse(jsonMatch[0]);
            console.log('Generated song info:', songInfo);
            return songInfo;

        } catch (error) {
            console.error('Error generating summary:', error);
            return `Unable to generate song summary: ${error.message}`;
        }
    }
};

export default GeminiAPI;