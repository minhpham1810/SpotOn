#!/usr/bin/env bash
# Rolls IMAGE out to the Cloud Run service, smoke-tests the new revision through its public URL,
# and sends all traffic back to the previously serving revision if the test fails.
# Used by CI (.github/workflows/container.yml) and by the rollback drill, so the drill tests this exact code.
#   PROJECT=... REGION=... IMAGE=...@sha256:... scripts/cloud-run-deploy.sh [extra `gcloud run services update` flags]
# Exit: 0 deployed, 0 service absent (demo-only), 1 smoke test failed and rolled back.
set -euo pipefail
: "${PROJECT:?}" "${REGION:?}" "${IMAGE:?}"
run() { gcloud run services "$@" --project "$PROJECT" --region "$REGION"; }
# Cloud Run rejects a change while the previous one is still being applied (409 ABORTED, seen in the
# rollback drill right after a rollback), so wait for Ready=True and retry the change a few times.
settle() {
  for _ in $(seq 1 45); do
    [ "$(run describe spoton --format='value(status.conditions[0].status)')" = True ] && return 0
    sleep 2
  done
  echo "service did not become Ready" >&2
  return 1
}
retry() {
  for attempt in 1 2 3 4; do
    settle && "$@" && return 0
    echo "attempt $attempt failed: $*" >&2
    sleep 5
  done
  return 1
}

# The service only exists during demos (scripts/demo-up.sh); otherwise the image just waits in the registry.
if ! url=$(run describe spoton --format='value(status.url)' 2>/dev/null); then
  echo "::notice::Cloud Run service is down (demo-only); image pushed, nothing to deploy."
  exit 0
fi

# Roll back to what is serving now, which after an earlier rollback is not the newest revision.
previous=$(run describe spoton --format='value(status.traffic[0].revisionName)')
[ -n "$previous" ] || previous=$(run describe spoton --format='value(status.latestReadyRevisionName)')
echo "Serving before deploy: $previous"

# --command/--args reset any override (the drill sets one) unless the caller passes its own.
retry run update spoton --image "$IMAGE" --command= --args= "$@" --quiet
# After a rollback, traffic is pinned to a named revision; without this the smoke test would test the old one.
retry run update-traffic spoton --to-latest --quiet
settle
new=$(run describe spoton --format='value(status.latestReadyRevisionName)')

ok=true
# Body check, not just status: an image without the /health route answers 200 via the SPA fallback.
[ "$(curl -s --max-time 15 "$url/health")" = ok ] || { echo "smoke: /health is not 'ok'"; ok=false; }
[ "$(curl -s -o /dev/null --max-time 15 -w '%{http_code}' "$url/")" = 200 ] || { echo "smoke: / is not 200"; ok=false; }
[ "$(curl -s -o /dev/null --max-time 15 -w '%{http_code}' "$url/api/research-song")" = 400 ] || { echo "smoke: API validation is not 400"; ok=false; }

if [ "$ok" != true ]; then
  echo "::error::Smoke test failed on $new; sending all traffic back to $previous"
  retry run update-traffic spoton --to-revisions "$previous=100" --quiet
  exit 1
fi
echo "Deployed $IMAGE as $new to $url"
