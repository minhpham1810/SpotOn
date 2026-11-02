"""Pitch- and tempo-invariant triplet fingerprints for checking a known (child, parent) sample pair.

Peaks in a log-frequency (constant-Q) spectrogram are grouped into triplets: an anchor plus two
louder peaks in a target zone after it. The hash keeps only frequency *differences* (unchanged by a
pitch shift) and the ratio of the two time gaps (unchanged by a speed change). Every hash hit implies
a (pitch shift, speed, offset); a reused recording makes many hits agree, chance hits scatter.

The raw vote count depends on the songs (sparse, repetitive drums match everything), so the score is
normalized against how well each side matches a fixed set of unrelated background songs ("s-norm",
as in speaker verification). Design notes and measurements: docs/designs/sample-archaeology.md.
"""
from __future__ import annotations

import itertools
from collections import Counter, defaultdict
from dataclasses import dataclass, field

import librosa
import numpy as np
from scipy.ndimage import maximum_filter

SR = 22050
HOP = 256
FPS = SR / HOP
BINS_PER_OCTAVE = 36                 # 3 bins per semitone
N_BINS = BINS_PER_OCTAVE * 7         # C1..B7
PEAK_F, PEAK_T = 7, 21               # local-max neighbourhood: 7 bins x ~0.24 s
PEAKS_PER_SECOND = 25
DT_MIN, DT_MAX = 3, int(1.5 * FPS)   # target zone after the anchor
DF_MAX = 2 * BINS_PER_OCTAVE
FAN = 10                             # loudest peaks paired per anchor
FREQ_Q = 3                           # hash frequency differences in semitones
RATIO_Q = 16                         # hash time-gap ratio in 1/16 steps
MAX_SEMITONES = 8
SPEED_MIN, SPEED_MAX = 0.66, 1.5
OFFSET_BIN_S = 0.25
LOG_SPEED_BIN = 0.01

Hash = tuple[int, int, int]


@dataclass
class Fingerprint:
    """Triplets of one clip and their hash index (the index is only needed on the parent side)."""
    triplets: list[tuple[Hash, int, int, int]]          # (hash, anchor frame, anchor bin, span frames)
    duration_s: float
    index: dict[Hash, list[tuple[int, int, int]]] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.index:
            idx: dict[Hash, list[tuple[int, int, int]]] = defaultdict(list)
            for h, t0, f0, span in self.triplets:
                idx[h].append((t0, f0, span))
            self.index = dict(idx)


@dataclass
class Votes:
    count: int
    semitones: float
    speed: float
    child_start_s: float
    child_end_s: float
    parent_start_s: float


def _peaks(y: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    spec = np.log1p(10 * np.abs(librosa.cqt(y=y, sr=SR, hop_length=HOP, n_bins=N_BINS,
                                            bins_per_octave=BINS_PER_OCTAVE)))
    is_peak = (spec == maximum_filter(spec, size=(PEAK_F, PEAK_T))) & (spec > 0)
    f, t = np.nonzero(is_peak)
    mag = spec[f, t]
    keep: list[int] = []
    second = (t / FPS).astype(int)
    for s in np.unique(second):                          # strongest peaks in each second
        ids = np.nonzero(second == s)[0]
        keep.extend(ids[np.argsort(mag[ids])[::-1][:PEAKS_PER_SECOND]])
    order = np.array(sorted(keep, key=lambda i: t[i]), dtype=int)
    if order.size == 0:
        return np.array([], int), np.array([], int), np.array([])
    return t[order], f[order], mag[order]


def fingerprint(y: np.ndarray) -> Fingerprint:
    """Fingerprint mono audio at SR."""
    t, f, mag = _peaks(y)
    trips: list[tuple[Hash, int, int, int]] = []
    n = len(t)
    for i in range(n):
        zone = []
        for j in range(i + 1, n):
            dt = t[j] - t[i]
            if dt > DT_MAX:
                break
            if dt >= DT_MIN and abs(int(f[j]) - int(f[i])) <= DF_MAX:
                zone.append(j)
        # loudest peaks in the zone, not the nearest: a new drum hit in a mix shouldn't change the pairing
        zone = sorted(sorted(zone, key=lambda j: -mag[j])[:FAN])
        for j, k in itertools.combinations(zone, 2):
            d1, d2 = int(t[j] - t[i]), int(t[k] - t[i])
            if d2 <= d1:
                continue
            h = (round((int(f[j]) - int(f[i])) / FREQ_Q), round((int(f[k]) - int(f[i])) / FREQ_Q),
                 round(RATIO_Q * d1 / d2))
            trips.append((h, int(t[i]), int(f[i]), d2))
    return Fingerprint(trips, len(y) / SR)


def vote(child: Fingerprint, parent: Fingerprint) -> Votes:
    """Best-agreeing (pitch shift, speed, offset) for child = parent pitched and played `speed` times faster."""
    cells: Counter[tuple[int, int, int]] = Counter()
    hits: dict[tuple[int, int, int], list[tuple[int, int]]] = defaultdict(list)
    for h, tc, fc, dc in child.triplets:
        for tp, fp, dp in parent.index.get(h, ()):
            speed = dp / dc
            if not SPEED_MIN <= speed <= SPEED_MAX:
                continue
            k = fc - fp                                   # pitch shift in 1/3 semitones
            if abs(k) > 3 * MAX_SEMITONES:
                continue
            offset = tp - tc * speed                      # parent frame at child frame 0
            cell = (k, round(np.log(speed) / LOG_SPEED_BIN), round(offset / (OFFSET_BIN_S * FPS)))
            cells[cell] += 1
            hits[cell].append((tc, tp))
    if not cells:
        return Votes(0, 0.0, 1.0, 0.0, 0.0, 0.0)

    # A real match smears over neighbouring cells, so score each candidate with its 3x3x3 neighbourhood.
    near = [(a, b, c) for a in (-1, 0, 1) for b in (-1, 0, 1) for c in (-1, 0, 1)]
    best, centre = 0, next(iter(cells))
    for (k, ls, o), _ in cells.most_common(50):
        total = sum(cells.get((k + a, ls + b, o + c), 0) for a, b, c in near)
        if total > best:
            best, centre = total, (k, ls, o)
    k, ls, _ = centre
    pairs = [p for a, b, c in near for p in hits.get((centre[0] + a, centre[1] + b, centre[2] + c), ())]
    tcs = np.array([p[0] for p in pairs])
    tps = np.array([p[1] for p in pairs])
    lo, hi = np.percentile(tcs, [10, 90]) if len(tcs) > 4 else (tcs.min(), tcs.max())
    first = int(np.argmin(np.abs(tcs - lo)))
    return Votes(best, k / 3, float(np.exp(ls * LOG_SPEED_BIN)),
                 float(lo / FPS), float(hi / FPS), float(tps[first] / FPS))


@dataclass
class Match:
    found: bool
    score: float
    votes: int
    semitones: float
    speed: float
    mode: str                       # "unchanged" | "turntable" | "stretched" | "none"
    child_start_s: float
    child_end_s: float
    parent_start_s: float


THRESHOLD = 7.5    # s-norm score; chosen on the dev split (matcher/eval/RESULTS.md), never on the test split


def s_norm(raw: int, child_vs_bg: list[int], bg_vs_parent: list[int]) -> float:
    c, p = np.array(child_vs_bg, float), np.array(bg_vs_parent, float)
    return float(0.5 * ((raw - c.mean()) / (c.std() + 1) + (raw - p.mean()) / (p.std() + 1)))


def match(child: Fingerprint, parent: Fingerprint, background: list[Fingerprint],
          threshold: float = THRESHOLD) -> Match:
    if len(background) < 3:
        raise ValueError("need at least 3 background fingerprints to normalize the score")
    v = vote(child, parent)
    score = s_norm(v.count, [vote(child, b).count for b in background], [vote(b, parent).count for b in background])
    found = score >= threshold
    if not found:
        mode = "none"
    elif abs(v.semitones) < 0.34 and abs(v.speed - 1) < 0.015:   # within one pitch bin / speed bin
        mode = "unchanged"
    elif abs(v.semitones - 12 * np.log2(v.speed)) <= 0.5:      # a faster record is 12*log2(speed) higher
        mode = "turntable"
    else:
        mode = "stretched"
    return Match(found, round(score, 2), v.count, round(v.semitones, 2), round(v.speed, 3), mode,
                 round(v.child_start_s, 2), round(v.child_end_s, 2), round(v.parent_start_s, 2))
