interface GeniusHit {
  result: {
    id: number;
    title: string;
    url: string;
    primary_artist: { name: string };
  };
}

export async function geniusLookup(
  trackName: string,
  artistName: string,
  accessToken: string
): Promise<string> {
  const searchResponse = await fetch(
    `https://api.genius.com/search?q=${encodeURIComponent(`${trackName} ${artistName}`)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!searchResponse.ok) {
    throw new Error(`Genius search failed: ${searchResponse.status}`);
  }
  const searchData = await searchResponse.json();
  const hit: GeniusHit | undefined = searchData.response?.hits?.[0];
  if (!hit) {
    return `No Genius page found for "${trackName}" by ${artistName}.`;
  }

  const songResponse = await fetch(`https://api.genius.com/songs/${hit.result.id}?text_format=plain`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!songResponse.ok) {
    return `Found "${hit.result.title}" by ${hit.result.primary_artist.name} on Genius (${hit.result.url}), but could not load its description.`;
  }
  const songData = await songResponse.json();
  const description: string =
    songData.response?.song?.description?.plain?.trim() || 'No description available.';

  return `Genius page for "${hit.result.title}" by ${hit.result.primary_artist.name} (${hit.result.url}): ${description}`;
}
