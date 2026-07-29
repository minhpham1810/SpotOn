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
  const generationRef = useRef(0);
  const pendingPlayRef = useRef<symbol | null>(null);
  const activePlaybackRef = useRef<symbol | null>(null);
  const [state, setState] = useState<AudioPreviewState>(previewUrl ? 'idle' : 'unavailable');

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

    if (!previewUrl) {
      setState('unavailable');
      return stop;
    }

    audioRef.current = new Audio(previewUrl);
    setState('idle');

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
      setState('paused');
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
      setState('idle');
    };
    audio.onerror = () => {
      if (!isCurrentPlayback(audio, generation, token)) return;

      pendingPlayRef.current = null;
      activePlaybackRef.current = null;
      setState('idle');
      onError();
    };

    try {
      await audio.play();
      if (!isCurrentPlayback(audio, generation, token) || pendingPlayRef.current !== token) return;

      pendingPlayRef.current = null;
      setState('playing');
    } catch {
      if (!isCurrentPlayback(audio, generation, token) || pendingPlayRef.current !== token) return;

      pendingPlayRef.current = null;
      activePlaybackRef.current = null;
      setState('idle');
      onError();
    }
  }, [isCurrentPlayback, onError, previewUrl, state]);

  return { state, toggle, stop };
}
