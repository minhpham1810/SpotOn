import type { SongInfo, SongInfoAudioFeatures } from '../../src/types/song-info';

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
  label: string;
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
  apiKey: string;
  maxRounds?: number;
  onStep?: (event: AgentStepEvent) => void;
  spotifyAudioFeatures?: Omit<SongInfoAudioFeatures, 'source'> | null;
}

const DEFAULT_MAX_ROUNDS = 6;
// Any OpenAI-compatible chat completions API works; defaults to Gemini's compatibility endpoint.
const LLM_BASE_URL = (process.env.LLM_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai').replace(/\/+$/, '');
// flash-lite: on the free tier gemini-3.8-flash took ~100s per call and returned 503s (measured 2026-11-01).
const LLM_MODEL = process.env.LLM_MODEL || 'gemini-3.5-flash-lite';
const WEB_SEARCH_TOOL_NAME = 'web_search';
const MAX_WEB_SEARCH_CALLS = 2;

function buildReportInstructions(needsAudioFeaturesEstimate: boolean): string {
  const audioFeaturesSchemaLine = needsAudioFeaturesEstimate
    ? `\n  "audioFeatures": { "tempo": 0, "key": "...", "danceability": 0.0, "energy": 0.0, "valence": 0.0, "acousticness": 0.0, "instrumentalness": 0.0 },`
    : '';
  const audioFeaturesGuidance = needsAudioFeaturesEstimate
    ? `\n\n"audioFeatures" is your own estimate — Spotify's measured audio data wasn't available for this track. Give your best-judgment values: "tempo" in BPM, "key" as e.g. "C# Minor", and the rest on a 0-1 scale ("danceability", "energy", "valence", "acousticness", "instrumentalness"). Base it on the song's actual character, not generic genre defaults.`
    : '';

  return `When you have gathered enough information, respond with ONLY a JSON object (no markdown fences, no extra text) in this exact structure:
{
  "emotionalFingerprint": { "arc": ["...", "...", "..."], "signatureMove": "...", "reachForThisWhen": "..." },
  "summary": "4-5 sentence narrative capturing the song's essence, emotional impact, and cultural significance",
  "musicalAnalysis": { "mood": "...", "keyElements": ["..."], "soundscape": "..." },
  "sonicRead": "one sentence describing the song's sonic texture/production",${audioFeaturesSchemaLine}
  "genre": ["..."],
  "culturalContext": { "era": "...", "influence": "...", "connections": ["..."] },
  "credits": [{ "name": "...", "role": "...", "knownFor": "..." }],
  "findings": [{ "text": "...", "confidence": "verified" | "inferred" | "speculative", "source": { "label": "...", "url": "..." } | null }],
  "sources": [{ "label": "...", "url": "..." }]
}
Populate "sources" using the URLs and provider names (e.g. "Genius", the web page's site name) that appeared in tool results you actually used. If you have no grounded sources, return an empty array.

For each finding in "findings", classify its confidence: "verified" if a tool result directly stated it, "inferred" if it's a reasonable synthesis of two or more grounded facts, "speculative" if it's your own musical/critical judgment with no direct source. Every "verified" and "inferred" finding must carry a real "source" from a tool result you used; "speculative" findings must set "source" to null — never fabricate a URL.

"emotionalFingerprint" is interpretive, not descriptive — do not restate what the song is about (that's "summary"'s job). Instead:
- "arc": 3-4 short beats describing how the feeling shifts as the song moves from start to end (e.g. guarded → building → open).
- "signatureMove": name ONE specific musical or lyrical choice (not a vibe) responsible for the song's emotional effect — a vocal break, a delayed chorus, an unresolved chord, a repeated line landing differently the second time.
- "reachForThisWhen": one sentence framing a moment or feeling this song answers, not a genre or activity tag.${audioFeaturesGuidance}`;
}

interface ChatToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ChatToolCall[];
  tool_call_id?: string;
}

async function callLlm(
  apiKey: string,
  messages: ChatMessage[],
  tools: AgentTool[],
  retryCount = 0
): Promise<{ message: ChatMessage }> {
  const body: Record<string, unknown> = {
    model: LLM_MODEL,
    messages,
    temperature: 0.7,
  };

  if (tools.length > 0) {
    body.tools = tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    // 429 = rate limited, 503 = provider overloaded; both are transient.
    if ((response.status === 429 || response.status === 503) && retryCount < 2) {
      const retryAfter = parseInt(response.headers.get('retry-after') || '10', 10) * 1000;
      await new Promise((resolve) => setTimeout(resolve, retryAfter));
      return callLlm(apiKey, messages, tools, retryCount + 1);
    }
    const body = await response.json().catch(() => ({}));
    // Gemini wraps errors in an array: [{ error: { message } }].
    const err = Array.isArray(body) ? body[0] : body;
    throw new Error(err?.error?.message || `LLM API error: ${response.status}`);
  }

  const data = await response.json();
  return { message: data.choices[0].message };
}

const ESTIMATED_AUDIO_FEATURE_AXES = ['danceability', 'energy', 'valence', 'acousticness', 'instrumentalness'] as const;

function isValidEstimatedAudioFeatures(candidate: Record<string, unknown>): boolean {
  if (typeof candidate.tempo !== 'number' || !Number.isFinite(candidate.tempo)) return false;
  return ESTIMATED_AUDIO_FEATURE_AXES.every((axis) => Number.isFinite(candidate[axis]));
}

function parseFinalReport(
  content: string,
  spotifyAudioFeatures?: Omit<SongInfoAudioFeatures, 'source'> | null
): SongInfo {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?/, '')
    .replace(/```$/, '')
    .trim();
  const parsed = JSON.parse(cleaned);

  let audioFeatures: SongInfoAudioFeatures | undefined;
  if (spotifyAudioFeatures) {
    audioFeatures = { ...spotifyAudioFeatures, source: 'spotify' };
  } else if (spotifyAudioFeatures === null && parsed.audioFeatures && isValidEstimatedAudioFeatures(parsed.audioFeatures)) {
    audioFeatures = { ...parsed.audioFeatures, source: 'estimated' };
  }

  return {
    emotionalFingerprint: parsed.emotionalFingerprint,
    summary: parsed.summary,
    musicalAnalysis: parsed.musicalAnalysis,
    sonicRead: parsed.sonicRead ?? '',
    audioFeatures,
    genre: parsed.genre ?? [],
    culturalContext: parsed.culturalContext,
    credits: parsed.credits ?? [],
    findings: parsed.findings ?? [],
    sources: parsed.sources ?? [],
  };
}

export async function runResearchAgent(options: RunResearchAgentOptions): Promise<SongInfo> {
  const { track, tools, apiKey, onStep } = options;
  const maxRounds = options.maxRounds ?? DEFAULT_MAX_ROUNDS;
  const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));
  let webSearchCalls = 0;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are a music research agent. Use the available tools to gather grounded facts about the given song before writing your report. Call at most a couple of tools — enough to ground your claims, not exhaustively. ' +
        buildReportInstructions(options.spotifyAudioFeatures === null),
    },
    {
      role: 'user',
      content: `Research the song "${track.name}" by ${track.artist}${
        track.album ? ` from the album "${track.album}"` : ''
      }.`,
    },
  ];

  for (let round = 0; round < maxRounds; round++) {
    const { message } = await callLlm(apiKey, messages, tools);
    // Echo the assistant message back unchanged: Gemini attaches provider fields (e.g. thought signatures) to it.
    messages.push(message);

    // Decide on tool_calls, not finish_reason: OpenAI-compatible providers disagree on finish_reason for tool turns.
    if (!message.tool_calls?.length) {
      if (!message.content) {
        throw new Error('The LLM returned an empty final response');
      }
      return parseFinalReport(message.content, options.spotifyAudioFeatures);
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

      onStep?.({ tool: tool.name, status: `${tool.label}...` });

      let result: string;
      if (tool.name === WEB_SEARCH_TOOL_NAME && webSearchCalls >= MAX_WEB_SEARCH_CALLS) {
        result = `web_search budget exhausted for this report (max ${MAX_WEB_SEARCH_CALLS} calls) — use your other tools or finalize your report.`;
      } else {
        try {
          if (tool.name === WEB_SEARCH_TOOL_NAME) {
            webSearchCalls++;
          }
          const args = JSON.parse(toolCall.function.arguments || '{}');
          result = await tool.execute(args);
        } catch (error) {
          result = `Tool "${tool.name}" failed: ${error instanceof Error ? error.message : String(error)}`;
        }
      }

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result,
      });
    }
  }

  const { message } = await callLlm(
    apiKey,
    [...messages, { role: 'user', content: 'Stop researching now and respond with the final JSON report only.' }],
    []
  );

  if (!message.content) {
    throw new Error('The LLM returned an empty final response after round cap');
  }
  return parseFinalReport(message.content, options.spotifyAudioFeatures);
}
