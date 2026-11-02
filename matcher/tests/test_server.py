import http.client
import json
import threading
from http.server import ThreadingHTTPServer

import pytest

from samplematch import synth
from samplematch.audio import AudioError
from samplematch.background import Background
from samplematch.fingerprint import fingerprint
from samplematch.server import VERSION, make_handler

A = "https://audio-ssl.itunes.apple.com/a.m4a"
B = "https://audio-ssl.itunes.apple.com/b.m4a"
BROKEN = "https://audio-ssl.itunes.apple.com/broken.m4a"


@pytest.fixture(scope="module")
def fps():
    return {A: fingerprint(synth.song(1)), B: fingerprint(synth.song(2))}


def serve(background, fps):
    def fingerprint_url(url):
        if url == BROKEN:
            raise AudioError("decode failed")
        return fps[url]
    server = ThreadingHTTPServer(("127.0.0.1", 0), make_handler(background, fingerprint_url=fingerprint_url))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def call(server, method, path, body=None):
    conn = http.client.HTTPConnection("127.0.0.1", server.server_address[1], timeout=60)
    data = body if isinstance(body, bytes) or body is None else json.dumps(body).encode()
    conn.request(method, path, body=data, headers={"Content-Type": "application/json"})
    r = conn.getresponse()
    return r.status, json.loads(r.read())


@pytest.fixture(scope="module")
def ready_server(fps):
    bg = Background()
    bg.items = [(f"https://audio-ssl.itunes.apple.com/bg{s}.m4a", fingerprint(synth.song(s))) for s in range(100, 104)]
    bg.ready.set()
    server = serve(bg, fps)
    yield server
    server.shutdown()


def test_match_returns_the_result_and_version(ready_server):
    status, body = call(ready_server, "POST", "/match", {"child_url": A, "parent_url": B})
    assert status == 200
    assert body["version"] == VERSION
    assert set(body) >= {"found", "score", "semitones", "speed", "mode", "child_start_s", "parent_start_s"}


@pytest.mark.parametrize("payload", [
    {"child_url": A},
    {"child_url": A, "parent_url": A},
    {"child_url": A, "parent_url": "https://evil.com/x.m4a"},
    ["not", "an", "object"],
    b"{not json",
])
def test_bad_requests_are_400(ready_server, payload):
    status, _ = call(ready_server, "POST", "/match", payload)
    assert status == 400


def test_oversized_body_is_400(ready_server):
    status, _ = call(ready_server, "POST", "/match", {"child_url": A, "parent_url": B, "pad": "x" * 5000})
    assert status == 400


def test_unreadable_preview_is_422(ready_server):
    status, body = call(ready_server, "POST", "/match", {"child_url": BROKEN, "parent_url": B})
    assert status == 422 and "preview" in body["error"]


def test_health_and_readiness(ready_server, fps):
    assert call(ready_server, "GET", "/healthz")[0] == 200
    assert call(ready_server, "GET", "/readyz")[0] == 200
    cold = serve(Background(), fps)
    try:
        assert call(cold, "GET", "/readyz")[0] == 503
        assert call(cold, "POST", "/match", {"child_url": A, "parent_url": B})[0] == 503
    finally:
        cold.shutdown()
