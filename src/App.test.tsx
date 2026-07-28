import { render, screen } from '@testing-library/react';
import { vi, test, expect, beforeEach } from 'vitest';
import App from './App';

vi.mock('./api/SpotifyAPI', () => ({
  default: {
    init: vi.fn(),
    isAuthenticated: vi.fn(() => false),
    refreshAccessToken: vi.fn(() => Promise.reject(new Error('no refresh token'))),
    logout: vi.fn(),
  },
}));

beforeEach(() => {
  localStorage.clear();
});

test('renders the login screen when the user is not authenticated', async () => {
  render(<App />);
  const loginButton = await screen.findByRole('button', { name: /connect with spotify/i });
  expect(loginButton).toBeInTheDocument();
});
