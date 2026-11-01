#!/usr/bin/env bash
# Deletes the Cloud Run service; keeps the free-tier foundation (registry, secrets, OIDC, budget).
set -euo pipefail
cd "$(dirname "$0")/../infra/terraform"

project=$(terraform output -json github_variables | python3 -c 'import sys,json; print(json.load(sys.stdin)["GCP_PROJECT_ID"])')
terraform apply -var service_enabled=false

left=$(gcloud run services list --project "$project" --format='value(metadata.name)')
[ -z "$left" ] || { echo "Cloud Run services still present: $left" >&2; exit 1; }
echo "Cloud Run service removed. No compute can be billed."
