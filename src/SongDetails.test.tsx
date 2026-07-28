import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { vi, test, expect, beforeEach } from 'vitest';
import SongDetails from './SongDetails';
import { ToastProvider } from './contexts/ToastContext';

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

function renderSongDetails() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/song/1']}>
        <Routes>
          <Route path="/song/:id" element={<SongDetails onAddToPlaylist={() => {}} />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  );
}

beforeEach(() => {
  researchSongMock.mockReset();
});

test('shows research trace steps while the agent is working', async () => {
  researchSongMock.mockImplementation(
    (_track, onStep) =>
      new Promise(() => {
        onStep({ tool: 'genius_lookup', status: 'Reading lyrics annotations on Genius...' });
      })
  );

  renderSongDetails();

  expect(await screen.findByText(/Reading lyrics annotations on Genius/i)).toBeInTheDocument();
});

test('renders source links once the report arrives', async () => {
  researchSongMock.mockResolvedValue({
    summary: 'A great song.',
    musicalAnalysis: { mood: 'Calm', keyElements: [], soundscape: '' },
    genre: [],
    culturalContext: { era: '', influence: '' },
    credits: [],
    highlights: [],
    sources: [{ label: 'Genius', url: 'https://genius.com/x' }],
  });

  renderSongDetails();

  const sourceLink = await screen.findByRole('link', { name: 'Genius' });
  expect(sourceLink).toHaveAttribute('href', 'https://genius.com/x');
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
                <SongDetails onAddToPlaylist={() => {}} />
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
