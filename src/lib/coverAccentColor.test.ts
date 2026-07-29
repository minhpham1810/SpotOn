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
