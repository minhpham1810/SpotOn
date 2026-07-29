import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, test, expect, beforeEach } from 'vitest';
import SongDetails from './SongDetails';
import { ToastProvider } from './contexts/ToastContext';
import { SongInfo } from './types/song-info';
import { TrackDetails } from './types/spotify';
import SpotifyAPI from './api/SpotifyAPI';

vi.mock('./api/SpotifyAPI', () => ({
  default: {
    getTrackDetails: vi.fn(() =>
      Promise.resolve({
        id: '1',
        name: 'Test Song',
        artist: 'Test Artist',
        album: 'Test Album',
        cover: 'cover.jpg',
        releaseDate: '2020-01-01',
      })
    ),
  },
}));

const researchSongMock = vi.fn();
vi.mock('./api/ResearchAgentAPI', () => ({
  default: { researchSong: (...args: unknown[]) => researchSongMock(...args) },
}));

const getTrackDetailsMock = vi.mocked(SpotifyAPI.getTrackDetails);

const trackFixture: TrackDetails = {
  id: '1',
  name: 'Test Song',
  artist: 'Test Artist',
  album: 'Test Album',
  cover: 'cover.jpg',
  releaseDate: '2020-01-01',
  preview_url: null,
};

vi.mock('./lib/coverAccentColor', () => ({
  extractCoverAccent: vi.fn().mockResolvedValue({
    accent: '#1DB954',
    glow: 'rgba(29,185,84,0.4)',
    chip: 'rgba(29,185,84,0.12)',
    border: 'rgba(29,185,84,0.25)',
  }),
}));

function renderSongDetails() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/song/1']}>
        <Routes>
          <Route path="/song/:id" element={<SongDetails onAddToPlaylist={() => {}} onLogout={() => {}} />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  );
}

const baseReport: SongInfo = {
  emotionalFingerprint: {
    arc: ['Guarded', 'Building', 'Open'],
    signatureMove: 'A held breath before the last chorus.',
    reachForThisWhen: 'You need company for a quiet mood.',
  },
  summary: 'A great song.',
  musicalAnalysis: { mood: 'Calm', keyElements: [], soundscape: '' },
  sonicRead: '',
  genre: [],
  culturalContext: { era: '', influence: '' },
  credits: [],
  findings: [],
  sources: [],
};

beforeEach(() => {
  researchSongMock.mockReset();
  getTrackDetailsMock.mockReset();
  getTrackDetailsMock.mockResolvedValue(trackFixture);
});

test('renders the immersive hero and labeled research report', async () => {
  researchSongMock.mockResolvedValue(baseReport);
  renderSongDetails();

  expect(await screen.findByRole('main', { name: 'Song details' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Test Song overview' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Song research report' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Test Song album cover' })).toBeInTheDocument();
});

test('shows a layout-matched skeleton before the track resolves', () => {
  getTrackDetailsMock.mockReturnValueOnce(new Promise(() => {}));
  renderSongDetails();

  expect(screen.getByTestId('song-details-skeleton')).toBeInTheDocument();
  expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
});

test('retries a failed track request', async () => {
  getTrackDetailsMock
    .mockRejectedValueOnce(new Error('network'))
    .mockResolvedValueOnce(trackFixture);
  const user = userEvent.setup();
  renderSongDetails();

  await user.click(await screen.findByRole('button', { name: 'Try again' }));

  expect(getTrackDetailsMock).toHaveBeenCalledTimes(2);
  expect(await screen.findByRole('heading', { name: 'Test Song' })).toBeInTheDocument();
});

test('shows a themed unavailable panel when research returns no report', async () => {
  researchSongMock.mockResolvedValue(null);
  renderSongDetails();

  expect(await screen.findByText(/Additional song information is currently unavailable/i)).toBeInTheDocument();
});

test('shows an inline retry state when research fails', async () => {
  researchSongMock
    .mockRejectedValueOnce(new Error('research unavailable'))
    .mockResolvedValueOnce(baseReport);
  const user = userEvent.setup();
  renderSongDetails();

  await user.click(await screen.findByRole('button', { name: 'Try again' }));

  expect(await screen.findByText('About this Song')).toBeInTheDocument();
  expect(screen.queryByText(/Additional song information is currently unavailable/i)).not.toBeInTheDocument();
});

test('ignores stale research updates after navigating to another song', async () => {
  const requests: { onStep: (step: { tool: string; status: string }) => void; resolve: (report: SongInfo) => void }[] = [];
  getTrackDetailsMock.mockImplementation(async (id) => ({ ...trackFixture, id, name: `Song ${id}` }));
  researchSongMock.mockImplementation((_track, onStep) => new Promise<SongInfo>((resolve) => {
    requests.push({ onStep, resolve });
  }));

  render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/song/1']}>
        <Routes>
          <Route
            path="/song/:id"
            element={
              <>
                <Link to="/song/2">Go to song 2</Link>
                <SongDetails onAddToPlaylist={() => {}} onLogout={() => {}} />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  );

  await screen.findByRole('heading', { name: 'Song 1' });
  await waitFor(() => expect(requests).toHaveLength(1));
  fireEvent.click(screen.getByText('Go to song 2'));
  await screen.findByRole('heading', { name: 'Song 2' });
  await waitFor(() => expect(requests).toHaveLength(2));

  await act(async () => {
    requests[0].onStep({ tool: 'old_stream', status: 'Stale first-song step' });
  });

  expect(screen.queryByText('Stale first-song step')).not.toBeInTheDocument();

  await act(async () => {
    requests[1].resolve({ ...baseReport, summary: 'Current second-song report.' });
  });

  expect(await screen.findByText('Current second-song report.')).toBeInTheDocument();

  await act(async () => {
    requests[0].resolve({ ...baseReport, summary: 'Stale first-song report.' });
  });

  expect(screen.queryByText('Stale first-song report.')).not.toBeInTheDocument();
  expect(screen.getByText('Current second-song report.')).toBeInTheDocument();
});

test('exposes preview playback state through the hero button', async () => {
  getTrackDetailsMock.mockResolvedValueOnce({
    id: '1',
    name: 'Test Song',
    artist: 'Test Artist',
    album: 'Test Album',
    cover: 'cover.jpg',
    releaseDate: '2020-01-01',
    preview_url: 'https://cdn.example/preview.mp3',
  });
  const audio = {
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    currentTime: 0,
    onended: null,
    onerror: null,
  };
  vi.stubGlobal('Audio', vi.fn(function () { return audio; }));
  const user = userEvent.setup();

  renderSongDetails();

  const button = await screen.findByRole('button', { name: 'Preview' });
  expect(button).toHaveAttribute('aria-pressed', 'false');

  await user.click(button);
  expect(await screen.findByRole('button', { name: 'Pause preview' })).toHaveAttribute('aria-pressed', 'true');
});

test('disables preview when Spotify provides no clip', async () => {
  renderSongDetails();

  expect(await screen.findByRole('button', { name: 'Preview unavailable' })).toBeDisabled();
});

test('shows research trace steps while the agent is working', async () => {
  researchSongMock.mockImplementation(
    (_track, onStep) =>
      new Promise(() => {
        onStep({ tool: 'genius_lookup', status: 'Reading lyrics annotations on Genius...' });
      })
  );

  renderSongDetails();

  expect(await screen.findByRole('status', { name: 'Song research progress' })).toBeInTheDocument();
  expect(screen.getByText(/Reading lyrics annotations on Genius/i)).toBeInTheDocument();
});

test('renders source links once the report arrives', async () => {
  researchSongMock.mockResolvedValue({
    ...baseReport,
    sources: [{ label: 'Genius', url: 'https://genius.com/x' }],
  });

  renderSongDetails();

  const sourceLink = await screen.findByRole('link', { name: 'Genius' });
  expect(sourceLink).toHaveAttribute('href', 'https://genius.com/x');
});

test('renders the Emotional Fingerprint section first, above About this Song', async () => {
  researchSongMock.mockResolvedValue({
    ...baseReport,
    emotionalFingerprint: {
      arc: ['Opens guarded and restrained', 'Builds into aching longing', 'Resolves in quiet acceptance'],
      signatureMove: 'The vocal cracks right on the word "gone".',
      reachForThisWhen: 'You want to sit with something instead of getting over it.',
    },
  });

  renderSongDetails();

  expect(await screen.findByText(/Opens guarded and restrained/i)).toBeInTheDocument();
  expect(screen.getByText(/The vocal cracks right on the word "gone"/i)).toBeInTheDocument();
  expect(screen.getByText(/You want to sit with something instead of getting over it/i)).toBeInTheDocument();

  const sectionLabels = screen.getAllByText(/Emotional Fingerprint|About this Song/i);
  expect(sectionLabels[0]).toHaveTextContent('Emotional Fingerprint');
  expect(sectionLabels[1]).toHaveTextContent('About this Song');
});

test('renders gracefully without crashing when emotionalFingerprint is missing', async () => {
  researchSongMock.mockResolvedValue({
    ...baseReport,
    emotionalFingerprint: undefined,
  } as unknown as SongInfo);

  expect(() => renderSongDetails()).not.toThrow();

  expect(await screen.findByText('About this Song')).toBeInTheDocument();
  expect(screen.queryByText('Emotional Fingerprint')).not.toBeInTheDocument();
});

test('renders gracefully without crashing when emotionalFingerprint.arc is malformed', async () => {
  researchSongMock.mockResolvedValue({
    ...baseReport,
    emotionalFingerprint: {
      arc: 'not an array',
      signatureMove: 'A held breath before the last chorus.',
      reachForThisWhen: 'You need company for a quiet mood.',
    },
  } as unknown as SongInfo);

  expect(() => renderSongDetails()).not.toThrow();

  expect(await screen.findByText('About this Song')).toBeInTheDocument();
  expect(screen.queryByText('Emotional Fingerprint')).not.toBeInTheDocument();
});

test('renders Key Findings with a confidence badge for each finding', async () => {
  researchSongMock.mockResolvedValue({
    ...baseReport,
    findings: [
      { text: 'The bridge modulates up a half step.', confidence: 'verified', source: { label: 'Genius', url: 'https://genius.com/x' } },
      { text: 'This likely nods to 90s trip-hop.', confidence: 'speculative', source: null },
    ],
  });

  renderSongDetails();

  expect(await screen.findByText('Key Findings')).toBeInTheDocument();
  expect(screen.getByText('Verified')).toBeInTheDocument();
  expect(screen.getByText('Speculative')).toBeInTheDocument();
});

test('renders the Sonic Fingerprint card with the correct source label when audioFeatures is present', async () => {
  researchSongMock.mockResolvedValue({
    ...baseReport,
    sonicRead: 'Warm and analog.',
    audioFeatures: {
      source: 'estimated',
      tempo: 95,
      key: 'A Minor',
      danceability: 0.5,
      energy: 0.4,
      valence: 0.3,
      acousticness: 0.6,
      instrumentalness: 0.05,
    },
  });

  renderSongDetails();

  expect(await screen.findByText('Sonic Fingerprint')).toBeInTheDocument();
  expect(screen.getByText('AI Estimate')).toBeInTheDocument();
});

test('omits the Sonic Fingerprint card when audioFeatures is absent', async () => {
  researchSongMock.mockResolvedValue(baseReport);

  renderSongDetails();

  await screen.findByText('About this Song');
  expect(screen.queryByText('Sonic Fingerprint')).not.toBeInTheDocument();
});

test('aborts the in-flight research stream when the song id changes or the component unmounts', async () => {
  const capturedSignals: (AbortSignal | undefined)[] = [];
  researchSongMock.mockImplementation(
    (_track, _onStep, signal?: AbortSignal) =>
      new Promise(() => {
        capturedSignals.push(signal);
      })
  );

  // Navigating from /song/1 to /song/2 keeps the same SongDetails instance mounted
  // (react-router only swaps the :id param), which is the scenario that leaked the
  // previous song's stream before this fix.
  const { unmount } = render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/song/1']}>
        <Routes>
          <Route
            path="/song/:id"
            element={
              <>
                <Link to="/song/2">Go to song 2</Link>
                <SongDetails onAddToPlaylist={() => {}} onLogout={() => {}} />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  );

  await screen.findByText(/Researching this song/i);
  expect(capturedSignals).toHaveLength(1);
  const firstSignal = capturedSignals[0];
  expect(firstSignal).toBeInstanceOf(AbortSignal);
  expect(firstSignal?.aborted).toBe(false);

  // Navigate to a different song without unmounting the component.
  fireEvent.click(screen.getByText('Go to song 2'));

  await screen.findByText(/Researching this song/i);
  expect(capturedSignals).toHaveLength(2);
  expect(firstSignal?.aborted).toBe(true);
  expect(capturedSignals[1]?.aborted).toBe(false);

  unmount();
  expect(capturedSignals[1]?.aborted).toBe(true);
});
