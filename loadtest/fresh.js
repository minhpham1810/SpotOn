// Concurrent fresh reports: each VU holds one SSE stream open for the mock LLM delay.
// Unique trackIds so nothing is served from cache.
// k6 run -e STREAMS=50 loadtest/fresh.js
import http from 'k6/http';
import { check } from 'k6';
import exec from 'k6/execution';

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:8080';
const STREAMS = Number(__ENV.STREAMS || 50);

export const options = {
  scenarios: {
    streams: { executor: 'per-vu-iterations', vus: STREAMS, iterations: 3, maxDuration: '3m' },
  },
  thresholds: { http_req_failed: ['rate<0.01'] },
};

export default function () {
  const id = `loadtest-fresh-${__ENV.RUN || Date.now()}-${exec.vu.idInTest}-${exec.vu.iterationInScenario}`;
  const r = http.get(`${BASE}/api/research-song?trackId=${id}&name=Song&artist=Artist`, { timeout: '120s' });
  check(r, { 'streamed a report': (res) => res.status === 200 && String(res.body).includes('event: report') });
}
