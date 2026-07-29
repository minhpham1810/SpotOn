import React from 'react';
import type { EmotionalFingerprint } from '../../types/song-info';

interface EmotionalFingerprintCardProps {
  emotionalFingerprint?: EmotionalFingerprint;
}

const EmotionalFingerprintCard: React.FC<EmotionalFingerprintCardProps> = ({ emotionalFingerprint }) => {
  if (!emotionalFingerprint || !Array.isArray(emotionalFingerprint.arc)) return null;

  return (
    <div className="border-l-2 pl-5 py-1" style={{ borderColor: 'var(--song-border, rgba(29,185,84,0.3))' }}>
      <p
        className="m-0 mb-3"
        style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--song-accent, #1DB954)' }}
      >
        Emotional Fingerprint
      </p>
      <blockquote
        className="m-0 mb-5 italic text-white text-xl md:text-2xl leading-snug"
        style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600 }}
      >
        <span style={{ color: 'var(--song-accent, #1DB954)' }}>&ldquo;</span>
        {emotionalFingerprint.signatureMove}
      </blockquote>
      <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        The Journey
      </p>
      <ul className="space-y-1.5 mb-5">
        {emotionalFingerprint.arc.map((beat, i) => (
          <li key={i} className="flex items-start gap-2 text-white/75 text-sm leading-relaxed" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            <span className="mt-1 flex-shrink-0" style={{ color: 'var(--song-accent, #1DB954)' }}>
              ·
            </span>
            {beat}
          </li>
        ))}
      </ul>
      <div className="pt-4 border-t border-white/10 flex flex-wrap items-baseline gap-2">
        <span className="text-white/30 text-[10px] uppercase tracking-widest" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          Reach for this when
        </span>
        <span className="text-white/80 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          {emotionalFingerprint.reachForThisWhen}
        </span>
      </div>
    </div>
  );
};

export default EmotionalFingerprintCard;
