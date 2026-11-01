#!/usr/bin/env bash
# Adds a new version of each SpotOn secret, then destroys older versions.
# Values never echo and never enter Terraform state. Destroying (not disabling) old
# versions matters: disabled versions are still billed.
#
#   scripts/gcp-set-secrets.sh <project-id>                    # hidden prompts (needs a real terminal)
#   scripts/gcp-set-secrets.sh <project-id> --from-env .env    # read from a gitignored dotenv file
set -euo pipefail

PROJECT="${1:?usage: scripts/gcp-set-secrets.sh <project-id> [--from-env <file>]}"
ENV_FILE=""
if [ "${2:-}" = "--from-env" ]; then
  ENV_FILE="${3:?--from-env needs a file}"
  [ -f "$ENV_FILE" ] || { echo "No such file: $ENV_FILE" >&2; exit 1; }
elif [ ! -t 0 ]; then
  echo "No terminal to prompt on (e.g. Claude Code's ! runner). Put the values in .env and run:" >&2
  echo "  scripts/gcp-set-secrets.sh $PROJECT --from-env .env" >&2
  exit 1
fi

# env var name in .env -> Secret Manager secret
PAIRS="LLM_API_KEY:llm-api-key TAVILY_API_KEY:tavily-api-key GENIUS_ACCESS_TOKEN:genius-access-token SPOTIFY_CLIENT_SECRET:spotify-client-secret UPSTASH_REDIS_REST_TOKEN:upstash-redis-rest-token"

for pair in $PAIRS; do
  var=${pair%%:*}
  name=${pair#*:}

  if [ -n "$ENV_FILE" ]; then
    # Last assignment wins, like dotenv; strip optional surrounding quotes.
    value=$(grep -E "^${var}=" "$ENV_FILE" | tail -n 1 | cut -d= -f2- | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/")
  else
    read -rsp "Value for ${var} (blank = skip): " value
    echo
  fi
  [ -n "$value" ] || { echo "${var}: skipped (no value)"; continue; }

  printf '%s' "$value" | gcloud secrets versions add "$name" --project "$PROJECT" --data-file=- --quiet >/dev/null
  unset value

  # Keep only the newest version.
  gcloud secrets versions list "$name" --project "$PROJECT" --filter='state!=destroyed' \
    --sort-by='~createTime' --format='value(name)' | tail -n +2 | while read -r old; do
    gcloud secrets versions destroy "$old" --secret "$name" --project "$PROJECT" --quiet >/dev/null
    echo "  ${name}: destroyed old version $old"
  done
  echo "${var}: new version added to ${name}"
done
