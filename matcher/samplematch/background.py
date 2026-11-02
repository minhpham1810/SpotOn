"""Unrelated songs used to normalize match scores (see fingerprint.s_norm).

Only fingerprints are kept, in memory; no audio is stored. The list spans genres and leans on drum-heavy
hip-hop and pop, because sparse repetitive drums are what make unrelated songs look alike.
It must stay disjoint from the eval songs (matcher/eval/run_eval.py checks this).
"""
from __future__ import annotations

import logging
import threading
from concurrent.futures import ThreadPoolExecutor

from .audio import AudioError, itunes_lookup, preview_fingerprint
from .fingerprint import Fingerprint

# (iTunes track id, artist, title). Ids, not searches: iTunes search allows ~20 calls/min per IP, and
# one /lookup call fetches all of these.
SONGS = [
    (202272624, "Fleetwood Mac", "Dreams"),
    (1097861836, "Radiohead", "Karma Police"),
    (1440933651, "Taylor Swift", "Shake It Off"),
    (1572051818, "Metallica", "Enter Sandman"),
    (1469575900, "Bob Marley & The Wailers", "Three Little Birds"),
    (268443097, "Miles Davis", "So What"),
    (1450695739, "Billie Eilish", "bad guy"),
    (1440882165, "Kendrick Lamar", "HUMBLE."),
    (1536682928, "Outkast", "Ms. Jackson"),
    (1440783625, "Nirvana", "Smells Like Teen Spirit"),
    (1544491233, "Adele", "Rolling in the Deep"),
    (1440808985, "Stevie Wonder", "Superstition"),
    (1542842761, "The Weeknd", "Blinding Lights"),
    (1440903439, "Eminem", "Lose Yourself"),
    (1444156738, "Dr. Dre", "Still D.R.E."),
    (1122776156, "Coldplay", "Clocks"),
    (1422677781, "Amy Winehouse", "Rehab"),
    (1452875626, "Johnny Cash", "Hurt"),
    (1657869393, "SZA", "Kill Bill"),
    (1421658123, "Travis Scott", "SICKO MODE"),
    (1477880561, "Post Malone", "Circles"),
    (83134409, "Missy Elliott", "Get Ur Freak On"),
]
MIN_LOADED = 12

log = logging.getLogger(__name__)


class Background:
    def __init__(self) -> None:
        self.items: list[tuple[str, Fingerprint]] = []      # (preview url, fingerprint)
        self.ready = threading.Event()

    def load(self) -> None:
        try:
            urls = itunes_lookup([track_id for track_id, *_ in SONGS])
        except AudioError as e:
            log.error("background lookup failed: %s", e)
            return

        def one(url: str):
            try:
                return url, preview_fingerprint(url)
            except AudioError as e:
                log.warning("background preview failed: %s", e)
                return None
        with ThreadPoolExecutor(max_workers=6) as pool:
            self.items = [x for x in pool.map(one, urls.values()) if x]
        log.info("background loaded: %d of %d songs", len(self.items), len(SONGS))
        if len(self.items) >= MIN_LOADED:
            self.ready.set()

    def excluding(self, *urls: str) -> list[Fingerprint]:
        return [fp for url, fp in self.items if url not in urls]
