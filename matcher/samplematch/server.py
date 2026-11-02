"""HTTP API for the sample matcher. Private: only the SpotOn app calls it.

  GET  /healthz  liveness
  GET  /readyz   200 once the background set is loaded
  POST /match    {"child_url": ..., "parent_url": ...} -> Match JSON
"""
from __future__ import annotations

import json
import logging
import os
import signal
import threading
import time
from dataclasses import asdict
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from .audio import AudioError, is_preview_url, preview_fingerprint
from .background import Background
from .fingerprint import match

VERSION = "fp1"          # bump when scores change; the app's cache keys include it
MAX_BODY = 4096
log = logging.getLogger("matcher")


def make_handler(background: Background, matcher=match, fingerprint_url=preview_fingerprint):
    class Handler(BaseHTTPRequestHandler):
        server_version = "spoton-matcher"
        sys_version = ""

        def _send(self, status: int, body: dict) -> None:
            data = json.dumps(body).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def log_message(self, *_args) -> None:  # replaced by one JSON line per request
            pass

        def _log(self, status: int, started: float) -> None:
            ms = round((time.perf_counter() - started) * 1000)
            print(json.dumps({"severity": "ERROR" if status >= 500 else "WARNING" if status >= 400 else "INFO",
                              "message": f"{self.command} {self.path} {status} {ms}ms",
                              "httpRequest": {"requestMethod": self.command, "requestUrl": self.path,
                                              "status": status, "latency": f"{ms / 1000}s"},
                              "durationMs": ms}), flush=True)

        def do_GET(self) -> None:
            if self.path == "/healthz":
                self._send(200, {"status": "ok"})
            elif self.path == "/readyz":
                ready = background.ready.is_set()
                self._send(200 if ready else 503, {"ready": ready, "background": len(background.items)})
            else:
                self._send(404, {"error": "not found"})

        def do_POST(self) -> None:
            started = time.perf_counter()
            status, body = self._match()
            self._send(status, body)
            self._log(status, started)

        def _match(self) -> tuple[int, dict]:
            if self.path != "/match":
                return 404, {"error": "not found"}
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                return 400, {"error": "bad Content-Length"}
            if not 0 < length <= MAX_BODY:
                return 400, {"error": f"body must be 1-{MAX_BODY} bytes"}
            try:
                req = json.loads(self.rfile.read(length))
            except ValueError:
                return 400, {"error": "body is not JSON"}
            child, parent = (req.get("child_url"), req.get("parent_url")) if isinstance(req, dict) else (None, None)
            if not (is_preview_url(child) and is_preview_url(parent)) or child == parent:
                return 400, {"error": "child_url and parent_url must be two different iTunes preview URLs"}
            if not background.ready.is_set():
                return 503, {"error": "matcher is warming up"}
            try:
                result = matcher(fingerprint_url(child), fingerprint_url(parent), background.excluding(child, parent))
            except AudioError as e:
                return 422, {"error": f"could not read a preview: {e}"}
            except Exception:
                log.exception("match failed")
                return 500, {"error": "match failed"}
            return 200, {**asdict(result), "version": VERSION}

    return Handler


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    background = Background()

    def warm() -> None:                       # retry until iTunes answers; /match is 503 until then
        while not background.ready.is_set():
            background.load()
            background.ready.wait(30)
    threading.Thread(target=warm, daemon=True).start()
    server = ThreadingHTTPServer(("0.0.0.0", int(os.environ.get("PORT", 8000))), make_handler(background))
    signal.signal(signal.SIGTERM, lambda *_: threading.Thread(target=server.shutdown).start())
    log.info("matcher listening on :%s", server.server_address[1])
    server.serve_forever()
    server.server_close()


if __name__ == "__main__":
    main()
