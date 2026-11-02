"""Fetch and decode iTunes previews. The URL comes from the public API, so only Apple's preview host is
fetched, redirects are refused, and size and time are capped."""
from __future__ import annotations

import functools
import io
import json
import re
import unicodedata
import urllib.parse
import urllib.request

import av
import numpy as np

from .fingerprint import SR, Fingerprint, fingerprint

PREVIEW_HOST = "audio-ssl.itunes.apple.com"
MAX_BYTES = 4 * 1024 * 1024        # previews are ~0.5-1 MB
TIMEOUT_S = 10
MAX_SECONDS = 35


class AudioError(Exception):
    """The preview could not be fetched or decoded."""


def is_preview_url(url: object) -> bool:
    if not isinstance(url, str) or len(url) > 2048:
        return False
    parts = urllib.parse.urlsplit(url)
    return parts.scheme == "https" and parts.hostname == PREVIEW_HOST and parts.port is None and not parts.username


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):  # noqa: D401 - urllib hook
        raise AudioError("preview host redirected; refusing to follow")


_opener = urllib.request.build_opener(_NoRedirect)


def fetch(url: str) -> bytes:
    if not is_preview_url(url):
        raise AudioError("not an iTunes preview URL")
    try:
        with _opener.open(urllib.request.Request(url, headers={"User-Agent": "spoton-matcher"}), timeout=TIMEOUT_S) as r:
            body = r.read(MAX_BYTES + 1)
    except AudioError:
        raise
    except Exception as e:  # network errors, HTTP errors
        raise AudioError(f"fetch failed: {type(e).__name__}") from e
    if len(body) > MAX_BYTES:
        raise AudioError("preview too large")
    return body


def decode(data: bytes) -> np.ndarray:
    """Any container FFmpeg reads (via PyAV's bundled build) -> mono float32 at SR, first MAX_SECONDS only."""
    chunks: list[np.ndarray] = []
    total = 0
    try:
        with av.open(io.BytesIO(data)) as container:
            resampler = av.AudioResampler(format="flt", layout="mono", rate=SR)
            for frame in container.decode(container.streams.audio[0]):
                for out in resampler.resample(frame):
                    chunks.append(out.to_ndarray().reshape(-1))
                    total += chunks[-1].size
                if total >= MAX_SECONDS * SR:
                    break
            chunks.extend(out.to_ndarray().reshape(-1) for out in resampler.resample(None))
    except Exception as e:  # untrusted bytes: any decoder failure is a bad preview
        raise AudioError(f"decode failed: {type(e).__name__}") from e
    y = np.concatenate(chunks)[: MAX_SECONDS * SR] if chunks else np.zeros(0, np.float32)
    if y.size < SR * 3:
        raise AudioError("preview shorter than 3 s")
    return y.astype(np.float32, copy=False)


# A fingerprint is ~10 MiB as Python tuples (measured, ~32k triplets), so 32 entries is ~320 MiB on top of the
# ~220 MiB background set. A tree has at most 9 songs.
# shortcut: tuples are memory-hungry; pack hashes into numpy arrays if the cache needs to grow.
@functools.lru_cache(maxsize=32)
def preview_fingerprint(url: str) -> Fingerprint:
    """Fingerprints are reused across a sample tree (one parent, many children), so cache them."""
    return fingerprint(decode(fetch(url)))


def itunes_preview_url(artist: str, title: str) -> str | None:
    """None when iTunes has no matching song; AudioError when the search itself fails. First iTunes song result whose title and artist match. Mirrors findSnippetUrl in src/lib/itunesPreview.ts."""
    term = urllib.parse.quote(f"{artist} {title}")
    url = f"https://itunes.apple.com/search?media=music&entity=song&limit=10&term={term}"
    try:
        with urllib.request.urlopen(url, timeout=TIMEOUT_S) as r:
            results = json.load(r).get("results", [])
    except Exception as e:
        raise AudioError(f"iTunes search failed: {type(e).__name__}") from e
    want_artist, want_title = _key(artist), _key(title)
    for res in results:
        got_artist = _key(res.get("artistName", ""))
        if (res.get("previewUrl") and _key(res.get("trackName", "")) == want_title and got_artist
                and (want_artist in got_artist or got_artist in want_artist)):
            return res["previewUrl"]
    return None


def itunes_lookup(track_ids: list[int]) -> dict[int, str]:
    """Preview URLs for iTunes track ids, in one request. Tracks without a preview are left out."""
    url = "https://itunes.apple.com/lookup?id=" + ",".join(str(int(i)) for i in track_ids)
    try:
        with urllib.request.urlopen(url, timeout=TIMEOUT_S) as r:
            results = json.load(r).get("results", [])
    except Exception as e:
        raise AudioError(f"iTunes lookup failed: {type(e).__name__}") from e
    return {r["trackId"]: r["previewUrl"] for r in results if is_preview_url(r.get("previewUrl"))}


def _key(text: str) -> str:
    base = re.split(r" [-(\[]", text.lower())[0]
    return re.sub(r"[^\w]+|_", "", unicodedata.normalize("NFKD", base))
