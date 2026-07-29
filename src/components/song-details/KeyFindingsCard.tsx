import React from 'react';
import { ApproximateEquals, ArrowUpRight, Check, Question } from '@phosphor-icons/react';
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

const CONFIDENCE_ICON = {
  verified: Check,
  inferred: ApproximateEquals,
  speculative: Question,
} satisfies Record<FindingConfidence, React.ComponentType<{ size?: number; weight?: 'bold'; 'aria-hidden'?: boolean }>>;

const KeyFindingsCard: React.FC<KeyFindingsCardProps> = ({ findings }) => {
  if (!Array.isArray(findings) || findings.length === 0) return null;

  return (
    <div className="song-card song-reveal" style={{ '--song-index': 6 } as React.CSSProperties}>
      <p className="song-eyebrow">Key Findings</p>
      <div className="divide-y divide-white/[0.08]">
        {findings.map((finding, i) => {
          const href = finding.source ? safeUrl(finding.source.url) : undefined;
          const ConfidenceIcon = CONFIDENCE_ICON[finding.confidence];
          return (
            <div key={i} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
              <span
                className="w-6 flex-shrink-0 font-syne text-sm font-bold"
                style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--song-accent, #1DB954)' }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 min-w-0">
                <p className="mb-2 text-sm leading-relaxed text-white/70 [overflow-wrap:anywhere]">
                  {finding.text}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${CONFIDENCE_CLASS[finding.confidence]}`}
                    style={CONFIDENCE_STYLE[finding.confidence]}
                  >
                    <ConfidenceIcon size={12} weight="bold" aria-hidden={true} />
                    {CONFIDENCE_LABEL[finding.confidence]}
                  </span>
                  {finding.source && href && (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 border-b border-white/15 text-xs text-white/50"
                    >
                      <span className="min-w-0 [overflow-wrap:anywhere]">{finding.source.label}</span>
                      <ArrowUpRight size={13} weight="bold" aria-hidden="true" />
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
