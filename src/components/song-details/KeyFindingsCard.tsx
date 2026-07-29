import React from 'react';
import type { SongInfoFinding, FindingConfidence } from '../../types/song-info';
import { safeUrl } from '../../lib/safeUrl';

interface KeyFindingsCardProps {
  findings: SongInfoFinding[];
}

const CONFIDENCE_LABEL: Record<FindingConfidence, string> = {
  verified: 'Verified',
  inferred: 'Inferred',
  speculative: 'Speculative',
};

const CONFIDENCE_CLASS: Record<FindingConfidence, string> = {
  verified: '',
  inferred: 'bg-white/10 border-white/25 text-white/70',
  speculative: 'bg-transparent border-white/15 text-white/40',
};

const CONFIDENCE_STYLE: Record<FindingConfidence, React.CSSProperties | undefined> = {
  verified: {
    background: 'var(--song-chip, rgba(29,185,84,0.15))',
    borderColor: 'var(--song-border, rgba(29,185,84,0.3))',
    color: 'var(--song-accent, #1DB954)',
  },
  inferred: undefined,
  speculative: undefined,
};

const KeyFindingsCard: React.FC<KeyFindingsCardProps> = ({ findings }) => {
  if (!Array.isArray(findings) || findings.length === 0) return null;

  return (
    <div className="border-l-2 pl-5 py-1" style={{ borderColor: 'var(--song-border, rgba(29,185,84,0.3))' }}>
      <p
        className="m-0 mb-3"
        style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--song-accent, #1DB954)' }}
      >
        Key Findings
      </p>
      <div className="flex flex-col gap-4">
        {findings.map((finding, i) => {
          const href = finding.source ? safeUrl(finding.source.url) : undefined;
          return (
            <div key={i} className="flex items-start gap-3">
              <span
                className="font-bold text-sm w-6 flex-shrink-0"
                style={{ fontFamily: 'Syne, sans-serif', fontVariantNumeric: 'tabular-nums', color: 'var(--song-accent, #1DB954)' }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white/80 text-sm leading-relaxed m-0 mb-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  {finding.text}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${CONFIDENCE_CLASS[finding.confidence]}`}
                    style={CONFIDENCE_STYLE[finding.confidence]}
                  >
                    {CONFIDENCE_LABEL[finding.confidence]}
                  </span>
                  {finding.source && href && (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-white/50 border-b border-white/15 transition-colors"
                    >
                      {finding.source.label} ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KeyFindingsCard;
