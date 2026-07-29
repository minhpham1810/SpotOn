import { render, screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';
import ResearchProgress from './ResearchProgress';

test('marks earlier research steps complete and the latest step current', () => {
  render(
    <ResearchProgress
      steps={[
        { tool: 'spotify', status: 'Collecting track metadata' },
        { tool: 'genius', status: 'Reading lyric annotations' },
        { tool: 'synthesis', status: 'Writing the report' },
      ]}
    />
  );

  const items = screen.getAllByRole('listitem');
  expect(items[0]).toHaveAttribute('data-state', 'complete');
  expect(within(items[0]).getByText('Completed')).toHaveClass('sr-only');
  expect(items[1]).toHaveAttribute('data-state', 'complete');
  expect(items[2]).toHaveAttribute('data-state', 'current');
  expect(items[2]).toHaveAttribute('aria-current', 'step');
  expect(items[2]).toHaveClass('song-progress-step--current');
});

test('announces preparation as the current step before trace events arrive', () => {
  render(<ResearchProgress steps={[]} />);

  expect(screen.getByRole('listitem')).toHaveAttribute('aria-current', 'step');
  expect(screen.getByText('Preparing the research brief')).toBeInTheDocument();
});
