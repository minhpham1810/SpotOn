import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { useAudioPreview } from './useAudioPreview';

const onErrorMock = vi.fn();
const playMock = vi.fn().mockResolvedValue(undefined);
const pauseMock = vi.fn();
const audio = {
  play: playMock,
  pause: pauseMock,
  currentTime: 0,
  onended: null as (() => void) | null,
  onerror: null as (() => void) | null,
};

function Harness({ url }: { url?: string | null }) {
  const preview = useAudioPreview(url, onErrorMock);

  return (
    <>
      <span>{preview.state}</span>
      <button onClick={() => void preview.toggle()}>Toggle</button>
    </>
  );
}

beforeEach(() => {
  playMock.mockClear();
  pauseMock.mockClear();
  onErrorMock.mockClear();
  audio.currentTime = 0;
  audio.onended = null;
  audio.onerror = null;
  vi.stubGlobal('Audio', vi.fn(function () { return audio; }));
});

test('reports unavailable without a preview URL', () => {
  render(<Harness url={null} />);

  expect(screen.getByText('unavailable')).toBeInTheDocument();
});

test('plays and pauses an available preview', async () => {
  const user = userEvent.setup();
  render(<Harness url="https://cdn.example/preview.mp3" />);

  await user.click(screen.getByRole('button', { name: 'Toggle' }));
  expect(playMock).toHaveBeenCalledOnce();
  expect(screen.getByText('playing')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Toggle' }));
  expect(pauseMock).toHaveBeenCalledOnce();
  expect(screen.getByText('paused')).toBeInTheDocument();
});

test('stops audio when the URL changes and on unmount', () => {
  const { rerender, unmount } = render(<Harness url="https://cdn.example/one.mp3" />);

  rerender(<Harness url="https://cdn.example/two.mp3" />);
  expect(pauseMock).toHaveBeenCalled();
  expect(audio.currentTime).toBe(0);

  unmount();
  expect(pauseMock).toHaveBeenCalledTimes(2);
});
