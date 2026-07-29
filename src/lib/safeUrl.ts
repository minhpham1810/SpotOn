export function safeUrl(url: string): string | undefined {
  return /^https?:\/\//i.test(url) ? url : undefined;
}
