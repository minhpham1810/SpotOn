#!/usr/bin/env bash
# Local Kubernetes for SpotOn: kind cluster, image built and loaded, config + secrets
# generated from .env (never committed), workloads applied, rollout awaited.
# Then: kubectl -n spoton port-forward svc/spoton 8080:80   ->  http://127.0.0.1:8080
# Tear down: kind delete cluster --name spoton
set -euo pipefail
cd "$(dirname "$0")/.."

CLUSTER=spoton
env_value() { grep -E "^$1=" .env 2>/dev/null | tail -n 1 | cut -d= -f2- | sed -e 's/^"\(.*\)"$/\1/' || true; }

kind get clusters | grep -qx "$CLUSTER" || kind create cluster --name "$CLUSTER" --wait 120s

docker build -t spoton:local --build-arg "VITE_SPOTIFY_CLIENT_ID=$(env_value VITE_SPOTIFY_CLIENT_ID)" .
kind load docker-image spoton:local --name "$CLUSTER"

kubectl create namespace spoton --dry-run=client -o yaml | kubectl apply -f -

# Non-secret settings. The cache points at the in-cluster Redis, never the real Upstash.
kubectl -n spoton create configmap spoton-config \
  --from-literal=UPSTASH_REDIS_REST_URL=http://redis-http \
  --from-literal=TRUSTED_PROXY_HOPS=0 \
  --from-literal=SPOTIFY_CLIENT_ID="$(env_value SPOTIFY_CLIENT_ID)" \
  --dry-run=client -o yaml | kubectl apply -f -

# Secrets go straight from .env into the cluster; values never touch disk or stdout.
kubectl -n spoton create secret generic spoton-secrets \
  --from-literal=LLM_API_KEY="$(env_value LLM_API_KEY)" \
  --from-literal=TAVILY_API_KEY="$(env_value TAVILY_API_KEY)" \
  --from-literal=GENIUS_ACCESS_TOKEN="$(env_value GENIUS_ACCESS_TOKEN)" \
  --from-literal=SPOTIFY_CLIENT_SECRET="$(env_value SPOTIFY_CLIENT_SECRET)" \
  --from-literal=UPSTASH_REDIS_REST_TOKEN=local-dev-token \
  --dry-run=client -o yaml | kubectl apply -f - >/dev/null
echo "secret/spoton-secrets configured"

kubectl apply -f k8s/
kubectl -n spoton rollout restart deployment/spoton >/dev/null # pick up a rebuilt spoton:local
kubectl -n spoton rollout status deployment/redis-http --timeout=120s
kubectl -n spoton rollout status deployment/spoton --timeout=120s
kubectl -n spoton get pods -o wide
