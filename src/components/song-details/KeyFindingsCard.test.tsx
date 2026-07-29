import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import KeyFindingsCard from './KeyFindingsCard';

test('renders nothing when there are no findings', () => {
  const { container } = render(<KeyFindingsCard findings={[]} />);
  expect(container).toBeEmptyDOMElement();
});

test('renders a confidence badge and citation for each finding', () => {
  render(
    <KeyFindingsCard
      findings={[
        {
          text: 'The bridge modulates up a half step.',
          confidence: 'verified',
          source: { label: 'Genius', url: 'https://genius.com/x' },
        },
        {
          text: 'The producer favored tape saturation on this record.',
          confidence: 'inferred',
          source: { label: 'Interview', url: 'https://example.com/y' },
        },
        {
          text: 'This choice likely nods to 90s trip-hop.',
          confidence: 'speculative',
          source: null,
        },
      ]}
    />
  );

  expect(screen.getByText('Verified')).toBeInTheDocument();
  expect(screen.getByText('Inferred')).toBeInTheDocument();
  expect(screen.getByText('Speculative')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Genius/ })).toHaveAttribute('href', 'https://genius.com/x');
  expect(screen.getByRole('link', { name: /Interview/ })).toHaveAttribute('href', 'https://example.com/y');
  expect(screen.queryAllByRole('link')).toHaveLength(2);
});
