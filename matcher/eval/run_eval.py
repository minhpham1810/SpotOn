"""Real-audio evaluation on iTunes previews. Manual run (needs network + GENIUS_ACCESS_TOKEN), not CI.

  dev  : the 6 pairs from the first spike; the threshold is chosen here.
  test : pairs pulled from Genius "samples" links of seed songs never used for tuning; reported only.
  negatives: unrelated pairs within each split (no Genius link either way), 2 per positive.

Writes matcher/eval/RESULTS.md. No audio is saved.
  GENIUS_ACCESS_TOKEN=... python -m eval.run_eval      (from matcher/)
"""
from __future__ import annotations

import datetime
import json
import os
import pathlib
import random
import time
import urllib.parse
import urllib.request

import numpy as np

from samplematch import background as bgmod
from samplematch.audio import AudioError, _key, itunes_preview_url, preview_fingerprint
from samplematch.fingerprint import THRESHOLD, match

DEV = [  # (child artist, child title, parent artist, parent title)
    ("Kanye West", "Stronger", "Daft Punk", "Harder Better Faster Stronger"),
    ("Daft Punk", "Harder Better Faster Stronger", "Edwin Birdsong", "Cola Bottle Baby"),
    ("Kanye West", "Through the Wire", "Chaka Khan", "Through the Fire"),
    ("Vanilla Ice", "Ice Ice Baby", "Queen", "Under Pressure"),
    ("A Tribe Called Quest", "Can I Kick It?", "Lou Reed", "Walk on the Wild Side"),
    ("Kanye West", "Gold Digger", "Ray Charles", "I Got a Woman"),
]
TEST_SEEDS = [
    ("JAY-Z", "Hard Knock Life (Ghetto Anthem)"), ("The Notorious B.I.G.", "Juicy"),
    ("Coolio", "Gangsta's Paradise"), ("MC Hammer", "U Can't Touch This"), ("Eminem", "Stan"),
    ("Kanye West", "Touch the Sky"), ("The Verve", "Bitter Sweet Symphony"), ("Fatboy Slim", "Praise You"),
    ("Moby", "Natural Blues"), ("Drake", "Hotline Bling"), ("Kendrick Lamar", "Money Trees"),
    ("Kanye West", "Blood on the Leaves"), ("JAY-Z", "Izzo (H.O.V.A.)"), ("Wu-Tang Clan", "C.R.E.A.M."),
    ("Dr. Dre", "Nuthin' but a 'G' Thang"), ("Lil Nas X", "Old Town Road"), ("Daft Punk", "One More Time"),
    ("Puff Daddy", "I'll Be Missing You"), ("Beyoncé", "Crazy in Love"), ("Mark Ronson", "Ooh Wee"),
    ("Kanye West", "Otis"), ("Nas", "The World Is Yours"), ("Missy Elliott", "Work It"),
    ("The Avalanches", "Since I Left You"),
]
PARENTS_PER_SEED = 2
OUT = pathlib.Path(__file__).with_name("RESULTS.md")


def genius(path: str) -> dict:
    req = urllib.request.Request(f"https://api.genius.com{path}",
                                 headers={"Authorization": f"Bearer {os.environ['GENIUS_ACCESS_TOKEN']}"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.load(r)["response"]


def genius_song(artist: str, title: str) -> dict | None:
    hits = genius(f"/search?q={urllib.parse.quote(f'{title} {artist}')}")["hits"]
    return genius(f"/songs/{hits[0]['result']['id']}")["song"] if hits else None


def same_song(a: tuple[str, str], b: tuple[str, str]) -> bool:
    return _key(a[0]) == _key(b[0]) and _key(b[1]).startswith(_key(a[1]))


def test_pairs() -> tuple[list[tuple[str, str, str, str]], set[frozenset]]:
    pairs, links = [], set()
    for artist, title in TEST_SEEDS:
        song = genius_song(artist, title)
        if not song:
            continue
        name = (song["primary_artist"]["name"], song["title"])
        for rel in song.get("song_relationships", []):
            for other in rel["songs"]:
                links.add(frozenset((name, (other["primary_artist"]["name"], other["title"]))))
            if rel["relationship_type"] == "samples":
                # skip the song's own instrumental/remix listed as a "sample": same recording, trivially found
                parents = [s for s in rel["songs"] if not same_song(name, (s["primary_artist"]["name"], s["title"]))]
                for parent in parents[:PARENTS_PER_SEED]:
                    pairs.append((*name, parent["primary_artist"]["name"], parent["title"]))
    return pairs, links


def preview(song: tuple[str, str]) -> str:
    """iTunes search allows ~20 calls/min per IP: space them out and wait once on a 429."""
    for attempt in range(2):
        time.sleep(3.2)
        try:
            return itunes_preview_url(*song) or ""
        except AudioError:
            if attempt:
                raise
            time.sleep(65)
    return ""


def score_split(name, pairs, links, rng):
    songs: dict[tuple[str, str], str] = {}
    for ca, ct, pa, pt in pairs:
        for song in ((ca, ct), (pa, pt)):
            if song not in songs:
                songs[song] = preview(song)
    positives = [((ca, ct), (pa, pt)) for ca, ct, pa, pt in pairs if songs[(ca, ct)] and songs[(pa, pt)]]
    available = sorted({s for p in positives for s in p})
    bg_urls = {u for u, _ in BG.items}
    overlap = [s for s in available if songs[s] in bg_urls]
    assert not overlap, f"background overlaps {name}: {overlap}"
    related = links | {frozenset(p) for p in positives}
    candidates = [(a, b) for a in available for b in available if a != b and frozenset((a, b)) not in related]
    negatives = rng.sample(candidates, min(len(candidates), 2 * len(positives)))

    def run(child, parent):
        t0 = time.perf_counter()
        try:
            m = match(preview_fingerprint(songs[child]), preview_fingerprint(songs[parent]),
                      BG.excluding(songs[child], songs[parent]))
        except AudioError as e:
            print("  skip", child, parent, e)
            return None
        return m, time.perf_counter() - t0
    pos = [(c, p, *r) for c, p in positives if (r := run(c, p))]
    neg = [(c, p, *r) for c, p in negatives if (r := run(c, p))]
    print(f"{name}: {len(pairs)} Genius pairs, {len(positives)} with both previews, {len(neg)} negatives")
    return pos, neg, len(pairs)


def table(rows):
    lines = ["| Child | Parent | Score | Found | Semitones | Speed | Mode | Child at |",
             "|---|---|---:|:---:|---:|---:|---|---:|"]
    for c, p, m, _ in sorted(rows, key=lambda r: -r[2].score):
        lines.append(f"| {c[1]} - {c[0]} | {p[1]} - {p[0]} | {m.score:.1f} | {'yes' if m.found else ''} "
                     f"| {m.semitones:+.2f} | {m.speed:.3f} | {m.mode} | {m.child_start_s:.1f}s |")
    return "\n".join(lines)


def rates(pos, neg):
    tp = sum(m.found for *_, m, _ in pos)
    fp = sum(m.found for *_, m, _ in neg)
    return tp, len(pos), fp, len(neg)


if __name__ == "__main__":
    rng = random.Random(0)
    BG = bgmod.Background()
    BG.load()
    print(f"background: {len(BG.items)} of {len(bgmod.SONGS)}")
    dev_pos, dev_neg, dev_n = score_split("dev", DEV, set(), rng)
    tpairs, tlinks = test_pairs()
    test_pos, test_neg, test_n = score_split("test", tpairs, tlinks, rng)

    dev_neg_max = max(m.score for *_, m, _ in dev_neg)
    suggested = round(dev_neg_max + 0.5, 1)
    d, t = rates(dev_pos, dev_neg), rates(test_pos, test_neg)
    times = [s for *_, s in dev_pos + dev_neg + test_pos + test_neg]
    report = f"""# Matcher evaluation on real previews

Generated {datetime.date.today().isoformat()} by `python -m eval.run_eval` (matcher version `fp1`).
30-second iTunes previews only; background set {len(BG.items)} songs. Threshold in use: **{THRESHOLD}**
(dev negatives max {dev_neg_max:.1f}, so the dev split suggests {suggested}).

The threshold was fixed at {THRESHOLD} from the spike before the test split was first run, and kept: the dev
split's suggestion rests on only {len(dev_neg)} unrelated pairs, too few to see the noise tail, and a false
"verified" badge costs more than "not confirmed". The test split was not used for tuning: it was run three
times while building, and the changes between runs were data cleaning (dropping a song's own instrumental
listed as a "sample") and plumbing (decoder, throttled iTunes lookups), never features or the threshold.

| Split | Real pairs found | Unrelated pairs wrongly found |
|---|---|---|
| dev  | {d[0]} / {d[1]} | {d[2]} / {d[3]} |
| test | {t[0]} / {t[1]} | {t[2]} / {t[3]} |

Test split: {test_n} Genius "samples" links from {len(TEST_SEEDS)} seed songs, {len(test_pos)} had both previews on iTunes.
A miss can mean the matcher failed **or** the sampled part is outside one of the two 30 s previews;
this eval cannot tell which. Match time per pair (fingerprints cached): median {np.median(times):.2f}s, max {max(times):.2f}s.

## Test split, real pairs

{table(test_pos)}

## Test split, unrelated pairs (highest 10)

{table(sorted(test_neg, key=lambda r: -r[2].score)[:10])}

## Dev split, real pairs

{table(dev_pos)}
"""
    OUT.write_text(report)
    print(report)
