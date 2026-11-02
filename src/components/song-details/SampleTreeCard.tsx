import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Pause, Play, Waveform } from '@phosphor-icons/react';
import { isPreviewUrl, type SampleMatch, type SampleNode } from '../../types/samples';
import { fetchSampleMatch, fetchSampleTree } from '../../api/SamplesAPI';
import { findSnippetUrl } from '../../lib/itunesPreview';
import { safeUrl } from '../../lib/safeUrl';

interface SampleTreeCardProps {
  title: string;
  artist: string;
  previewUrl?: string | null;
}

type Check =
  | { state: 'checking' }
  | { state: 'done'; match: SampleMatch; childUrl: string; parentUrl: string }
  | { state: 'no-preview'; who: string }
  | { state: 'error'; message: string };

const SEGMENT_SECONDS = 6;

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

/** Plays the child's matched stretch, then the parent's, sped to the child's tempo. */
function useAbPlayer() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const [playing, setPlaying] = useState<string | null>(null);

  const stop = useCallback(() => {
    window.clearTimeout(timer.current);
    audio.current?.pause();
    audio.current = null;
    setPlaying(null);
  }, []);
  useEffect(() => stop, [stop]);

  const segment = (url: string, start: number, rate: number, keepPitch: boolean) =>
    new Promise<void>((resolve, reject) => {
      const a = new Audio(url);
      audio.current = a;
      a.preservesPitch = keepPitch;
      a.onerror = () => reject(new Error('preview failed'));
      // Seek before playing so the clip starts at the matched spot, not at 0:00.
      a.onloadedmetadata = () => {
        a.currentTime = start;
        a.playbackRate = rate;
        a.play().then(() => {
          timer.current = window.setTimeout(() => { a.pause(); resolve(); }, (SEGMENT_SECONDS / rate) * 1000);
        }, reject);
      };
    });

  const play = useCallback(async (id: string, check: Extract<Check, { state: 'done' }>) => {
    stop();
    setPlaying(id);
    const { match } = check;
    try {
      await segment(check.childUrl, match.child_start_s, 1, true);
      if (audio.current === null) return;
      // Turntable samples change pitch with speed, so let the browser do the same.
      await segment(check.parentUrl, match.parent_start_s, match.speed, match.mode !== 'turntable');
    } catch {
      // autoplay blocked or preview gone; just stop
    }
    setPlaying((current) => (current === id ? null : current));
  }, [stop]);

  return { playing, play, stop };
}

function describe(match: SampleMatch, child: string, parent: string): string {
  const where = `Heard ${parent} at ${formatTime(match.parent_start_s)} inside ${child} at ${formatTime(match.child_start_s)}`;
  if (match.mode === 'unchanged') return `${where}, used as is.`;
  const shift = Math.abs(match.semitones) < 0.34 ? 'same pitch' : `${match.semitones > 0 ? '+' : ''}${match.semitones} semitones`;
  const speed = Math.abs(match.speed - 1) < 0.015 ? 'same speed' : `${match.speed.toFixed(2)}× speed`;
  const how = match.mode === 'turntable'
    ? (match.speed > 1 ? 'sped up like a record' : 'slowed down like a record')
    : 'pitch and tempo changed separately';
  return `${where}: ${shift}, ${speed}, ${how}.`;
}

// SongDetails keys this card by song, so a new song starts from fresh state.
const SampleTreeCard: React.FC<SampleTreeCardProps> = ({ title, artist, previewUrl }) => {
  const [tree, setTree] = useState<SampleNode | null | undefined>(undefined);
  const [audioCheck, setAudioCheck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checks, setChecks] = useState<Record<string, Check>>({});
  const player = useAbPlayer();
  const aborter = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    aborter.current = controller;
    fetchSampleTree(title, artist, controller.signal)
      .then((result) => {
        setTree(result?.tree ?? null);
        setAudioCheck(result?.audioCheck ?? false);
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Could not load samples.');
      });
    return () => controller.abort();
  }, [title, artist]);

  const check = useCallback(async (id: string, child: SampleNode, parent: SampleNode, childPreview?: string | null) => {
    setChecks((c) => ({ ...c, [id]: { state: 'checking' } }));
    const set = (value: Check) => setChecks((c) => ({ ...c, [id]: value }));
    try {
      // Reuse the page's preview only if it is an iTunes one; the matcher accepts nothing else.
      const childUrl = isPreviewUrl(childPreview) ? childPreview : await findSnippetUrl(child.artist, child.title);
      if (!childUrl) return set({ state: 'no-preview', who: child.title });
      const parentUrl = await findSnippetUrl(parent.artist, parent.title);
      if (!parentUrl) return set({ state: 'no-preview', who: parent.title });
      const match = await fetchSampleMatch(childUrl, parentUrl, aborter.current?.signal);
      set({ state: 'done', match, childUrl, parentUrl });
    } catch (e) {
      set({ state: 'error', message: e instanceof Error ? e.message : 'The audio check failed.' });
    }
  }, []);

  if (tree === null) return null;   // not on Genius: nothing to show

  const renderParents = (child: SampleNode, path: string, depth: number): React.ReactNode => (
    <ul className={depth ? 'ml-4 mt-3 space-y-4 border-l border-white/10 pl-4' : 'space-y-4'}>
      {child.parents.map((parent) => {
        const id = `${path}/${parent.geniusId}`;
        const result = checks[id];
        const href = safeUrl(parent.url);
        const interpolated = parent.relation === 'interpolates';
        return (
          <li key={id} className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-sm font-semibold text-white [overflow-wrap:anywhere]">{parent.title}</span>
              <span className="text-sm text-white/55">{parent.artist}{parent.year ? ` · ${parent.year}` : ''}</span>
              {href && (
                <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${parent.title} on Genius`}
                  className="inline-flex items-center text-white/35 hover:text-[var(--song-accent)]">
                  <ArrowUpRight size={13} weight="bold" aria-hidden="true" />
                </a>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="song-chip !px-2.5 !py-0.5 text-[10px] uppercase tracking-wider">
                {interpolated ? 're-played' : 'sampled'}
              </span>
              {audioCheck && !interpolated && !result && (
                <button type="button" className="song-text-action !min-h-8"
                  onClick={() => void check(id, child, parent, depth === 0 ? previewUrl : undefined)}>
                  <Waveform size={14} weight="bold" aria-hidden="true" /> Check the audio
                </button>
              )}
              {result?.state === 'checking' && <span className="text-xs text-white/45" role="status">Listening…</span>}
            </div>
            {result && result.state !== 'checking' && (
              <p className="mt-2 max-w-[65ch] text-xs leading-relaxed text-white/60" role="status">
                {result.state === 'done' && result.match.found && (
                  <>
                    {describe(result.match, child.title, parent.title)}{' '}
                    <button type="button" className="song-text-action !min-h-8 align-middle"
                      onClick={() => (player.playing === id ? player.stop() : void player.play(id, result))}>
                      {player.playing === id
                        ? <><Pause size={13} weight="bold" aria-hidden="true" /> Stop</>
                        : <><Play size={13} weight="bold" aria-hidden="true" /> Hear both</>}
                    </button>
                  </>
                )}
                {result.state === 'done' && !result.match.found
                  && 'Not confirmed in these 30-second previews. The sampled part may be outside them.'}
                {result.state === 'no-preview' && `iTunes has no preview for ${result.who}, so the audio can't be checked.`}
                {result.state === 'error' && result.message}
              </p>
            )}
            {parent.parents.length > 0 && renderParents(parent, id, depth + 1)}
          </li>
        );
      })}
    </ul>
  );

  return (
    <article className="song-card song-card--wide" aria-labelledby="song-samples-heading" aria-busy={tree === undefined && !error}>
      <h2 id="song-samples-heading" className="song-eyebrow">Sample Family Tree</h2>
      {error ? (
        <p className="text-sm text-white/60" role="alert">{error}</p>
      ) : tree === undefined ? (
        <p className="text-sm text-white/45" role="status">Looking up samples on Genius…</p>
      ) : tree.parents.length === 0 ? (
        <p className="text-sm text-white/60">Genius lists no samples or interpolations for this song.</p>
      ) : (
        <>
          <p className="mb-5 max-w-[65ch] text-sm leading-relaxed text-white/60">
            What {tree.title} borrows from, according to Genius.{' '}
            {audioCheck
              ? '“Check the audio” compares the two songs’ 30-second previews and, if it hears the sample, shows where and how it was changed.'
              : 'Audio checks are off on this deployment; they run where the sample matcher service is deployed.'}
          </p>
          {renderParents(tree, String(tree.geniusId), 0)}
        </>
      )}
    </article>
  );
};

export default SampleTreeCard;
