import { render, screen, within } from '@testing-library/react';
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
  expect(screen.getByRole('meter', { name: 'Energy' }))
    .toHaveAttribute('aria-valuemin', '0');
  expect(screen.getByRole('meter', { name: 'Energy' }))
    .toHaveAttribute('aria-valuemax', '100');
  expect(screen.getByRole('meter', { name: 'Energy' }))
    .toHaveAttribute('aria-valuenow', '60');
  expect(screen.getByRole('meter', { name: 'Valence' })).toHaveAttribute('aria-valuenow', '70');
  expect(screen.getByRole('meter', { name: 'Danceability' })).toHaveAttribute('aria-valuenow', '80');
  expect(screen.getByRole('meter', { name: 'Acousticness' })).toHaveAttribute('aria-valuenow', '20');
  expect(screen.getByRole('meter', { name: 'Instrumentalness' })).toHaveAttribute('aria-valuenow', '10');
});

test('clamps normalized feature values across the radar, summary, and meters', () => {
  render(
    <SonicFingerprintCard
      sonicRead="Warm and analog."
      audioFeatures={{
        ...spotifyFeatures,
        danceability: 1.4,
        energy: -0.2,
      }}
    />
  );

  const radar = screen.getByRole('img', {
    name: /Dance 100%, Energy 0%, Valence 70%, Acoustic 20%, Instrumental 10%/i,
  });
  expect(radar.querySelector('polygon[fill="var(--song-chip)"]')).toHaveAttribute(
    'points',
    expect.stringMatching(/^100,20 100,100 /)
  );

  const danceability = screen.getByRole('meter', { name: 'Danceability' });
  expect(danceability).toHaveAttribute('aria-valuenow', '100');
  expect(danceability).toHaveStyle({ '--feature-scale': '1' });

  const energy = screen.getByRole('meter', { name: 'Energy' });
  expect(energy).toHaveAttribute('aria-valuenow', '0');
  expect(energy).toHaveStyle({ '--feature-scale': '0' });
});

test.each([
  ['a missing required feature', { ...spotifyFeatures, energy: undefined }],
  ['a non-finite required feature', { ...spotifyFeatures, valence: Number.POSITIVE_INFINITY }],
])('renders nothing for %s', (_case, audioFeatures) => {
  const { container } = render(
    <SonicFingerprintCard
      sonicRead="Warm and analog."
      audioFeatures={audioFeatures as unknown as SongInfoAudioFeatures}
    />
  );

  expect(container).toBeEmptyDOMElement();
});

test('keeps radar labels inside the 200 by 200 chart bounds', () => {
  render(<SonicFingerprintCard sonicRead="Warm and analog." audioFeatures={spotifyFeatures} />);

  const radar = screen.getByRole('img');
  const dance = within(radar).getByText('Dance');
  expect(dance).toHaveAttribute('text-anchor', 'middle');
  expect(Number(dance.getAttribute('y'))).toBeGreaterThanOrEqual(12);

  const energy = within(radar).getByText('Energy');
  expect(energy).toHaveAttribute('text-anchor', 'end');
  expect(Number(energy.getAttribute('x'))).toBeGreaterThan(150);
  expect(Number(energy.getAttribute('x'))).toBeLessThanOrEqual(184);

  const valence = within(radar).getByText('Valence');
  expect(valence).toHaveAttribute('text-anchor', 'end');

  const acoustic = within(radar).getByText('Acoustic');
  expect(acoustic).toHaveAttribute('text-anchor', 'start');

  const instrumental = within(radar).getByText('Instrumental');
  expect(instrumental).toHaveAttribute('text-anchor', 'start');
  expect(Number(instrumental.getAttribute('x'))).toBeGreaterThanOrEqual(16);
  expect(Number(instrumental.getAttribute('x'))).toBeLessThan(50);
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
