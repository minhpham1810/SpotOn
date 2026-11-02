// Spotify no longer returns preview_url, so 30s clips come from the iTunes Search API (no key, CORS-enabled).
// ponytail: fuzzy artist+title match against the US store, so non-Latin titles and alternate versions can miss.
// Proxy Deezer's ISRC lookup through an Edge Function if misses matter.
const baseTitle = (title: string) => title.split(/ [-([]/)[0];
const matchKey = (text: string) =>
  baseTitle(text.toLowerCase()).normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, "");

export async function findSnippetUrl(artist: string, name: string): Promise<string | null> {
  try {
    const term = encodeURIComponent(`${artist} ${baseTitle(name)}`);
    const response = await fetch(
      `https://itunes.apple.com/search?media=music&entity=song&limit=10&term=${term}`,
      { signal: AbortSignal.timeout(2500) }
    );
    if (!response.ok) return null;

    const { results } = (await response.json()) as {
      results: { artistName?: string; trackName?: string; previewUrl?: string }[];
    };
    const wantedArtist = matchKey(artist);
    const wantedTitle = matchKey(name);
    const match = results.find((result) => {
      const resultArtist = matchKey(result.artistName ?? "");
      return result.previewUrl
        && matchKey(result.trackName ?? "") === wantedTitle
        && resultArtist !== ""
        && (resultArtist.includes(wantedArtist) || wantedArtist.includes(resultArtist));
    });
    return match?.previewUrl ?? null;
  } catch {
    return null;
  }
}
