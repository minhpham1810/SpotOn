import type { ResearchStepEvent } from '../../api/ResearchAgentAPI';
import { Check } from '@phosphor-icons/react';

interface ResearchProgressProps {
  steps: ResearchStepEvent[];
}

export default function ResearchProgress({ steps }: ResearchProgressProps) {
  const visibleSteps = steps.length > 0
    ? steps
    : [{ tool: 'preparing', status: 'Preparing the research brief' }];

  return (
    <section className="song-card song-card--wide text-center" role="status" aria-label="Song research progress">
      <div className="song-progress-mark" aria-hidden="true" />
      <h2 className="font-syne text-lg font-semibold">Researching this song</h2>
      <ol className="mx-auto mt-5 max-w-xl space-y-3 text-left">
        {visibleSteps.map((step, index) => {
          const isCurrent = index === visibleSteps.length - 1;
          return (
          <li
            key={`${step.tool}-${index}`}
            data-state={isCurrent ? 'current' : 'complete'}
            aria-current={isCurrent ? 'step' : undefined}
            className={`song-progress-step flex items-start gap-3 text-sm ${
              isCurrent ? 'song-progress-step--current text-white/80' : 'text-white/55'
            }`}
          >
            <span className="mt-0.5 flex w-6 shrink-0 justify-center font-syne text-[var(--song-accent)]" aria-hidden="true">
              {isCurrent ? String(index + 1).padStart(2, '0') : <Check size={15} weight="bold" />}
            </span>
            {!isCurrent && <span className="sr-only">Completed</span>}
            <span>{step.status}</span>
          </li>
          );
        })}
      </ol>
    </section>
  );
}
