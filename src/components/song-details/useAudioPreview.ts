import { useCallback, useEffect, useRef, useState } from 'react';

export type AudioPreviewState = 'unavailable' | 'idle' | 'playing' | 'paused';

export interface AudioPreviewController {
  state: AudioPreviewState;
  toggle: () => Promise<void>;
  stop: () => void;
}

export function useAudioPreview(
  previewUrl: string | null | undefined,
  onError: () => void
): AudioPreviewController {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AudioPreviewState>(previewUrl ? 'idle' : 'unavailable');

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    audioRef.current = null;
  }, []);

  useEffect(() => {
    stop();

    if (!previewUrl) {
      setState('unavailable');
      return stop;
    }

    audioRef.current = new Audio(previewUrl);
    setState('idle');

    return stop;
  }, [previewUrl, stop]);

  const toggle = useCallback(async () => {
    if (!previewUrl) return;

    if (state === 'playing') {
      audioRef.current?.pause();
      setState('paused');
      return;
    }

    const audio = audioRef.current ?? new Audio(previewUrl);
    audioRef.current = audio;
    audio.onended = () => setState('idle');
    audio.onerror = () => {
      setState('idle');
      onError();
    };

    try {
      await audio.play();
      setState('playing');
    } catch {
      setState('idle');
      onError();
    }
  }, [onError, previewUrl, state]);

  return { state, toggle, stop };
}
