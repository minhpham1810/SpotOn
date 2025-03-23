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

    async generateSongSummary({ name, artist, album }) {
        try {
            console.log('Generating summary for:', name, 'by', artist);
            const apiKey = this.getApiKey();

            if (!apiKey) {
                throw new Error('Gemini API key is not configured');
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-pro-exp-02-05" });

            const prompt = 
`Generate a 2-3 sentence summary of the song "${name}" by ${artist} from the album "${album || 'Unknown'}".
Focus on key points:
- Musical style and genre
- Song's theme or message
- Cultural impact or significance
Keep the tone informative and engaging.`;

            console.log('Making request to Gemini API...');
            
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            
            console.log('Generated summary:', text.substring(0, 50) + '...');
            return text;

        } catch (error) {
            console.error('Error generating summary:', error);
            return `Unable to generate song summary: ${error.message}`;
        }
    }
};

export default GeminiAPI;