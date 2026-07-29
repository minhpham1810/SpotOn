import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import GenreSourcesFooter from './GenreSourcesFooter';

test('renders nothing when every source URL is invalid', () => {
  const { container } = render(
    <GenreSourcesFooter
      genre={[]}
      sources={[
        { label: 'Unsafe script', url: 'javascript:alert(1)' },
        { label: 'Unsupported protocol', url: 'ftp://example.com/report' },
      ]}
    />
  );

  expect(container).toBeEmptyDOMElement();
});

test('spans a genre-only card across the report grid', () => {
  render(<GenreSourcesFooter genre={['Dream Pop']} sources={[]} />);

  expect(screen.getByText('Genre').parentElement).toHaveClass('song-card--wide');
  expect(screen.getByText('Dream Pop')).toBeInTheDocument();
  expect(screen.queryByText('Sources')).not.toBeInTheDocument();
});

test('spans a valid-sources-only card across the report grid', () => {
  render(
    <GenreSourcesFooter
      genre={[]}
      sources={[
        { label: 'Unsafe script', url: 'javascript:alert(1)' },
        { label: 'Genius', url: 'https://genius.com/song' },
      ]}
    />
  );

  expect(screen.getByText('Sources').parentElement).toHaveClass('song-card--wide');
  expect(screen.getByRole('link', { name: 'Genius' })).toHaveAttribute('href', 'https://genius.com/song');
  expect(screen.queryByText('Unsafe script')).not.toBeInTheDocument();
});
