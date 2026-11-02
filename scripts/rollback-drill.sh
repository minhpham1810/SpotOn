#!/usr/bin/env bash
# Proves the automatic rollback: deploys a release that passes Cloud Run's internal startup probe
# (/healthz) but answers 500 to everything public, through the same scripts/cloud-run-deploy.sh CI uses.
# Expects: the deploy script exits 1, traffic returns to the previous revision, the site keeps working.
# Then redeploys the good image so no command override is left behind.
# (gcloud splits --args on commas; ^@^ switches the delimiter because the stub contains one.)
#   PROJECT=... REGION=... IMAGE=<good image digest> scripts/rollback-drill.sh
set -euo pipefail
: "${PROJECT:?}" "${REGION:?}" "${IMAGE:?}"
here=$(dirname "$0")
run() { gcloud run services "$@" --project "$PROJECT" --region "$REGION"; }

url=$(run describe spoton --format='value(status.url)')
before=$(run describe spoton --format='value(status.traffic[0].revisionName)')
[ -n "$before" ] || before=$(run describe spoton --format='value(status.latestReadyRevisionName)')
echo "== serving before drill: $before"

broken='require("http").createServer((q,s)=>{s.statusCode=q.url==="/healthz"?200:500;s.end(q.url==="/healthz"?"ok":"broken")}).listen(process.env.PORT||8080)'
start=$(date +%s)
if "$here/cloud-run-deploy.sh" --command=node --args="^@^-e@$broken"; then
  echo "DRILL FAILED: the broken release was accepted" >&2
  exit 1
fi
echo "== deploy script refused the broken release after $(( $(date +%s) - start ))s"

serving=$(run describe spoton --format='value(status.traffic[0].revisionName)')
body=$(curl -s --max-time 15 "$url/health")
echo "== serving after rollback: $serving, /health -> $body"
[ "$serving" = "$before" ] && [ "$body" = ok ] || { echo "DRILL FAILED: traffic did not return to $before" >&2; exit 1; }

echo "== clean up: redeploy the good image without the override"
"$here/cloud-run-deploy.sh"
echo "DRILL PASSED"
