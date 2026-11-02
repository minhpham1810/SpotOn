"""Mechanics tests on synthetic audio with exact ground truth.

These check that the detector recovers a planted transform and ranks planted samples above unrelated
songs. The `found` threshold is calibrated on real previews (matcher/eval), not here.
"""
import functools

import pytest

from samplematch import synth
from samplematch.fingerprint import fingerprint, match

BACKGROUND_SEEDS = range(100, 112)
UNRELATED = [(3, 4), (5, 6), (7, 1), (2, 8), (9, 10), (11, 3)]
CASES = [
    (0.0, 1.0),       # straight lift
    (1.0, 1.06),      # turntable: +1 semitone is 12*log2(1.06)
    (-3.0, 0.84),     # slowed turntable
    (3.0, 1.0),       # pitched in software, tempo kept
    (4.0, 1.2),       # sped up and pitched further in software
]


@functools.cache
def fp(seed: int):
    return fingerprint(synth.song(seed))


@functools.cache
def background():
    return [fp(s) for s in BACKGROUND_SEEDS]


@functools.cache
def unrelated_max() -> float:
    return max(match(fp(c), fp(p), background()).score for c, p in UNRELATED)


@functools.cache
def planted(semitones: float, speed: float):
    child = synth.plant(synth.song(1), synth.song(2), semitones, speed, parent_from_s=5, child_at_s=12)
    return match(fingerprint(child), fp(1), background())


@pytest.mark.parametrize("semitones,speed", CASES)
def test_planted_sample_outranks_every_unrelated_pair(semitones, speed):
    m = planted(semitones, speed)
    assert m.score > unrelated_max(), (m, unrelated_max())


@pytest.mark.parametrize("semitones,speed", CASES)
def test_planted_transform_and_position_are_recovered(semitones, speed):
    m = planted(semitones, speed)
    assert abs(m.semitones - semitones) <= 0.34, m
    assert abs(m.speed - speed) <= 0.02, m
    # the matched region lies inside the planted 10 s, and the parent position agrees with it
    assert 11 <= m.child_start_s <= 20 and m.child_end_s <= 23, m
    assert abs((m.parent_start_s - 5) - (m.child_start_s - 12) * speed) <= 0.6, m


def test_unchanged_turntable_and_software_shifts_are_told_apart():
    parent, bed = synth.song(1), synth.song(2)
    unchanged = match(fingerprint(synth.plant(parent, bed, 0.0, 1.0)), fp(1), background(), threshold=0)
    turntable = match(fingerprint(synth.plant(parent, bed, 1.0, 1.06)), fp(1), background(), threshold=0)
    software = match(fingerprint(synth.plant(parent, bed, 3.0, 1.0)), fp(1), background(), threshold=0)
    assert unchanged.mode == "unchanged", unchanged
    assert turntable.mode == "turntable", turntable
    assert software.mode == "stretched", software


def test_found_follows_the_threshold():
    m = planted(0.0, 1.0)
    assert match_with(m.score - 0.01).found and not match_with(m.score + 0.01).found


def match_with(threshold: float):
    child = synth.plant(synth.song(1), synth.song(2), 0.0, 1.0, parent_from_s=5, child_at_s=12)
    return match(fingerprint(child), fp(1), background(), threshold=threshold)


def test_unrelated_pairs_report_no_mode():
    c, p = UNRELATED[0]
    m = match(fp(c), fp(p), background(), threshold=unrelated_max() + 0.01)
    assert not m.found and m.mode == "none", m


def test_background_is_required():
    with pytest.raises(ValueError):
        match(fp(1), fp(2), [fp(3)])
