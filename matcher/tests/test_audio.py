import io

import numpy as np
import pytest
import soundfile as sf

from samplematch import audio
from samplematch.fingerprint import SR

GOOD = "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/f2/x.plus.aac.p.m4a"


@pytest.mark.parametrize("url", [
    "http://audio-ssl.itunes.apple.com/x.m4a",                 # not https
    "https://audio-ssl.itunes.apple.com.evil.com/x.m4a",       # lookalike host
    "https://evil.com/?h=audio-ssl.itunes.apple.com",
    "https://user@audio-ssl.itunes.apple.com/x.m4a",           # credentials trick
    "https://audio-ssl.itunes.apple.com:8443/x.m4a",           # other port
    "https://169.254.169.254/computeMetadata/v1/",             # cloud metadata
    "file:///etc/passwd",
    None, 42, "https://audio-ssl.itunes.apple.com/" + "a" * 3000,
])
def test_only_itunes_preview_urls_are_accepted(url):
    assert not audio.is_preview_url(url)
    if isinstance(url, str):
        with pytest.raises(audio.AudioError):
            audio.fetch(url)                # refused before any network call


def test_real_preview_url_shape_is_accepted():
    assert audio.is_preview_url(GOOD)


def test_redirects_are_refused():
    with pytest.raises(audio.AudioError):
        audio._NoRedirect().redirect_request(None, None, 302, "Found", {}, "https://evil.com/")


def test_decode_resamples_to_mono_at_sr():
    t = np.arange(SR * 2 * 4) / (SR * 2)                      # 4 s stereo at 44.1 kHz
    stereo = np.stack([np.sin(2 * np.pi * 440 * t)] * 2, axis=1)
    buf = io.BytesIO()
    sf.write(buf, stereo, SR * 2, format="WAV")
    y = audio.decode(buf.getvalue())
    assert y.dtype == np.float32 and abs(len(y) - 4 * SR) < SR * 0.05


def test_decode_rejects_garbage_and_short_clips():
    with pytest.raises(audio.AudioError):
        audio.decode(b"not audio at all")
    buf = io.BytesIO()
    sf.write(buf, np.zeros(SR), SR, format="WAV")          # 1 s
    with pytest.raises(audio.AudioError):
        audio.decode(buf.getvalue())


@pytest.mark.parametrize("text,key", [
    ("Harder, Better, Faster, Stronger", "harderbetterfasterstronger"),
    ("Stronger - Remastered 2011", "stronger"),
    ("Gold Digger (feat. Jamie Foxx)", "golddigger"),
    ("Beyoncé", "beyonce"),
])
def test_title_key_matches_the_frontend_rules(text, key):
    assert audio._key(text) == key
