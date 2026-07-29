import { test, expect, vi, afterEach } from 'vitest';
import { extractCoverAccent } from './coverAccentColor';

const OriginalImage = global.Image;

afterEach(() => {
  global.Image = OriginalImage;
  vi.restoreAllMocks();
});

class LoadingImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  crossOrigin = '';
  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

class FailingImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  crossOrigin = '';
  set src(_value: string) {
    queueMicrotask(() => this.onerror?.());
  }
}

test('falls back to the default green when the canvas 2D context is unavailable', async () => {
  // @ts-expect-error test stub
  global.Image = LoadingImage;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

  const result = await extractCoverAccent('https://example.com/cover.jpg');

  expect(result.accent).toBe('#1DB954');
});

test('falls back to the default green when the image fails to load', async () => {
  // @ts-expect-error test stub
  global.Image = FailingImage;

  const result = await extractCoverAccent('https://example.com/bad.jpg');

  expect(result.accent).toBe('#1DB954');
});

test('extracts a dominant accent color from cover pixel data', async () => {
  // @ts-expect-error test stub
  global.Image = LoadingImage;

  const size = 32;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 200;
    data[i + 1] = 50;
    data[i + 2] = 50;
    data[i + 3] = 255;
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data })),
  } as unknown as CanvasRenderingContext2D);

  const result = await extractCoverAccent('https://example.com/cover.jpg');

  expect(result.accent).toBe('rgb(200, 50, 50)');
  expect(result.glow).toBe('rgba(200, 50, 50, 0.4)');
});

test('clamps a dark, borderline-desaturated cover color to a readable lightness floor', async () => {
  // @ts-expect-error test stub
  global.Image = LoadingImage;

  const size = 32;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < data.length; i += 4) {
    // rgb(70, 50, 55): max=70, min=50, diff=20 — passes the near-black/near-white/low-saturation
    // filters (max>=30, min<=225, max-min>=15), but its raw lightness (~0.235) is well below
    // the 0.45 readability floor.
    data[i] = 70;
    data[i + 1] = 50;
    data[i + 2] = 55;
    data[i + 3] = 255;
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data })),
  } as unknown as CanvasRenderingContext2D);

  const result = await extractCoverAccent('https://example.com/cover.jpg');

  const match = result.accent.match(/^rgb\((\d+), (\d+), (\d+)\)$/);
  expect(match).not.toBeNull();
  const [, r, g, b] = match!.map(Number);
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const lightness = (max + min) / 2;
  expect(lightness).toBeGreaterThanOrEqual(0.45);
  expect(lightness).toBeLessThanOrEqual(0.72);
});
