import React from 'react';
import type { SongInfoAudioFeatures } from '../../types/song-info';

interface SonicFingerprintCardProps {
  sonicRead: string;
  audioFeatures?: SongInfoAudioFeatures;
}

type AudioFeatureKey = 'danceability' | 'energy' | 'valence' | 'acousticness' | 'instrumentalness';
type NormalizedFeatures = Record<AudioFeatureKey, number>;

const AXES: { key: AudioFeatureKey; label: string }[] = [
  { key: 'danceability', label: 'Dance' },
  { key: 'energy', label: 'Energy' },
  { key: 'valence', label: 'Valence' },
  { key: 'acousticness', label: 'Acoustic' },
  { key: 'instrumentalness', label: 'Instrumental' },
];

const CENTER = 100;
const MAX_RADIUS = 80;
const LABEL_RADIUS = 1.05;

function pointOnAxis(index: number, total: number, value: number): { x: number; y: number } {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  const radius = MAX_RADIUS * Math.max(0, Math.min(1.2, value));
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  };
}

function normalizeFeatures(audioFeatures: SongInfoAudioFeatures): NormalizedFeatures | null {
  const normalized = {} as NormalizedFeatures;

  for (const axis of AXES) {
    const value: unknown = audioFeatures[axis.key];
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    normalized[axis.key] = Math.max(0, Math.min(1, value));
  }

  return normalized;
}

const SonicFingerprintCard: React.FC<SonicFingerprintCardProps> = ({ sonicRead, audioFeatures }) => {
  if (!audioFeatures) return null;

  const normalizedFeatures = normalizeFeatures(audioFeatures);
  if (!normalizedFeatures) return null;

  const polygonPoints = AXES.map((axis, i) => {
    const p = pointOnAxis(i, AXES.length, normalizedFeatures[axis.key]);
    return `${p.x},${p.y}`;
  }).join(' ');
  const sourceLabel = audioFeatures.source === 'spotify' ? 'Spotify Audio Features' : 'AI Estimate';
  const chartAriaLabel = `Sonic fingerprint: ${AXES.map(
    (a) => `${a.label} ${Math.round(normalizedFeatures[a.key] * 100)}%`
  ).join(', ')}`;
  const featureMeters = [
    { label: 'Energy', value: normalizedFeatures.energy },
    { label: 'Valence', value: normalizedFeatures.valence },
    { label: 'Danceability', value: normalizedFeatures.danceability },
    { label: 'Acousticness', value: normalizedFeatures.acousticness },
    { label: 'Instrumentalness', value: normalizedFeatures.instrumentalness },
  ].map((feature) => ({
    ...feature,
    percent: Math.round(feature.value * 100),
  }));

  return (
    <article className="song-card song-card--wide song-reveal" style={{ '--song-index': 1 } as React.CSSProperties}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="song-eyebrow mb-0">Sonic Fingerprint</p>
        <span className="text-[0.625rem] uppercase tracking-[0.2em] text-white/35">{sourceLabel}</span>
      </div>
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[17rem_1fr] lg:gap-12">
        <svg viewBox="0 0 200 200" role="img" aria-label={chartAriaLabel} className="mx-auto w-full max-w-64">
          {[0.25, 0.5, 0.75, 1].map((ring) => (
            <polygon
              key={ring}
              points={AXES.map((_, i) => {
                const p = pointOnAxis(i, AXES.length, ring);
                return `${p.x},${p.y}`;
              }).join(' ')}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
            />
          ))}
          <polygon
            points={polygonPoints}
            fill="var(--song-chip)"
            stroke="var(--song-accent)"
            strokeWidth={2}
          />
          {AXES.map((axis, i) => {
            const p = pointOnAxis(i, AXES.length, LABEL_RADIUS);
            const textAnchor =
              p.x > CENTER + 0.5 ? 'end' : p.x < CENTER - 0.5 ? 'start' : 'middle';
            return (
              <text
                key={axis.key}
                x={p.x}
                y={p.y}
                fill="rgba(255,255,255,0.5)"
                fontSize="8"
                textAnchor={textAnchor}
                dominantBaseline="middle"
              >
                {axis.label}
              </text>
            );
          })}
        </svg>
        <div>
          <p className="max-w-[65ch] text-sm leading-relaxed text-white/70">{sonicRead}</p>
          <div className="mt-6 grid grid-cols-2 gap-px border-y border-white/[0.08] sm:grid-cols-5">
            {featureMeters.map((feature) => (
              <div
                key={feature.label}
                role="meter"
                aria-label={feature.label}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={feature.percent}
                className="px-3 py-4"
                style={{ '--feature-scale': feature.value } as React.CSSProperties}
              >
                <span className="text-[0.625rem] uppercase tracking-[0.16em] text-white/35">{feature.label}</span>
                <span className="mt-2 block font-syne text-lg text-white">{feature.percent}%</span>
                <span className="mt-2 block h-1 overflow-hidden rounded-full bg-white/[0.08]">
                  <span className="block h-full origin-left scale-x-[var(--feature-scale)] bg-[var(--song-accent)]" />
                </span>
              </div>
            ))}
          </div>
          <dl className="mt-6 grid grid-cols-2 divide-x divide-white/[0.08] border-y border-white/[0.08]">
            <div className="py-4 pr-5">
              <dt className="text-[0.625rem] uppercase tracking-[0.18em] text-white/35">Tempo</dt>
              <dd className="mt-1 font-syne text-xl font-bold text-white">
                {audioFeatures.tempo} <span className="text-xs font-normal text-white/40">BPM</span>
              </dd>
            </div>
            <div className="py-4 pl-5">
              <dt className="text-[0.625rem] uppercase tracking-[0.18em] text-white/35">Key</dt>
              <dd className="mt-1 font-syne text-xl font-bold text-white">{audioFeatures.key}</dd>
            </div>
          </dl>
        </div>
      </div>
    </article>
  );
};

export default SonicFingerprintCard;
