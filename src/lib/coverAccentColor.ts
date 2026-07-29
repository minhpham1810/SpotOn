export interface CoverAccent {
  accent: string;
  glow: string;
  chip: string;
  border: string;
}

const FALLBACK: CoverAccent = {
  accent: '#1DB954',
  glow: 'rgba(29,185,84,0.4)',
  chip: 'rgba(29,185,84,0.12)',
  border: 'rgba(29,185,84,0.25)',
};

function buildAccent(r: number, g: number, b: number): CoverAccent {
  return {
    accent: `rgb(${r}, ${g}, ${b})`,
    glow: `rgba(${r}, ${g}, ${b}, 0.4)`,
    chip: `rgba(${r}, ${g}, ${b}, 0.12)`,
    border: `rgba(${r}, ${g}, ${b}, 0.25)`,
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
    const avg = applyReadabilityFloor(Math.round(r / count), Math.round(g / count), Math.round(b / count));
    return buildAccent(avg.r, avg.g, avg.b);
  } catch {
    return FALLBACK;
  }
}
