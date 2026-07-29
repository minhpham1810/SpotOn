import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import SongDetailsHeader from './SongDetailsHeader';

test('calls the back and logout actions', async () => {
  const onBack = vi.fn();
  const onLogout = vi.fn();
  const user = userEvent.setup();
  render(<SongDetailsHeader onBack={onBack} onLogout={onLogout} />);

  await user.click(screen.getByRole('button', { name: 'Back to search' }));
  await user.click(screen.getByRole('button', { name: 'Logout' }));

  expect(onBack).toHaveBeenCalledOnce();
  expect(onLogout).toHaveBeenCalledOnce();
});
