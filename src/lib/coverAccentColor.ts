export interface CoverAccent {
  accent: string;
  foreground: string;
  glow: string;
  chip: string;
  border: string;
}

const FALLBACK: CoverAccent = {
  accent: '#1DB954',
  foreground: '#0d0c0e',
  glow: 'rgba(29,185,84,0.4)',
  chip: 'rgba(29,185,84,0.12)',
  border: 'rgba(29,185,84,0.25)',
};

interface Rgb {
  r: number;
  g: number;
  b: number;
}

const PAGE_BACKGROUND: Rgb = { r: 13, g: 12, b: 14 };
const LIGHT_FOREGROUND: Rgb = { r: 255, g: 255, b: 255 };
const DARK_FOREGROUND: Rgb = PAGE_BACKGROUND;
const MIN_UI_CONTRAST = 4.5;

function solidColor({ r, g, b }: Rgb): string {
  return `rgb(${r}, ${g}, ${b})`;
}

function parseSolidColor(color: string): Rgb | null {
  const hex = color.match(/^#([\da-f]{6})$/i);
  if (hex) {
    return {
      r: Number.parseInt(hex[1].slice(0, 2), 16),
      g: Number.parseInt(hex[1].slice(2, 4), 16),
      b: Number.parseInt(hex[1].slice(4, 6), 16),
    };
  }
  const rgb = color.match(/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/i);
  return rgb ? { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) } : null;
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function rgbContrast(first: Rgb, second: Rgb): number {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

export function contrastRatio(first: string, second: string): number {
  const firstRgb = parseSolidColor(first);
  const secondRgb = parseSolidColor(second);
  return firstRgb && secondRgb ? rgbContrast(firstRgb, secondRgb) : 0;
}

function ensureUiContrast(color: Rgb): Rgb {
  if (rgbContrast(color, PAGE_BACKGROUND) >= MIN_UI_CONTRAST) return color;

  for (let step = 1; step <= 100; step += 1) {
    const amount = step / 100;
    const candidate = {
      r: Math.round(color.r + (255 - color.r) * amount),
      g: Math.round(color.g + (255 - color.g) * amount),
      b: Math.round(color.b + (255 - color.b) * amount),
    };
    if (rgbContrast(candidate, PAGE_BACKGROUND) >= MIN_UI_CONTRAST) return candidate;
  }
  return LIGHT_FOREGROUND;
}

function buildAccent(raw: Rgb, readable: Rgb): CoverAccent {
  const darkContrast = rgbContrast(readable, DARK_FOREGROUND);
  const lightContrast = rgbContrast(readable, LIGHT_FOREGROUND);
  const foreground = darkContrast >= lightContrast ? DARK_FOREGROUND : LIGHT_FOREGROUND;
  return {
    accent: solidColor(readable),
    foreground: solidColor(foreground),
    glow: `rgba(${raw.r}, ${raw.g}, ${raw.b}, 0.4)`,
    chip: `rgba(${readable.r}, ${readable.g}, ${readable.b}, 0.12)`,
    border: `rgba(${readable.r}, ${readable.g}, ${readable.b}, 0.25)`,
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h /= 6;
  }

  return { h, s, l };
}

function hueToRgb(p: number, q: number, t: number): number {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hueToRgb(p, q, h + 1 / 3);
  const g = hueToRgb(p, q, h);
  const b = hueToRgb(p, q, h - 1 / 3);

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

const MIN_LIGHTNESS = 0.45;
const MAX_LIGHTNESS = 0.72;
const MIN_SATURATION = 0.35;

function applyReadabilityFloor(r: number, g: number, b: number): { r: number; g: number; b: number } {
  const { h, s, l } = rgbToHsl(r, g, b);
  const clampedS = Math.max(MIN_SATURATION, s);
  const clampedL = Math.min(MAX_LIGHTNESS, Math.max(MIN_LIGHTNESS, l));
  return hslToRgb(h, clampedS, clampedL);
}

export async function extractCoverAccent(imageUrl: string): Promise<CoverAccent> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const loaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load cover image'));
    });
    img.src = imageUrl;
    await loaded;

    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return FALLBACK;

    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const pr = data[i];
      const pg = data[i + 1];
      const pb = data[i + 2];
      const pa = data[i + 3];
      if (pa < 128) continue;
      const max = Math.max(pr, pg, pb);
      const min = Math.min(pr, pg, pb);
      // Skip near-black, near-white, and low-saturation pixels so the accent isn't washed out.
      if (max < 30 || min > 225 || max - min < 15) continue;
      r += pr;
      g += pg;
      b += pb;
      count++;
    }

    if (count === 0) return FALLBACK;
    const raw = { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) };
    const floored = applyReadabilityFloor(raw.r, raw.g, raw.b);
    return buildAccent(raw, ensureUiContrast(floored));
  } catch {
    return FALLBACK;
  }
}
