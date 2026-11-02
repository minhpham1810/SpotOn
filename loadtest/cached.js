// Cached-report throughput: every request is a Redis GET plus one SSE event.
// k6 run -e VUS=50 -e DURATION=30s loadtest/cached.js
import http from 'k6/http';
import { check } from 'k6';

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:8080';
const URL = `${BASE}/api/research-song?trackId=loadtest-cached&name=Clair%20de%20Lune&artist=Claude%20Debussy`;

export const options = {
  vus: Number(__ENV.VUS || 50),
  duration: __ENV.DURATION || '30s',
  thresholds: { http_req_failed: ['rate<0.01'] },
};

export function setup() {
  // Warm the cache with one fresh (mocked) run.
  const r = http.get(URL, { timeout: '60s' });
  if (!String(r.body).includes('event: report')) throw new Error('warm-up did not produce a report');
}

export default function () {
  const r = http.get(URL);
  check(r, { 'served a report': (res) => res.status === 200 && String(res.body).includes('event: report') });
}
