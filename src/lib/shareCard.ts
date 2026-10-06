import type { SongInfo } from '../types/song-info';
import type { TrackDetails } from '../types/spotify';
import type { CoverAccent } from './coverAccentColor';

const WIDTH = 1080;
const HEIGHT = 1920;
const MARGIN = 90;
const CONTENT_WIDTH = WIDTH - MARGIN * 2;
const BACKGROUND = '#0d0c0e';
const RADAR_KEYS = ['danceability', 'energy', 'valence', 'acousticness', 'instrumentalness'] as const;
const RADAR_LABELS = ['Dance', 'Energy', 'Valence', 'Acoustic', 'Instrumental'];

export function wrapLines(
  text: string,
  maxWidth: number,
  maxLines: number,
  measure: (value: string) => number
): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;

  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last && measure(`${last}…`) > maxWidth) last = last.slice(0, -1).trimEnd();
  kept[maxLines - 1] = `${last}…`;
  return kept;
}

function loadCover(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function renderShareCard(song: TrackDetails, info: SongInfo, accent: CoverAccent): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');

  const [cover] = await Promise.all([
    loadCover(song.cover),
    // Canvas silently falls back to sans-serif for weights the page has not used yet.
    Promise.all(
      ['800 10px Syne', '700 10px Syne', '400 10px "DM Sans"', '600 10px "DM Sans"'].map((font) =>
        document.fonts.load(font)
      )
    ).catch(() => undefined),
  ]);

  // Draws wrapped text with its top at `y` and returns the y below the last line.
  const drawText = (
    text: string,
    x: number,
    y: number,
    font: string,
    color: string,
    maxWidth: number,
    lineHeight: number,
    maxLines: number
  ): number => {
    ctx.font = font;
    ctx.fillStyle = color;
    const lines = wrapLines(text, maxWidth, maxLines, (value) => ctx.measureText(value).width);
    // fillText's maxWidth squeezes anything wrapping could not break (one very long word, unspaced scripts).
    lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight, maxWidth));
    return y + lines.length * lineHeight;
  };
  const drawEyebrow = (text: string, x: number, y: number, color = accent.accent): number => {
    ctx.letterSpacing = '6px';
    const next = drawText(text.toUpperCase(), x, y, '600 26px "DM Sans", sans-serif', color, CONTENT_WIDTH, 26, 1);
    ctx.letterSpacing = '0px';
    return next + 26;
  };

  ctx.textBaseline = 'top';
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (cover) {
    // Upscaling a 16px thumbnail blurs the cover without ctx.filter, which Safari lacks.
    const thumb = document.createElement('canvas');
    thumb.width = 16;
    thumb.height = 16;
    thumb.getContext('2d')?.drawImage(cover, 0, 0, 16, 16);
    ctx.drawImage(thumb, (WIDTH - HEIGHT) / 2, 0, HEIGHT, HEIGHT);
  }
  const shade = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  shade.addColorStop(0, 'rgba(13,12,14,0.62)');
  shade.addColorStop(1, 'rgba(13,12,14,0.92)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Wordmark
  ctx.font = '800 44px Syne, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('SPOT', MARGIN, 96);
  ctx.fillStyle = accent.accent;
  ctx.fillText('ON', MARGIN + ctx.measureText('SPOT').width, 96);

  // Cover, title, artist
  const coverSize = 300;
  const coverTop = 210;
  let textX = MARGIN;
  if (cover) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(MARGIN, coverTop, coverSize, coverSize, 28);
    ctx.clip();
    ctx.drawImage(cover, MARGIN, coverTop, coverSize, coverSize);
    ctx.restore();
    textX = MARGIN + coverSize + 50;
  }
  const titleWidth = WIDTH - MARGIN - textX;
  let y = drawText(song.name, textX, coverTop + 10, '800 48px Syne, sans-serif', '#ffffff', titleWidth, 56, 4);
  ctx.letterSpacing = '3px';
  drawText(
    song.artist.toUpperCase(),
    textX,
    y + 16,
    '400 28px "DM Sans", sans-serif',
    'rgba(255,255,255,0.65)',
    titleWidth,
    38,
    2
  );
  ctx.letterSpacing = '0px';

  // Headline
  const fingerprint = info.emotionalFingerprint;
  y = drawEyebrow(fingerprint ? 'Reach for this when' : 'About this song', MARGIN, 610);
  const headline = fingerprint?.reachForThisWhen || info.summary || info.sonicRead;
  const headlineMeasure = (size: number) => {
    ctx.font = `700 ${size}px Syne, sans-serif`;
    return wrapLines(headline, CONTENT_WIDTH, 99, (value) => ctx.measureText(value).width).length * size * 1.18;
  };
  const headlineSize = [76, 64, 54].find((size) => headlineMeasure(size) <= 460) ?? 46;
  y = drawText(
    headline,
    MARGIN,
    y,
    `700 ${headlineSize}px Syne, sans-serif`,
    '#ffffff',
    CONTENT_WIDTH,
    headlineSize * 1.18,
    Math.floor(460 / (headlineSize * 1.18))
  );

  if (fingerprint?.arc.length) {
    drawText(
      fingerprint.arc.join('  →  '),
      MARGIN,
      y + 30,
      '400 30px "DM Sans", sans-serif',
      accent.accent,
      CONTENT_WIDTH,
      42,
      3
    );
  }

  // Radar + finding
  const bottomTop = 1330;
  const features = info.audioFeatures;
  let findingX = MARGIN;
  if (features) {
    const cx = MARGIN + 250;
    const cy = bottomTop + 200;
    const radius = 150;
    const point = (index: number, value: number): [number, number] => {
      const angle = (Math.PI * 2 * index) / RADAR_KEYS.length - Math.PI / 2;
      return [cx + radius * value * Math.cos(angle), cy + radius * value * Math.sin(angle)];
    };
    const polygon = (valueAt: (index: number) => number) => {
      ctx.beginPath();
      RADAR_KEYS.forEach((_, index) => ctx.lineTo(...point(index, valueAt(index))));
      ctx.closePath();
    };
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    [0.33, 0.66, 1].forEach((ring) => {
      polygon(() => ring);
      ctx.stroke();
    });
    polygon((index) => Math.max(0.04, Math.min(1, Number(features[RADAR_KEYS[index]]) || 0)));
    ctx.fillStyle = accent.glow;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = accent.accent;
    ctx.stroke();

    ctx.font = '400 22px "DM Sans", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.textBaseline = 'middle';
    RADAR_LABELS.forEach((label, index) => {
      const [x, labelY] = point(index, 1.18);
      ctx.textAlign = Math.abs(x - cx) < 1 ? 'center' : x > cx ? 'left' : 'right';
      ctx.fillText(label, Math.abs(x - cx) < 1 ? x : x + (x > cx ? -14 : 14), labelY);
    });
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    findingX = MARGIN + 500;
  }

  const finding = info.findings.find((item) => item.confidence === 'verified') ?? info.findings[0];
  if (finding) {
    const findingWidth = WIDTH - MARGIN - findingX;
    ctx.letterSpacing = '6px';
    drawText('DID YOU KNOW', findingX, bottomTop + 10, '600 26px "DM Sans", sans-serif', accent.accent, findingWidth, 26, 1);
    ctx.letterSpacing = '0px';
    drawText(
      finding.text,
      findingX,
      bottomTop + 66,
      '400 32px "DM Sans", sans-serif',
      'rgba(255,255,255,0.85)',
      findingWidth,
      44,
      features ? 8 : 6
    );
  }

  // Footer
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(MARGIN, 1790, CONTENT_WIDTH, 2);
  const stats = [
    features && `${Math.round(features.tempo)} BPM`,
    features?.key,
    info.genre[0],
  ].filter(Boolean).join('  ·  ');
  ctx.letterSpacing = '3px';
  drawText(stats.toUpperCase(), MARGIN, 1822, '400 26px "DM Sans", sans-serif', 'rgba(255,255,255,0.6)', CONTENT_WIDTH, 26, 1);
  ctx.letterSpacing = '0px';

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not export the card'))), 'image/png');
  });
}

/** Opens the native share sheet where files can be shared, otherwise downloads the image. */
export async function shareOrDownload(blob: Blob, filename: string, title: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // Any other failure (e.g. the click's activation expired while rendering) falls through to a download.
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
