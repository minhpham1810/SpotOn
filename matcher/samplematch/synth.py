"""Synthetic songs with known ground truth, so tests and CI never need copyrighted audio."""
from __future__ import annotations

import librosa
import numpy as np

from .fingerprint import SR

SCALE = [0, 2, 3, 5, 7, 8, 10]  # natural minor


def _tone(freq: float, dur: float, rng: np.random.Generator, harmonics: int = 6) -> np.ndarray:
    t = np.arange(int(dur * SR)) / SR
    n = int(rng.integers(2, harmonics + 3))
    stretch = rng.uniform(0, 0.004)                          # slightly inharmonic overtones, like real strings
    amps = rng.uniform(0.1, 1.0, n) / np.arange(1, n + 1) ** rng.uniform(0.5, 2)
    wave = sum(a * np.sin(2 * np.pi * freq * (h + 1) * np.sqrt(1 + stretch * (h + 1) ** 2) * t)
               for h, a in enumerate(amps))
    return wave * np.exp(-t * rng.uniform(1.0, 8.0)) * np.minimum(1, t * 200)


def _drum(kind: str, rng: np.random.Generator) -> np.ndarray:
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    if kind == "kick":
        return np.sin(2 * np.pi * (50 + 120 * np.exp(-t * 30)) * t) * np.exp(-t * 12)
    noise = rng.standard_normal(n)
    if kind == "hat":
        noise = np.diff(noise, prepend=0)
        return 0.3 * noise * np.exp(-t * 60)
    return 0.6 * noise * np.exp(-t * 25)


def song(seed: int, seconds: float = 30.0) -> np.ndarray:
    """A loop-based track: bass, chords, melody and drums from one random seed."""
    rng = np.random.default_rng(seed)
    bpm = rng.uniform(80, 130)
    beat = 60 / bpm
    root = 33 + int(rng.integers(0, 12))                   # MIDI note of the key's bass root
    out = np.zeros(int(seconds * SR) + SR)
    def add(x: np.ndarray, at: float, gain: float) -> None:
        i = int(at * SR)
        n = min(len(x), len(out) - i)
        if n > 0:
            out[i:i + n] += gain * x[:n]
    bar_degrees = rng.choice(len(SCALE), size=4)
    melody = rng.choice(len(SCALE), size=16)
    t, step = 0.0, 0
    while t < seconds:
        if step % 16 == 0:                                   # a fresh drum bar each time, not one loop
            pattern = rng.random((16, 3)) < [0.35, 0.25, 0.6]
        human = rng.normal(0, 0.012)                          # played by a person, not a grid
        t_play = max(0.0, t + human)
        bar = int(t / (4 * beat)) % 4
        deg = SCALE[bar_degrees[bar]]
        if step % 16 == 0:
            for third in (0, 2, 4):
                note = root + 24 + SCALE[(bar_degrees[bar] + third) % 7] + 12 * ((bar_degrees[bar] + third) // 7)
                add(_tone(librosa.midi_to_hz(note), 4 * beat, rng, 4), t_play, rng.uniform(0.08, 0.2))
        if step % 4 == 0:
            add(_tone(librosa.midi_to_hz(root + deg), beat * rng.uniform(0.5, 1), rng, 3), t_play, rng.uniform(0.3, 0.6))
        if step % 2 == 0 and rng.random() < 0.7:
            add(_tone(librosa.midi_to_hz(root + 36 + SCALE[melody[(step // 2) % 16]]), beat * rng.uniform(0.25, 1), rng), t_play, rng.uniform(0.1, 0.3))
        for kind, on in zip(("kick", "snare", "hat"), pattern[step % 16]):
            if on:
                add(_drum(kind, rng), t_play, rng.uniform(0.3, 0.6))
        t += beat / 4
        step += 1
    out = out[: int(seconds * SR)] + 0.01 * rng.standard_normal(int(seconds * SR))
    return (out / (np.abs(out).max() + 1e-9)).astype(np.float32)


def transform(y: np.ndarray, semitones: float, speed: float) -> np.ndarray:
    """What a producer does: play `speed` times faster (turntable) then shift any remaining pitch."""
    out = librosa.resample(y, orig_sr=SR, target_sr=SR / speed) if speed != 1 else y
    extra = semitones - 12 * np.log2(speed)
    if abs(extra) > 0.01:
        out = librosa.effects.pitch_shift(out, sr=SR, n_steps=extra)
    return out


def plant(parent: np.ndarray, bed: np.ndarray, semitones: float, speed: float,
          parent_from_s: float = 5.0, seconds: float = 10.0, child_at_s: float = 12.0,
          gain: float = 0.8) -> np.ndarray:
    """Lay `seconds` of transformed parent (taken from parent_from_s) under a new track at child_at_s."""
    excerpt = parent[int(parent_from_s * SR): int((parent_from_s + seconds * speed) * SR)]
    excerpt = transform(excerpt, semitones, speed)
    child = bed.copy()
    at = int(child_at_s * SR)
    n = min(len(excerpt), len(child) - at)
    child[at:at + n] = 0.5 * child[at:at + n] + gain * excerpt[:n]
    return child
