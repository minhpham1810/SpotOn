// OpenAI-compatible stand-in for the LLM during load tests: answers every
// chat completion with a final report (no tool calls) after MOCK_DELAY_MS.
// No real LLM, Tavily or Genius quota is used.
import { createServer } from 'node:http';

const delayMs = Number(process.env.MOCK_DELAY_MS ?? 3000);
const report = JSON.stringify({
  emotionalFingerprint: { arc: ['calm', 'swelling', 'still'], signatureMove: 'load-test fixture', reachForThisWhen: 'testing' },
  summary: 'Load-test fixture report.',
  musicalAnalysis: { mood: 'calm', keyElements: ['piano'], soundscape: 'sparse' },
  sonicRead: 'fixture',
  audioFeatures: { tempo: 60, key: 'D-flat Major', danceability: 0.1, energy: 0.1, valence: 0.3, acousticness: 0.9, instrumentalness: 0.9 },
  genre: ['classical'],
  culturalContext: { era: '1905', influence: 'fixture', connections: [] },
  credits: [],
  findings: [],
  sources: [],
});

let served = 0;
createServer((req, res) => {
  if (req.url === '/stats') return res.end(JSON.stringify({ served }));
  req.resume();
  req.on('end', () =>
    setTimeout(() => {
      served++;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: report }, finish_reason: 'stop' }] }));
    }, delayMs)
  );
}).listen(8081, () => console.log(`mock LLM on :8081, delay ${delayMs}ms`));
