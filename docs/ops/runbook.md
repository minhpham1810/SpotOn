# SpotOn on Cloud Run: runbook

Production stays on Vercel. Cloud Run is the environment Khoa operates end to end: Terraform-managed, deployed by GitHub Actions with short-lived credentials, and **up only for demos**.

```
GitHub Actions (master) ──OIDC──▶ Workload Identity pool ──▶ spoton-deployer SA
   │  push image (sha tag, provenance, SBOM)            │ run.developer, AR writer,
   ▼                                                    │ actAs spoton-runtime only
Artifact Registry (us-east1, keep newest 3) ──▶ Cloud Run "spoton" (min 0, max 2, 1 vCPU/512Mi)
                                                   │ runs as spoton-runtime SA
                                                   ├─▶ Secret Manager (5 secrets, accessor per secret)
                                                   └─▶ Upstash Redis (cache + rate-limit counters, shared with Vercel)
```

## Cost controls (prices checked 2026-11-01)

| Control | Why |
|---|---|
| Service exists only during demos | No public URL to flood while nobody is watching |
| `min_instance_count = 0`, `cpu_idle = true` | No idle cost; CPU billed only while serving ($0.000024/vCPU-s beyond 180k free) |
| `max_instance_count = 2` | Hard ceiling: worst case ~$125/month under a sustained flood |
| App rate limit (5/IP/hour, 15/day global, shared with Vercel via Upstash) | Caps LLM/Tavily spend per day |
| Artifact Registry cleanup: keep newest 3 | Stays under the 0.5 GB free tier ($0.10/GB-month beyond) |
| Old secret versions **destroyed**, not disabled | Disabled versions still bill ($0.06/version-month beyond 6) |
| `$5` budget, emails at 10/50/100% | Alert only. **A budget is not a spending cap.** |

## First-time setup

1. **You** (needs a card): create a GCP billing account at console.cloud.google.com.
2. `gcloud auth login` and `gcloud auth application-default login` (Terraform uses the second).
3. Project and billing link:
   ```
   gcloud projects create spoton-ops-<suffix>
   gcloud billing accounts list
   gcloud billing projects link spoton-ops-<suffix> --billing-account <ID>
   ```
   Bootstrap (once): Terraform reads the project through Cloud Resource Manager before it can enable APIs, so enable that one by hand:
   `gcloud services enable cloudresourcemanager.googleapis.com serviceusage.googleapis.com --project spoton-ops-<suffix>`
   Don't link billing to the `gen-lang-client-*` projects AI Studio creates; that can take the Gemini key off the free tier.
4. `cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars`, fill in project, billing account, Spotify client ID, Upstash URL.
5. `cd infra/terraform && terraform init && terraform apply` (foundation only; `service_enabled` defaults to false). Right after APIs are enabled, a few creates can fail with 403 "...denied (or it may not exist)": that is propagation, not permissions. Wait a minute and apply again.
6. `scripts/gcp-set-secrets.sh <project-id>` (hidden input; values never stored on disk or in state).
7. Point CI at it (values are identifiers, not credentials):
   ```
   terraform output -json github_variables   # then for each: gh variable set NAME --body VALUE
   gh variable set VITE_SPOTIFY_CLIENT_ID --body <public client id>
   ```
8. Merge to `master` once so CI pushes the first image to Artifact Registry.

## Demo

```
scripts/demo-up.sh     # newest image -> Cloud Run, waits for /healthz, prints the URL
scripts/demo-down.sh   # deletes the service, confirms none are left
```
Register `<url>/callback` in the Spotify dashboard for login to work on that URL.

While the service is up, every merge to `master` deploys automatically through `scripts/cloud-run-deploy.sh`: update by digest (clearing any command override), route traffic to the new revision, smoke-test it (`/health` body must be `ok`, `/` 200, API validation 400), and on failure send 100% of traffic back to the revision that was serving. Each change waits for the service to be Ready and retries Cloud Run's 409 conflicts. Deploys and drills share one concurrency group, so they never overlap.

## Procedures

**Manual rollback**
```
gcloud run revisions list --service spoton --region us-east1
gcloud run services update-traffic spoton --region us-east1 --to-revisions <revision>=100
```
Return to normal with `--to-latest`.

**Rotate a secret**: `scripts/gcp-set-secrets.sh <project-id> llm-api-key`, then roll a new revision so instances pick it up (`gcloud run services update spoton --region us-east1 --update-labels rotated=$(date +%s)`). The script destroys older versions.

**Logs**: `gcloud run services logs read spoton --region us-east1 --limit 50`. The server writes one JSON line per request (method, path, status, latency, `reportSource` = cache / fresh / limited / limiter-down; never the query string or client IP); `/healthz` is not logged.

**Metrics and alerts** (`infra/terraform/observability.tf`): log-based metrics `spoton/report_requests` (by source), `spoton/fresh_report_latency` (distribution), `spoton/server_errors`. Email alerts: any `limiter-down` in 5 min (Redis/Upstash unreachable, so fresh reports are 503), more than 50 `limited` in 10 min (abuse), more than 5 ERROR lines in 5 min. Free until 2027-09-01, then $0.35/month per alert; set `alerts_enabled = false` to drop them. Measured on 2026-11-02: the Redis-outage alert emailed about 3.5 minutes after the first failure and sent a recovery email about 6 minutes later. Severities: limiter-down CRITICAL, server errors ERROR, rate-limit spike WARNING.

**Full teardown**: `scripts/gcp-teardown.sh` (destroys everything, then lists leftovers; exits non-zero if any). Last resort: `gcloud projects delete <project-id>`.

## Known gotchas

- **Upstash deletes free databases after 14 days with no activity.** The original SpotOn database was found deleted on 2026-11-01 and replaced with `spoton-cache` (us-east-1). Production degrades quietly (cache misses only) on `master` before PR #2, but with the rate limiter it fails closed: every fresh report returns 503. `.github/workflows/keepalive.yml` requests one fixed cached report every 5 days (a single Redis GET), and fails loudly if production can't serve it. GitHub disables scheduled workflows after 60 days without repository activity, so re-enable it in the Actions tab if the repo goes quiet.
- **Two Spotify apps.** `SpotOn` is the browser login app (`VITE_SPOTIFY_CLIENT_ID`, redirect URIs). `SpotOn-Server` holds the server client-credentials pair (`SPOTIFY_CLIENT_ID` + `SPOTIFY_CLIENT_SECRET`). Rotate the secret on `SpotOn-Server`, then set the pair together everywhere.
- **Vercel env changes need a new deployment** before they take effect.
- **Cloud Run reserves `/healthz` on run.app URLs** (Google's front end answers 404). External checks use `/health`; container-internal probes keep `/healthz`. Careful: on an image without the `/health` route, the SPA fallback answers 200 for any path.
- **One CI push stores three registry entries**: the tagged index plus untagged children (platform manifest, provenance/SBOM attestation). Deploy only tagged digests (`scripts/demo-up.sh` filters `tags:sha-*`). Open item: the cleanup policy counts the children as versions; check it doesn't delete a kept image's children before relying on it.
- **Vercel and Cloud Run share the Upstash cache and rate-limit counters**, so one daily budget covers both.

## Key rotation log

| Date | What | Where updated |
|---|---|---|
| 2026-11-01 | Gemini (old key exposed in a chat), Tavily (new key with a 1,000-credit monthly cap and 80% email alert), Genius token, Spotify `SpotOn-Server` secret, new Upstash database + token | `.env`, Secret Manager (one active version each), Vercel (all 7 server vars) |

Old Gemini and Tavily keys still exist and must be deleted by hand once production is confirmed on the new ones.

## Drills

| Drill | How | Expect |
|---|---|---|
| Spoofed client IP | Temporarily set `RESEARCH_LIMIT_PER_IP_HOUR=1` on the service; send two fresh requests with different forged `X-Forwarded-For` values | Second gets 429: the limiter keyed on the address Google's front end appended, not the forged one |
| Bad deploy | `scripts/rollback-drill.sh` locally, or Actions → *Rollback drill* → Run workflow (from master, demo up) | A release that passes the internal probe but fails the public smoke test is refused; traffic returns to the previous revision; the good image is redeployed. Measured 2026-11-02: refused after 18 s, `/health` ok throughout. |
| Missing secret | Destroy all versions of `tavily-api-key`, roll a revision | New revision fails to start (secret `latest` unresolvable); old revision keeps serving |
| Forgotten demo | Leave it up overnight | Billing report next day; the $5 budget emails at 10% |
