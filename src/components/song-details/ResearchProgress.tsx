import type { ResearchStepEvent } from '../../api/ResearchAgentAPI';

interface ResearchProgressProps {
  steps: ResearchStepEvent[];
}

export default function ResearchProgress({ steps }: ResearchProgressProps) {
  return (
    <section className="song-card song-card--wide text-center" role="status" aria-label="Song research progress">
      <div className="song-progress-mark" aria-hidden="true" />
      <h2 className="font-syne text-lg font-semibold">Researching this song</h2>
      <ol className="mx-auto mt-5 max-w-xl space-y-3 text-left">
        {steps.length > 0 ? steps.map((step, index) => (
          <li key={`${step.tool}-${index}`} className="flex items-start gap-3 text-sm text-white/60">
            <span className="mt-0.5 font-syne text-[var(--song-accent)]">{String(index + 1).padStart(2, '0')}</span>
            <span>{step.status}</span>
          </li>
        )) : (
          <li className="text-center text-sm text-white/45">Preparing the research brief</li>
        )}
      </ol>
    </section>
  );
}
