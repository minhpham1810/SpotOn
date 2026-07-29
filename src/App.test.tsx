import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, test, expect, beforeEach } from 'vitest';
import App from './App';

const isAuthenticatedMock = vi.fn(() => false);
const searchTracksMock = vi.fn();

vi.mock('./api/SpotifyAPI', () => ({
  default: {
    init: vi.fn(),
    isAuthenticated: () => isAuthenticatedMock(),
    refreshAccessToken: vi.fn(() => Promise.reject(new Error('no refresh token'))),
    logout: vi.fn(),
    getTrackDetails: vi.fn(),
    searchTracks: (...args: unknown[]) => searchTracksMock(...args),
    createPlaylist: vi.fn(),
  },
}));

vi.mock('./SongDetails', () => ({
  default: ({ onLogout }: { onLogout: () => void }) => (
    <main data-testid="song-page">
      <button onClick={onLogout}>Song logout</button>
    </main>
  ),
}));

beforeEach(() => {
  localStorage.clear();
  isAuthenticatedMock.mockReturnValue(false);
  searchTracksMock.mockReset();
  window.history.pushState({}, '', '/');
});

test('renders the login screen when the user is not authenticated', async () => {
  render(<App />);
  const loginButton = await screen.findByRole('button', { name: /connect with spotify/i });
  expect(loginButton).toBeInTheDocument();
});

test('uses a dedicated full-width shell on song routes', async () => {
  isAuthenticatedMock.mockReturnValue(true);
  window.history.pushState({}, '', '/song/track-1');

  render(<App />);

  expect(await screen.findByTestId('song-page')).toBeInTheDocument();
  expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /SpotOn Music App/i })).not.toBeInTheDocument();
  expect(screen.getByTestId('authenticated-shell')).toHaveAttribute('data-route-shell', 'song');
});

test('renders the refurbished discovery home before a search', async () => {
  isAuthenticatedMock.mockReturnValue(true);

  render(<App />);

  expect(await screen.findByRole('heading', { name: /what do you want to understand/i })).toBeInTheDocument();
  expect(screen.getByRole('searchbox', { name: /search the spotify catalog/i })).toBeInTheDocument();
  expect(screen.getByTestId('authenticated-shell')).toHaveAttribute('data-search-view', 'home');
  expect(screen.getByRole('heading', { name: /your playlist/i })).toBeInTheDocument();
});

test('moves from the home view to a result-led search view', async () => {
  isAuthenticatedMock.mockReturnValue(true);
  searchTracksMock.mockResolvedValueOnce([
    {
      id: 'track-1',
      name: 'Cellophane',
      artist: 'FKA twigs',
      album: 'Magdalene',
      cover: 'https://cdn.example/cellophane.jpg',
      preview_url: 'https://cdn.example/cellophane.mp3',
    },
  ]);
  const user = userEvent.setup();

  render(<App />);
  const searchbox = await screen.findByRole('searchbox', { name: /search the spotify catalog/i });
  await user.type(searchbox, 'Cellophane');
  await user.keyboard('{Enter}');

  expect(await screen.findByRole('heading', { name: 'Cellophane' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /search the catalog/i })).toBeInTheDocument();
  expect(searchTracksMock).toHaveBeenCalledWith('Cellophane');
  expect(screen.getByTestId('authenticated-shell')).toHaveAttribute('data-search-view', 'results');
  expect(screen.getByText(/1 track found/i)).toBeInTheDocument();
});

test('shows an inline retry path when search fails', async () => {
  isAuthenticatedMock.mockReturnValue(true);
  searchTracksMock.mockRejectedValueOnce(new Error('catalog unavailable'));
  const user = userEvent.setup();

  render(<App />);
  const searchbox = await screen.findByRole('searchbox', { name: /search the spotify catalog/i });
  await user.type(searchbox, 'Nights');
  await user.keyboard('{Enter}');

  expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t search spotify/i);
  expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
});
