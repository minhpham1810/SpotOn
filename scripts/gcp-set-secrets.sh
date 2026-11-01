#!/usr/bin/env bash
# Adds a new version of each SpotOn secret, then destroys older versions.
# Values are typed with hidden input: never echoed, never written to disk, never in Terraform state.
# Destroying (not disabling) old versions matters: disabled versions are still billed.
# Usage: scripts/gcp-set-secrets.sh <project-id> [secret-name ...]   (default: all five)
set -euo pipefail

PROJECT="${1:?usage: scripts/gcp-set-secrets.sh <project-id> [secret-name ...]}"
shift
SECRETS=("$@")
[ ${#SECRETS[@]} -gt 0 ] || SECRETS=(llm-api-key tavily-api-key genius-access-token spotify-client-secret upstash-redis-rest-token)

for name in "${SECRETS[@]}"; do
  read -rsp "Value for ${name} (blank = skip): " value
  echo
  [ -n "$value" ] || { echo "  skipped"; continue; }

  printf '%s' "$value" | gcloud secrets versions add "$name" --project "$PROJECT" --data-file=- --quiet >/dev/null
  unset value

  # Keep only the newest version.
  gcloud secrets versions list "$name" --project "$PROJECT" --filter='state!=DESTROYED' \
    --sort-by='~createTime' --format='value(name)' | tail -n +2 | while read -r old; do
    gcloud secrets versions destroy "$old" --secret "$name" --project "$PROJECT" --quiet >/dev/null
    echo "  destroyed old version $old"
  done
  echo "  ${name}: new version added"
done
