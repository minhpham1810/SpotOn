import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
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
