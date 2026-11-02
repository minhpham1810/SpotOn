# Load tests

Repeatable, local and free: the LLM is replaced by `mock-llm.mjs` (an OpenAI-compatible stub that answers after `MOCK_DELAY_MS`), so no Gemini, Tavily or Genius quota is used. The app container is sized like the Cloud Run service.

```
docker compose -f compose.yaml -f loadtest/compose.load.yaml up -d --build
k6 run -e VUS=50 -e DURATION=30s loadtest/cached.js       # cached reports
k6 run -e STREAMS=200 loadtest/fresh.js                     # concurrent fresh SSE streams
docker compose -f compose.yaml -f loadtest/compose.load.yaml exec -T app sh -c 'cat /sys/fs/cgroup/memory.peak'
docker compose -f compose.yaml -f loadtest/compose.load.yaml down
```

## Conditions (2026-11-01)

- Host: Apple M5 Pro, 24 GB; Colima VM 2 vCPU / 4 GiB; Docker 29.5.2; k6 v2.3.0; k6 runs on the host through Colima's port forward.
- App container: `cpus: 1`, `mem_limit: 512m` (cgroup `cpu.max 100000 100000`, `memory.max` 512 MiB), Node 24, local Redis 7.4 behind serverless-redis-http 0.0.10.
- Mock LLM delay 3000 ms, no tool calls; rate limits raised to 1,000,000 for the test; Spotify credentials blank (the audio-features call fails fast into the estimate path).
- Not representative of: real LLM latency, Upstash network latency, Cloud Run cold starts, or anything multi-instance.

## Results

| Scenario | Requests | Throughput | Median | p95 | Errors | App memory peak |
|---|---|---|---|---|---|---|
| Cached, 50 VUs × 30 s, **Redis per request** | 54,864 | 1,657 req/s | 26 ms | 40 ms | 0 | 64 MiB |
| Cached, 50 VUs × 30 s, **with in-process cache** | 545,622 | 18,172 req/s | 2.6 ms | 4.5 ms | 0 | 44 MiB |
| Fresh, 50 concurrent streams × 3 | 150 | 15 reports/s | 3.09 s | 3.51 s | 0 | 55 MiB |
| Fresh, 200 concurrent streams × 3 | 600 | 59 reports/s | 3.11 s | 3.95 s | 0 | 68 MiB |

Redis commands in the second cached run: `get=1` for 545,622 requests (from `INFO commandstats` after `CONFIG RESETSTAT`).

## What the numbers changed

1. **Cache hits were an unpriced cost.** One Redis command per cached request at ~1,650 req/s would spend Upstash's 500k free monthly commands in about 5 minutes, then $0.20/100k (~$290/day sustained). The rate limiter intentionally ignores cache hits. Fix: a per-instance memory cache (10-minute TTL, 200 reports) in `api/_lib/cache.ts`.
2. **Cloud Run concurrency 20 → 80** and **memory 512 Mi → 256 Mi**: one vCPU held 200 concurrent streams with no errors and a 68 MiB peak. The streams wait on I/O, so packing more per instance means fewer instances.
3. **kind memory request 96 Mi → 64 Mi.**

The fresh-stream overhead above the 3 s mock delay grew from ~0.1 s (median) to ~0.95 s (p95) at 200 streams: that is where one vCPU starts to queue.
