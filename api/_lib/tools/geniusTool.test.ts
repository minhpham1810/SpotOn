import { describe, test, expect, vi, beforeEach } from 'vitest';
import { geniusLookup } from './geniusTool';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

test('geniusLookup returns the song description with its URL when found', async () => {
  const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
  mockFetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: {
          hits: [
            {
              result: {
                id: 123,
                title: 'Test Song',
                url: 'https://genius.com/test-song',
                primary_artist: { name: 'Test Artist' },
              },
            },
          ],
        },
      }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: { song: { description: { plain: 'A song about testing.' } } },
      }),
    });

  const result = await geniusLookup('Test Song', 'Test Artist', 'token');

  expect(result).toContain('https://genius.com/test-song');
  expect(result).toContain('A song about testing.');
});

test('geniusLookup returns a not-found message when there are no hits', async () => {
  const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ response: { hits: [] } }),
  });

  const result = await geniusLookup('Unknown Song', 'Unknown Artist', 'token');

  expect(result).toBe('No Genius page found for "Unknown Song" by Unknown Artist.');
});
