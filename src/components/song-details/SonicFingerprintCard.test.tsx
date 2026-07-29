import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import type { SongInfoAudioFeatures } from '../../types/song-info';
import SonicFingerprintCard from './SonicFingerprintCard';

const spotifyFeatures: SongInfoAudioFeatures = {
  source: 'spotify',
  tempo: 120,
  key: 'C Major',
  danceability: 0.8,
  energy: 0.6,
  valence: 0.7,
  acousticness: 0.2,
  instrumentalness: 0.1,
};

test('renders nothing when audioFeatures is absent', () => {
  const { container } = render(<SonicFingerprintCard sonicRead="Warm and analog." />);
  expect(container).toBeEmptyDOMElement();
});

test('renders an accessible feature summary and meters', () => {
  render(<SonicFingerprintCard sonicRead="Warm and analog." audioFeatures={spotifyFeatures} />);

  expect(screen.getByRole('img', {
    name: /Dance 80%, Energy 60%, Valence 70%, Acoustic 20%, Instrumental 10%/i,
  })).toBeInTheDocument();
  expect(screen.getByRole('meter', { name: 'Energy' })).toHaveAttribute('aria-valuenow', '60');
  expect(screen.getByRole('meter', { name: 'Valence' })).toHaveAttribute('aria-valuenow', '70');
  expect(screen.getByRole('meter', { name: 'Danceability' })).toHaveAttribute('aria-valuenow', '80');
  expect(screen.getByRole('meter', { name: 'Acousticness' })).toHaveAttribute('aria-valuenow', '20');
  expect(screen.getByRole('meter', { name: 'Instrumentalness' })).toHaveAttribute('aria-valuenow', '10');
});

test('labels the source as Spotify Audio Features when measured', () => {
  render(
    <SonicFingerprintCard
      sonicRead="Warm and analog."
      audioFeatures={{
        source: 'spotify',
        tempo: 120,
        key: 'C Major',
        danceability: 0.8,
        energy: 0.6,
        valence: 0.7,
        acousticness: 0.2,
        instrumentalness: 0.1,
      }}
    />
  );

  expect(screen.getByText('Spotify Audio Features')).toBeInTheDocument();
  expect(screen.getByText('120')).toBeInTheDocument();
  expect(screen.getByText('C Major')).toBeInTheDocument();
});

test('labels the source as AI Estimate when Spotify data is unavailable', () => {
  render(
    <SonicFingerprintCard
      sonicRead="Warm and analog."
      audioFeatures={{
        source: 'estimated',
        tempo: 95,
        key: 'A Minor',
        danceability: 0.5,
        energy: 0.4,
        valence: 0.3,
        acousticness: 0.6,
        instrumentalness: 0.05,
      }}
    />
  );

  expect(screen.getByText('AI Estimate')).toBeInTheDocument();
});
