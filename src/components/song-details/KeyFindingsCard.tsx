import React from 'react';
import type { SongInfoFinding, FindingConfidence } from '../../types/song-info';

interface KeyFindingsCardProps {
  findings: SongInfoFinding[];
}

const CONFIDENCE_LABEL: Record<FindingConfidence, string> = {
  verified: 'Verified',
  inferred: 'Inferred',
  speculative: 'Speculative',
};

const CONFIDENCE_CLASS: Record<FindingConfidence, string> = {
  verified: 'bg-primary/15 border-primary/30 text-primary',
  inferred: 'bg-white/10 border-white/25 text-white/70',
  speculative: 'bg-transparent border-white/15 text-white/40',
};

const KeyFindingsCard: React.FC<KeyFindingsCardProps> = ({ findings }) => {
  if (!Array.isArray(findings) || findings.length === 0) return null;

  return (
    <div className="border-l-2 border-primary/30 pl-5 py-1">
      <p
        className="text-primary m-0 mb-3"
        style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase' }}
      >
        Key Findings
      </p>
      <div className="flex flex-col gap-4">
        {findings.map((finding, i) => (
          <div key={i} className="flex items-start gap-3">
            <span
              className="text-primary font-bold text-sm w-6 flex-shrink-0"
              style={{ fontFamily: 'Syne, sans-serif', fontVariantNumeric: 'tabular-nums' }}
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
                >
                  {CONFIDENCE_LABEL[finding.confidence]}
                </span>
                {finding.source && (
                  <a
                    href={finding.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-white/50 hover:text-primary border-b border-white/15 hover:border-primary transition-colors"
                  >
                    {finding.source.label} ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KeyFindingsCard;
