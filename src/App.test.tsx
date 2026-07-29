import { render, screen } from '@testing-library/react';
import { vi, test, expect, beforeEach } from 'vitest';
import App from './App';

const isAuthenticatedMock = vi.fn(() => false);

vi.mock('./api/SpotifyAPI', () => ({
  default: {
    init: vi.fn(),
    isAuthenticated: () => isAuthenticatedMock(),
    refreshAccessToken: vi.fn(() => Promise.reject(new Error('no refresh token'))),
    logout: vi.fn(),
    getTrackDetails: vi.fn(),
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
