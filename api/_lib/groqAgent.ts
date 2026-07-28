import type { SongInfo } from '../../src/types/song-info';

export interface AgentTrack {
  name: string;
  artist: string;
  album?: string;
}

export interface AgentStepEvent {
  tool: string;
  status: string;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
  execute: (args: Record<string, string>) => Promise<string>;
}

export interface RunResearchAgentOptions {
  track: AgentTrack;
  tools: AgentTool[];
  groqApiKey: string;
  maxRounds?: number;
  onStep?: (event: AgentStepEvent) => void;
}

const DEFAULT_MAX_ROUNDS = 6;
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const REPORT_INSTRUCTIONS = `When you have gathered enough information, respond with ONLY a JSON object (no markdown fences, no extra text) in this exact structure:
{
  "summary": "4-5 sentence narrative capturing the song's essence, emotional impact, and cultural significance",
  "musicalAnalysis": { "mood": "...", "keyElements": ["..."], "soundscape": "..." },
  "genre": ["..."],
  "culturalContext": { "era": "...", "influence": "...", "connections": ["..."] },
  "credits": [{ "name": "...", "role": "...", "knownFor": "..." }],
  "highlights": ["..."],
  "sources": [{ "label": "...", "url": "..." }]
}
Populate "sources" using the URLs and provider names (e.g. "Genius", the web page's site name) that appeared in tool results you actually used. If you have no grounded sources, return an empty array.`;

interface GroqToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

interface GroqMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: GroqToolCall[];
  tool_call_id?: string;
}

async function callGroq(
  apiKey: string,
  messages: GroqMessage[],
  tools: AgentTool[],
  retryCount = 0
): Promise<{ message: GroqMessage; finishReason: string }> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      tools: tools.map((tool) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      })),
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    if (response.status === 429 && retryCount < 2) {
      const retryAfter = parseInt(response.headers.get('retry-after') || '10', 10) * 1000;
      await new Promise((resolve) => setTimeout(resolve, retryAfter));
      return callGroq(apiKey, messages, tools, retryCount + 1);
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Groq API error: ${response.status}`);
  }

  const data = await response.json();
  const choice = data.choices[0];
  return { message: choice.message, finishReason: choice.finish_reason };
}

function parseFinalReport(content: string): SongInfo {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?/, '')
    .replace(/```$/, '')
    .trim();
  const parsed = JSON.parse(cleaned);
  return {
    summary: parsed.summary,
    musicalAnalysis: parsed.musicalAnalysis,
    genre: parsed.genre ?? [],
    culturalContext: parsed.culturalContext,
    credits: parsed.credits ?? [],
    highlights: parsed.highlights ?? [],
    sources: parsed.sources ?? [],
  };
}

export async function runResearchAgent(options: RunResearchAgentOptions): Promise<SongInfo> {
  const { track, tools, groqApiKey, onStep } = options;
  const maxRounds = options.maxRounds ?? DEFAULT_MAX_ROUNDS;
  const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));

  const messages: GroqMessage[] = [
    {
      role: 'system',
      content:
        'You are a music research agent. Use the available tools to gather grounded facts about the given song before writing your report. Call at most a couple of tools — enough to ground your claims, not exhaustively. ' +
        REPORT_INSTRUCTIONS,
    },
    {
      role: 'user',
      content: `Research the song "${track.name}" by ${track.artist}${
        track.album ? ` from the album "${track.album}"` : ''
      }.`,
    },
  ];

  for (let round = 0; round < maxRounds; round++) {
    const { message, finishReason } = await callGroq(groqApiKey, messages, tools);
    messages.push(message);

    if (finishReason !== 'tool_calls' || !message.tool_calls?.length) {
      if (!message.content) {
        throw new Error('Groq returned an empty final response');
      }
      return parseFinalReport(message.content);
    }

    for (const toolCall of message.tool_calls) {
      const tool = toolsByName.get(toolCall.function.name);
      if (!tool) {
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: `Unknown tool: ${toolCall.function.name}`,
        });
        continue;
      }

      const args = JSON.parse(toolCall.function.arguments || '{}');
      onStep?.({ tool: tool.name, status: `Calling ${tool.name}...` });

      let result: string;
      try {
        result = await tool.execute(args);
      } catch (error) {
        result = `Tool "${tool.name}" failed: ${error instanceof Error ? error.message : String(error)}`;
      }

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result,
      });
    }
  }

  const { message } = await callGroq(
    groqApiKey,
    [...messages, { role: 'user', content: 'Stop researching now and respond with the final JSON report only.' }],
    []
  );

  if (!message.content) {
    throw new Error('Groq returned an empty final response after round cap');
  }
  return parseFinalReport(message.content);
}
