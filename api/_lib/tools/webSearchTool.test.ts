import { test, expect, vi, beforeEach } from 'vitest';
import { webSearch } from './webSearchTool';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

test('webSearch returns formatted results', async () => {
  const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      results: [
        { title: 'Review of Test Song', url: 'https://example.com/review', content: 'A glowing review.' },
      ],
    }),
  });

  const result = await webSearch('Test Song review', 'api-key');

  expect(result).toContain('Review of Test Song');
  expect(result).toContain('https://example.com/review');
  expect(result).toContain('A glowing review.');

  expect(mockFetch).toHaveBeenCalledWith(
    'https://api.tavily.com/search',
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer api-key' }),
    })
  );
  const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
  expect(requestBody.api_key).toBe('api-key');
});

test('webSearch reports when there are no results', async () => {
  const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) });

  const result = await webSearch('an extremely obscure query', 'api-key');

  expect(result).toBe('No web results found for "an extremely obscure query".');
});
