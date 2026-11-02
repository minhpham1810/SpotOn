#!/usr/bin/env bash
# Boots an image the way production runs it and checks the basics.
# Usage: scripts/smoke-test.sh <image>   (same script locally and in CI)
set -euo pipefail

IMAGE="${1:?usage: scripts/smoke-test.sh <image>}"
NAME="spoton-smoke-$$"
PORT="${SMOKE_PORT:-18080}"

cleanup() {
  status=$?
  if [ "$status" -ne 0 ]; then
    echo "--- container logs"
    docker logs "$NAME" 2>&1 | tail -30 || true
  fi
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  exit "$status"
}
trap cleanup EXIT

fail() { echo "FAIL: $*" >&2; exit 1; }

# No secrets: the app must still boot, serve, and stay healthy without them.
docker run -d --name "$NAME" --read-only -p "127.0.0.1:${PORT}:8080" "$IMAGE" >/dev/null

echo "waiting for the image's own HEALTHCHECK to report healthy"
for _ in $(seq 1 30); do
  health=$(docker inspect --format '{{.State.Health.Status}}' "$NAME")
  [ "$health" = healthy ] && break
  [ "$(docker inspect --format '{{.State.Running}}' "$NAME")" = true ] || fail "container exited"
  sleep 1
done
[ "$health" = healthy ] || fail "health is '$health' after 30s"

user=$(docker exec "$NAME" id -u)
[ "$user" != 0 ] || fail "container runs as root"

code() { curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}$1"; }
[ "$(code /healthz)" = 200 ] || fail "/healthz"
[ "$(code /)" = 200 ] || fail "/ (frontend)"
[ "$(code /song/some-id)" = 200 ] || fail "SPA fallback"
[ "$(code /assets/does-not-exist.js)" = 404 ] || fail "missing asset should 404"
[ "$(code '/api/research-song')" = 400 ] || fail "API input validation"

start=$(date +%s)
docker stop "$NAME" >/dev/null
[ $(( $(date +%s) - start )) -lt 5 ] || fail "SIGTERM not handled (stop took >= 5s)"

echo "PASS: healthy, uid $user, read-only rootfs, routes ok, graceful stop"
