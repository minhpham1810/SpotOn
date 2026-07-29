import { useCallback, useEffect, useRef, useState } from 'react';

export type AudioPreviewState = 'unavailable' | 'idle' | 'playing' | 'paused';

export interface AudioPreviewController {
  state: AudioPreviewState;
  toggle: () => Promise<void>;
  stop: () => void;
}

interface PreviewPlayback {
  url: string;
  state: Exclude<AudioPreviewState, 'unavailable'>;
}

export function useAudioPreview(
  previewUrl: string | null | undefined,
  onError: () => void
): AudioPreviewController {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const generationRef = useRef(0);
  const pendingPlayRef = useRef<symbol | null>(null);
  const activePlaybackRef = useRef<symbol | null>(null);
  const [playback, setPlayback] = useState<PreviewPlayback | null>(
    previewUrl ? { url: previewUrl, state: 'idle' } : null
  );
  const state: AudioPreviewState = previewUrl
    ? playback?.url === previewUrl
      ? playback.state
      : 'idle'
    : 'unavailable';

  const setCurrentState = useCallback((
    url: string,
    nextState: PreviewPlayback['state']
  ) => {
    setPlayback({ url, state: nextState });
  }, []);

  const isCurrentPlayback = useCallback((audio: HTMLAudioElement, generation: number, token: symbol) => (
    generationRef.current === generation
    && audioRef.current === audio
    && activePlaybackRef.current === token
  ), []);

  const stop = useCallback(() => {
    generationRef.current += 1;
    pendingPlayRef.current = null;
    activePlaybackRef.current = null;

    const audio = audioRef.current;
    if (!audio) return;

    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    audio.currentTime = 0;
    audioRef.current = null;
  }, []);

  useEffect(() => {
    stop();

    if (!previewUrl) return stop;

    audioRef.current = new Audio(previewUrl);

    return stop;
  }, [previewUrl, stop]);

  const toggle = useCallback(async () => {
    if (!previewUrl || pendingPlayRef.current) return;

    const audio = audioRef.current;
    if (!audio) return;

    if (state === 'playing') {
      generationRef.current += 1;
      pendingPlayRef.current = null;
      activePlaybackRef.current = null;
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      setCurrentState(previewUrl, 'paused');
      return;
    }

    const generation = generationRef.current;
    const token = Symbol('audio-preview-playback');
    pendingPlayRef.current = token;
    activePlaybackRef.current = token;
    audio.onended = () => {
      if (!isCurrentPlayback(audio, generation, token)) return;

      pendingPlayRef.current = null;
      activePlaybackRef.current = null;
      setCurrentState(previewUrl, 'idle');
    };
    audio.onerror = () => {
      if (!isCurrentPlayback(audio, generation, token)) return;

      pendingPlayRef.current = null;
      activePlaybackRef.current = null;
      setCurrentState(previewUrl, 'idle');
      onError();
    };

    try {
      await audio.play();
      if (!isCurrentPlayback(audio, generation, token) || pendingPlayRef.current !== token) return;

      pendingPlayRef.current = null;
      setCurrentState(previewUrl, 'playing');
    } catch {
      if (!isCurrentPlayback(audio, generation, token) || pendingPlayRef.current !== token) return;

      pendingPlayRef.current = null;
      activePlaybackRef.current = null;
      setCurrentState(previewUrl, 'idle');
      onError();
    }
  }, [isCurrentPlayback, onError, previewUrl, setCurrentState, state]);

  return { state, toggle, stop };
}
