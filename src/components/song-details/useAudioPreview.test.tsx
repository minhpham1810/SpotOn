import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useAudioPreview } from './useAudioPreview';

const onErrorMock = vi.fn();

type AudioMock = {
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  currentTime: number;
  onended: (() => void) | null;
  onerror: (() => void) | null;
};

const audioInstances: AudioMock[] = [];

function createAudioMock(): AudioMock {
  return {
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    currentTime: 0,
    onended: null,
    onerror: null,
  };
}

function createDeferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

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
  audioInstances.length = 0;
  onErrorMock.mockClear();
  vi.stubGlobal('Audio', vi.fn(function () {
    const audio = createAudioMock();
    audioInstances.push(audio);
    return audio;
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test('reports unavailable without a preview URL', () => {
  render(<Harness url={null} />);

  expect(screen.getByText('unavailable')).toBeInTheDocument();
});

test('plays and pauses an available preview', async () => {
  const user = userEvent.setup();
  render(<Harness url="https://cdn.example/preview.mp3" />);
  const audio = audioInstances[0];

  await user.click(screen.getByRole('button', { name: 'Toggle' }));
  expect(audio.play).toHaveBeenCalledOnce();
  expect(screen.getByText('playing')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Toggle' }));
  expect(audio.pause).toHaveBeenCalledOnce();
  expect(screen.getByText('paused')).toBeInTheDocument();
});

test('stops the replaced audio and the active audio on unmount', () => {
  const { rerender, unmount } = render(<Harness url="https://cdn.example/one.mp3" />);
  const firstAudio = audioInstances[0];

  rerender(<Harness url="https://cdn.example/two.mp3" />);
  const secondAudio = audioInstances[1];
  expect(firstAudio.pause).toHaveBeenCalledOnce();
  expect(firstAudio.currentTime).toBe(0);

  unmount();
  expect(secondAudio.pause).toHaveBeenCalledOnce();
  expect(secondAudio.currentTime).toBe(0);
});

test('ignores a second toggle while play is pending', async () => {
  const user = userEvent.setup();
  const play = createDeferred();
  render(<Harness url="https://cdn.example/preview.mp3" />);
  const audio = audioInstances[0];
  audio.play.mockReturnValue(play.promise);

  await user.click(screen.getByRole('button', { name: 'Toggle' }));
  await user.click(screen.getByRole('button', { name: 'Toggle' }));
  expect(audio.play).toHaveBeenCalledOnce();

  await act(async () => {
    play.resolve();
  });
  expect(screen.getByText('playing')).toBeInTheDocument();
});

test('reports a rejected current play request and returns to idle', async () => {
  const user = userEvent.setup();
  const play = createDeferred();
  render(<Harness url="https://cdn.example/preview.mp3" />);
  const audio = audioInstances[0];
  audio.play.mockReturnValue(play.promise);

  await user.click(screen.getByRole('button', { name: 'Toggle' }));
  await act(async () => {
    play.reject(new Error('blocked'));
  });

  expect(screen.getByText('idle')).toBeInTheDocument();
  expect(onErrorMock).toHaveBeenCalledOnce();
});

test('handles current ended and error events', async () => {
  const user = userEvent.setup();
  render(<Harness url="https://cdn.example/preview.mp3" />);
  const audio = audioInstances[0];

  await user.click(screen.getByRole('button', { name: 'Toggle' }));
  act(() => audio.onended?.());
  expect(screen.getByText('idle')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Toggle' }));
  act(() => audio.onerror?.());
  expect(screen.getByText('idle')).toBeInTheDocument();
  expect(onErrorMock).toHaveBeenCalledOnce();
});

test('ignores stale play resolution and event callbacks after a URL replacement', async () => {
  const user = userEvent.setup();
  const play = createDeferred();
  const { rerender } = render(<Harness url="https://cdn.example/one.mp3" />);
  const firstAudio = audioInstances[0];
  firstAudio.play.mockReturnValue(play.promise);

  await user.click(screen.getByRole('button', { name: 'Toggle' }));
  const staleEnded = firstAudio.onended;
  const staleError = firstAudio.onerror;
  rerender(<Harness url="https://cdn.example/two.mp3" />);

  expect(firstAudio.onended).toBeNull();
  expect(firstAudio.onerror).toBeNull();
  await act(async () => {
    play.resolve();
  });
  act(() => {
    staleEnded?.();
    staleError?.();
  });

  expect(screen.getByText('idle')).toBeInTheDocument();
  expect(onErrorMock).not.toHaveBeenCalled();
});

test('ignores stale play rejection and event callbacks after unmount', async () => {
  const user = userEvent.setup();
  const play = createDeferred();
  const { unmount } = render(<Harness url="https://cdn.example/preview.mp3" />);
  const audio = audioInstances[0];
  audio.play.mockReturnValue(play.promise);

  await user.click(screen.getByRole('button', { name: 'Toggle' }));
  const staleEnded = audio.onended;
  const staleError = audio.onerror;
  unmount();

  expect(audio.onended).toBeNull();
  expect(audio.onerror).toBeNull();
  await act(async () => {
    play.reject(new Error('aborted'));
  });
  act(() => {
    staleEnded?.();
    staleError?.();
  });

  expect(onErrorMock).not.toHaveBeenCalled();
});
