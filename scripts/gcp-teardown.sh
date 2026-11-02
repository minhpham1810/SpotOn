#!/usr/bin/env bash
# Destroys everything Terraform created, then lists anything billable that survived.
# Nuclear option if this ever fails: gcloud projects delete <project-id>
set -euo pipefail
cd "$(dirname "$0")/../infra/terraform"

project=$(terraform output -json github_variables | python3 -c 'import sys,json; print(json.load(sys.stdin)["GCP_PROJECT_ID"])')
terraform destroy

echo
echo "Leftover check for $project (each list should be empty):"
status=0
check() {
  local label=$1; shift
  local out
  out=$("$@" 2>/dev/null || true)
  if [ -n "$out" ]; then echo "  $label: $out"; status=1; else echo "  $label: none"; fi
}
check "Cloud Run services" gcloud run services list --project "$project" --format='value(metadata.name)'
check "Artifact Registry repos" gcloud artifacts repositories list --project "$project" --format='value(name)'
check "Secrets" gcloud secrets list --project "$project" --format='value(name)'
check "Service accounts" gcloud iam service-accounts list --project "$project" --filter='email~^spoton-' --format='value(email)'
# Deleted workload identity pools stay soft-deleted (free) for 30 days.
exit $status
