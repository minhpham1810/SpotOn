#!/usr/bin/env bash
# Creates the Cloud Run service from the newest image in Artifact Registry, then smoke-checks it.
# Pair with scripts/demo-down.sh when the demo is over.
set -euo pipefail
cd "$(dirname "$0")/../infra/terraform"

repo=$(terraform output -raw image_repository)
project=$(terraform output -json github_variables | python3 -c 'import sys,json; print(json.load(sys.stdin)["GCP_PROJECT_ID"])')

# Only tagged entries are deployable: each CI push also stores untagged children
# (the platform manifest and its provenance/SBOM attestation) under the same repo.
digest=$(gcloud artifacts docker images list "$repo" --project "$project" --include-tags \
  --filter='tags:sha-*' --sort-by='~CREATE_TIME' --limit=1 --format='value(version)')
[ -n "$digest" ] || { echo "No image in $repo yet: merge to master (CI pushes) first." >&2; exit 1; }
image="$repo@$digest"
echo "Deploying $image"

terraform apply -var service_enabled=true -var "image=$image"

url=$(terraform output -raw service_url)
for _ in $(seq 1 20); do
  [ "$(curl -s -o /dev/null -w '%{http_code}' "$url/health")" = 200 ] && break
  sleep 3
done
curl -sf "$url/health" >/dev/null || { echo "Service is up but /health is not 200" >&2; exit 1; }

echo
echo "Live at $url"
echo "Spotify login needs $url/callback registered in the Spotify dashboard."
echo "When done: scripts/demo-down.sh"
