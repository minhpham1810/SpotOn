interface TavilyResult {
  title: string;
  url: string;
  content: string;
}

export async function webSearch(query: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      // Tavily's current docs require the Authorization: Bearer header (set above).
      // api_key is also included in the body for backwards compatibility with older
      // Tavily API versions that only supported body-based auth.
      api_key: apiKey,
      query,
      search_depth: 'basic',
      max_results: 3,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily search failed: ${response.status}`);
  }

  const data = await response.json();
  const results: TavilyResult[] = data.results ?? [];
  if (results.length === 0) {
    return `No web results found for "${query}".`;
  }

  return results.map((r) => `${r.title} (${r.url}): ${r.content}`).join('\n\n');
}
