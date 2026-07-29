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
    return buildAccent(Math.round(r / count), Math.round(g / count), Math.round(b / count));
  } catch {
    return FALLBACK;
  }
}
