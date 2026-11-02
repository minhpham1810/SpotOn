#!/usr/bin/env bash
# Boots the matcher image the way compose runs it (read-only, no capabilities) and checks the basics.
# No network calls are needed: readiness may still be loading, so only the contract is checked.
# Usage: scripts/smoke-test-matcher.sh <image>   (same script locally and in CI)
set -euo pipefail

IMAGE="${1:?usage: scripts/smoke-test-matcher.sh <image>}"
NAME="matcher-smoke-$$"
PORT="${SMOKE_PORT:-18001}"

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

docker run -d --name "$NAME" --read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges:true \
  -p "127.0.0.1:${PORT}:8000" "$IMAGE" >/dev/null

echo "waiting for the image's own HEALTHCHECK to report healthy"
for _ in $(seq 1 60); do
  health=$(docker inspect --format '{{.State.Health.Status}}' "$NAME")
  [ "$health" = healthy ] && break
  [ "$(docker inspect --format '{{.State.Running}}' "$NAME")" = true ] || fail "container exited"
  sleep 1
done
[ "$health" = healthy ] || fail "health is '$health' after 60s"

user=$(docker exec "$NAME" id -u)
[ "$user" != 0 ] || fail "container runs as root"
docker exec "$NAME" sh -c 'command -v pip' >/dev/null && fail "pip is in the runtime image"

url="http://127.0.0.1:${PORT}"
post() { curl -s -o /dev/null -w '%{http_code}' -X POST "$url/match" -H 'Content-Type: application/json' -d "$1"; }
[ "$(curl -s -o /dev/null -w '%{http_code}' "$url/healthz")" = 200 ] || fail "/healthz"
ready=$(curl -s -o /dev/null -w '%{http_code}' "$url/readyz")
[ "$ready" = 200 ] || [ "$ready" = 503 ] || fail "/readyz returned $ready"
[ "$(post '{"child_url":"https://169.254.169.254/x","parent_url":"https://audio-ssl.itunes.apple.com/b.m4a"}')" = 400 ] \
  || fail "metadata-server URL was not refused"
[ "$(post 'not json')" = 400 ] || fail "bad JSON was not refused"

start=$(date +%s)
docker stop "$NAME" >/dev/null
[ $(( $(date +%s) - start )) -lt 5 ] || fail "SIGTERM not handled (stop took >= 5s)"

echo "PASS: healthy, uid $user, no pip, read-only rootfs, input refused, graceful stop (readyz $ready)"
