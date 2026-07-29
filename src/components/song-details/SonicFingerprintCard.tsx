import React from 'react';
import type { SongInfoAudioFeatures } from '../../types/song-info';

interface SonicFingerprintCardProps {
  sonicRead: string;
  audioFeatures?: SongInfoAudioFeatures;
}

const AXES: { key: 'danceability' | 'energy' | 'valence' | 'acousticness' | 'instrumentalness'; label: string }[] = [
  { key: 'danceability', label: 'Dance' },
  { key: 'energy', label: 'Energy' },
  { key: 'valence', label: 'Valence' },
  { key: 'acousticness', label: 'Acoustic' },
  { key: 'instrumentalness', label: 'Instrumental' },
];

const CENTER = 100;
const MAX_RADIUS = 80;

function pointOnAxis(index: number, total: number, value: number): { x: number; y: number } {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  const radius = MAX_RADIUS * Math.max(0, Math.min(1.2, value));
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  };
}

const SonicFingerprintCard: React.FC<SonicFingerprintCardProps> = ({ sonicRead, audioFeatures }) => {
  if (!audioFeatures) return null;

  const polygonPoints = AXES.map((axis, i) => {
    const p = pointOnAxis(i, AXES.length, audioFeatures[axis.key]);
    return `${p.x},${p.y}`;
  }).join(' ');
  const sourceLabel = audioFeatures.source === 'spotify' ? 'Spotify Audio Features' : 'AI Estimate';
  const chartAriaLabel = `Sonic fingerprint: ${AXES.map(
    (a) => `${a.label} ${Math.round(audioFeatures[a.key] * 100)}%`
  ).join(', ')}`;

  return (
    <div className="song-card song-card--wide song-reveal" style={{ '--song-index': 1 } as React.CSSProperties}>
      <div className="flex items-center justify-between mb-3">
        <p
          className="m-0"
          style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--song-accent, #1DB954)' }}
        >
          Sonic Fingerprint
        </p>
        <span
          className="text-white/30 text-[10px] uppercase tracking-widest"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          {sourceLabel}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 items-center">
        <svg viewBox="0 0 200 200" className="w-full max-w-[200px] mx-auto" role="img" aria-label={chartAriaLabel}>
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
            fill="var(--song-chip, rgba(29,185,84,0.18))"
            stroke="var(--song-accent, #1DB954)"
            strokeWidth={2}
          />
          {AXES.map((axis, i) => {
            const p = pointOnAxis(i, AXES.length, 1.15);
            return (
              <text
                key={axis.key}
                x={p.x}
                y={p.y}
                fill="rgba(255,255,255,0.5)"
                fontSize="8"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {axis.label}
              </text>
            );
          })}
        </svg>
        <div>
          <p className="text-white/75 text-sm leading-relaxed mb-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            {sonicRead}
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-0.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
              <span className="text-white/40 text-[9px] uppercase tracking-widest">Tempo</span>
              <span className="text-white font-bold text-lg" style={{ fontFamily: 'Syne, sans-serif' }}>
                {audioFeatures.tempo} <span className="text-white/40 text-xs font-normal">BPM</span>
              </span>
            </div>
            <div className="flex flex-col gap-0.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
              <span className="text-white/40 text-[9px] uppercase tracking-widest">Key</span>
              <span className="text-white font-bold text-lg" style={{ fontFamily: 'Syne, sans-serif' }}>
                {audioFeatures.key}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SonicFingerprintCard;
